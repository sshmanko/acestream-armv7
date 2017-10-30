#-plugin-sig:ADVtyyKiA15+FE54Bumsds+wX2L7eBX/YjZr7i0a6PoiG5n+gcyOzlwvpASL9T2U0RyKFovbj+twJarB9YUqfrsgO9rn6kIT301X0yvEheTGtlzpG9jWJwNi+i9osKo9IG2XkS2OL8oY9lX3vY5gPq8IQR98pgt5+b0ow8mQClv54FyM0FP1eNa5XGth8LCuT5Zy8agIAR+NiBHeuXD9NMas8myq9RU/PCsSLz1jg/KOxK1HjSxb41g+XCOd/GRdi6v91PjDpcd3WS1qgHw7EC0z76qsmciqgfy9qA1bpxIYK2hoKcte2IWpt5DtTzQKPhhv20xtdt0ZVZGXRYG6lQ==
import re
from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.stream import HLSStream
from ACEStream.PluginsContainer.livestreamer.stream import RTMPStream, HTTPStream
from ACEStream.PluginsContainer.livestreamer.plugin.api import http


_streams_re = re.compile(r"""
    src:\s+"(
        rtmp://.*?\?t=.*?|                      # RTMP stream
        https?://.*?playlist.m3u8.*?\?t=.*?|    # HLS stream
        https?://.*?manifest.mpd.*?\?t=.*?|     # DASH stream
        https?://.*?.mp4\?t=.*?                 # HTTP stream
        )".*?
     type:\s+"(.*?)"                            # which stream type it is
     """, re.M | re.DOTALL | re.VERBOSE)
_url_re = re.compile(r"http(s)?://(?:\w+\.)?livecoding\.tv")


class LivecodingTV(Plugin):
    @classmethod
    def can_handle_url(cls, url):
        return _url_re.match(url)

    def _get_streams(self):
        res = http.get(self.url)
        match = _streams_re.findall(res.content.decode('utf-8'))
        for url, stream_type in match:
            if stream_type == "rtmp/mp4" and RTMPStream.is_usable(self.session):
                params = {
                    "rtmp": url,
                    "pageUrl": self.url,
                    "live": True,
                }
                yield 'live', RTMPStream(self.session, params)
            elif stream_type == "application/x-mpegURL":
                for s in HLSStream.parse_variant_playlist(self.session, url).items():
                    yield s
            elif stream_type == "video/mp4":
                yield 'vod', HTTPStream(self.session, url)

__plugin__ = LivecodingTV
