#-plugin-sig:NmPf7QNDn5Sjuwo7RfqAEO82ZfcKEo+rTfF0Le7W8SkcNKBaEyzRSfW0d5Si6F5MzzxwO+wjiYr26QAF+BrH+TiIf8YZ6H7MBD0BXWQYy2zuBKhDX++c1u4mzoZh7MG7jgjRyYt1z81GhPGw81SW1XrByxBWo277ixzFBbM/akbU6Lvu1vyj1hMRccIwc4wpQbbDxUcjGFzhlPgaJ4SKI8u0T2x2rSrJUD3ZJ7peKOHvMvo0Q4r2dR3dpVJ1qwl8eb5PD33yJg2H3Lr+JjHH1OPMZFd2ZCrRbFqjpYiHRf3xioJ4VlU5g5do2vsednuQMunYupmbom+R7v861w2tcQ==
from __future__ import print_function
import re
from base64 import b64decode

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http
from ACEStream.PluginsContainer.livestreamer.plugin.api import validate
from ACEStream.PluginsContainer.livestreamer.compat import urlparse, parse_qsl
from ACEStream.PluginsContainer.livestreamer.stream import HDSStream
from ACEStream.PluginsContainer.livestreamer.stream import HLSStream


class TRT(Plugin):
    """
    Support for the live TV streams on http://www.trt.net.tr/, some streams may be geo-locked
    """
    url_re = re.compile(r"http://www.trt.net.tr/Anasayfa/canli.aspx.*")
    stream_data_re = re.compile(r'<script>eval\(dcm1\("(.*?)"\)\);')
    f4mm_re = re.compile(r'''(?P<q>["'])(?P<url>http[^"']+?.f4m)(?P=q);''')
    m3u8_re = re.compile(r'''(?P<q>["'])(?P<url>http[^"']+?.m3u8)(?P=q);''')

    @classmethod
    def can_handle_url(cls, url):
        if cls.url_re.match(url) is not None:
            args = dict(parse_qsl(urlparse(url).query))
            return args.get("y") == "tv"

    def _get_streams(self):
        args = dict(parse_qsl(urlparse(self.url).query))
        if "k" in args:
            self.logger.debug("Loading channel: {k}", **args)
            res = http.get(self.url)
            stream_data_m = self.stream_data_re.search(res.text)
            if stream_data_m:
                script_vars = b64decode(stream_data_m.group(1))
                url_m = self.m3u8_re.search(script_vars)

                hls_url = url_m and url_m.group("url")
                if hls_url:
                    for s in HLSStream.parse_variant_playlist(self.session, hls_url).items():
                        yield s

                f4m_m = self.f4mm_re.search(script_vars)
                f4m_url = f4m_m and f4m_m.group("url")
                if f4m_url:
                    for n, s in HDSStream.parse_manifest(self.session, f4m_url).items():
                        yield n, s


__plugin__ = TRT
