#-plugin-sig:P+vzcxlKEwLIG68ODjzs8m9A0M0SNUCMsAYUfFqt0UQBMZWiWBPP/cdZ75jOu1rQpdds7vnTaUrnWxaM/1ahlCjYpXk01Y+QjZqxek2mqo1Ml2Kt5k0BobOCw6RJ3899D1BSvr4vqiQbCeu7ABpjhVbebyoVstlH7x17SDMPsR/vcfmeQpi/j79Y/k4GGHz9hvoNtZXkFDVJOkrFfls+tYHCPCAkkXv9NhEbKfUsktsr/iKFoUxW2+OsNX64anPdeKbhc9E0Pdid015t6fkZuEq63T6EhGz51I9PLOKdmVQ5tRXYPnjBI3xE10y/ckMoQ6fm93iPWnVKVG+AIbKJog==
import re
import urlparse

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin, PluginError
from ACEStream.PluginsContainer.livestreamer.plugin.api import http
from ACEStream.PluginsContainer.livestreamer.stream import HTTPStream, HLSStream

_url_re = re.compile(r"""
    http(s)?://
    (?:
        www|m\.
    )?
    vk\.com/
    (?:
        .*(?P<id>video(-)?\d+_\d+)|
        video_ext\.php\?(?P<embed_params>.+)
    )
    """, re.VERBOSE)

# example: https://cs640002.vkuservideo.net/1/u2949887/videos/847c9e8616.240.mp4?extra=dLGBD3PfFG4Hjzrs1Qn30t8-xpmQmHQ52j3Oq4FjtISUjpFD8Np6c1Z96l1lbHmvht6kuk0q8GhyK5W1EMYws76OprzyGcNpW8KpOH5Y2WdeIzOISPIfJTln_ZM_P43U
SINGLE_VIDEO_URL = re.compile(r"(http(s)?:[a-z,A-Z,0-9,\.,\\,\/,\-,_]+\.(?P<q>\d+)?\.mp4([^\"]+)?)")
SINGLE_HLS_URL = re.compile(r"\"hls\":\"(?P<playlist>https:[a-z,A-Z,0-9,\.,\\,\/,\-,_]+\.m3u8)\"")
VK_LIVE_HASH = re.compile(r"\"hash2\":\"(?P<hash>[1-9,a-f]+)\"")
VK_VIDEO_URL = "https://vk.com/"
VK_EXT_URL = "https://vk.com/video_ext.php?oid={0}&id={1}&hash={2}"
# User-agent to use for http requests
USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.82 Safari/537.36'

class vk(Plugin):
    @classmethod
    def can_handle_url(cls, url):
        return _url_re.match(url)

    def _get_streams(self):
        streams = {}

        match = _url_re.match(self.url)
        videoid = match.group('id')
        embed_params = match.group('embed_params')

        if not videoid and embed_params:
            query_params = urlparse.parse_qs(embed_params, True)

            if not 'oid' in query_params:
                self.logger.error("missing 'oid'")
                return streams

            if not 'id' in query_params:
                self.logger.error("missing 'id'")
                return streams

            _oid = query_params['oid'][0]
            _id = query_params['id'][0]
            # _hash = query_params['hash'][0]
            videoid = "video%s_%s" % (_oid, _id)

        # Set header data for user-agent
        hdr = {'User-Agent': USER_AGENT}

        # Parse video ID from data received from supplied URL
        res = http.get(VK_VIDEO_URL + videoid.strip(), headers=hdr)

        for match in re.findall(SINGLE_VIDEO_URL, res.text):
            url = match[0].replace("\\/", "/")
            try:
                # follow possible redirects and get final url
                res = http.get(url, headers=hdr, verify=False, allow_redirects=True, stream=True)
                streams[match[2]] = HTTPStream(self.session, res.url)
            except:
                pass

        if not streams:
            # try live
            for match in re.findall(SINGLE_HLS_URL, res.text):
                url = match.replace("\\/", "/")
                streams = {"variant": HLSStream(self.session, url)}
                break

        if not streams:
            # try to check is live
            match = VK_LIVE_HASH.search(res.text)
            params = videoid.split('_')

            if match and match.group('hash'):
                url = VK_EXT_URL.format(params[0].replace('video', "").replace('-', ""), params[1], match.group('hash'))
                res = http.get(url, headers=hdr)

                match = SINGLE_HLS_URL.search(res.text)

                if match and match.group('playlist'):
                    url = match.group('playlist').replace("\\/", "/")
                    streams = {"variant": HLSStream(self.session, url)}

        return streams

__plugin__ = vk
