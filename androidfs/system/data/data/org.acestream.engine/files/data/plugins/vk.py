#-plugin-sig:ImJ13PqqpoYgzVPaYZOSvdKJcEn0AGmsz9HuTrGbPLyfJcP6+ZruBkZiyU0RkaTI5YWFqO2D7WUdNr3XTPxZ6bclFwbAggHA5i4N+bfz3mCpbas6VhyQfuw7CO92yMejs4ahwFuGox5L7vvjBneaQGVJRPNKyBDVth4DmhePNLZxr/OucPd4hKSfsEceUySCYhhcjLBwduNL6CsVV6RLGNIFGxV9Enmhc7k1hbattzDEl7OLeg8WoFg4dbavyvQrj61llHrbJB7Zf2i41gTv9N6eMOxdUGwgLJmHeLIqgpJ3j+fBW+SOAW9oZv00aAQ4xn2PJnonlweoQLxsPgab7Q==
import re

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin, PluginError
from ACEStream.PluginsContainer.livestreamer.plugin.api import http
from ACEStream.PluginsContainer.livestreamer.stream import HTTPStream, HLSStream

_url_re = re.compile(r"http(s)?:\/\/(?:www\.)?(m\.)?vk\.com\/.*(?P<id>video(-)?\d+_\d+)")
SINGLE_VIDEO_URL = re.compile(r"(http(s)?:[a-z,A-Z,0-9,\.,\\,\/,-,_]+\.(?P<q>\d+)?\.mp4)")
SINGLE_HLS_URL = re.compile(r"\"hls\":\"(?P<playlist>https:[a-z,A-Z,0-9,\.,\\,\/,-,_]+\.m3u8)\"")
VK_LIVE_HASH = re.compile(r"\"hash2\":\"(?P<hash>[1-9,a-f]+)\"")
VK_VIDEO_URL = "https://m.vk.com/"
VK_EXT_URL = "https://vk.com/video_ext.php?oid={0}&id={1}&hash={2}"
# User-agent to use for http requests
USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.82 Safari/537.36'

class vk(Plugin):
    @classmethod
    def can_handle_url(cls, url):
        return _url_re.match(url)

    def _get_streams(self):
        match = _url_re.match(self.url)
        videoid = match.group('id')
        
        streams = {}

        # Set header data for user-agent
        hdr = {'User-Agent': USER_AGENT}
        
        # Parse video ID from data received from supplied URL
        res = http.get(VK_VIDEO_URL + videoid.strip(), headers=hdr)

        for match in re.findall(SINGLE_VIDEO_URL, res.text):
            url = match[0].replace("\\/", "/")
            streams[match[2]] = HTTPStream(self.session, url)

        if not streams:
            # try to check is live
            match = VK_LIVE_HASH.search(res.text)
            params = videoid.split('_')

            if match and match.group('hash'):
                url = VK_EXT_URL.format(params[0].replace('video', "").replace('-', ""), params[1], match.group('hash'))
                res = http.get(url, headers=hdr)

                match = SINGLE_HLS_URL.search(res.text)

                if match and match.group('playlist'):
                    hls_streams = HLSStream.parse_variant_playlist(self.session, match.group('playlist').replace("\\/", "/"), namekey="pixels")
                    streams.update(hls_streams)

        return streams

__plugin__ = vk
