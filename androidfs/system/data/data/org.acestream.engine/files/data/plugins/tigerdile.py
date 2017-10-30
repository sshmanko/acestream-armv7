#-plugin-sig:cnPENa2IpxZezdxZwYUuhckJwS2ZuUczPslokWhVbBAFew4vNc97pbAUFOwkjRYDV3etP53A10/UI2o5lklD9uRHOs+Uy1JHOXHkckV3EqXJpWn6vx/4MiQP1JqciQRkq8T+bwg1H7eXMlMNyj4nd7fsddAlQeJ8ZSj2xCPrLhNGT+wNv42Bs2kDHEVDN+uuaDy9L5aA1e2rV6mfm5LI8cL7bZeaAnmEOXLft0iyPF/RCfivr+3/Nnd8tAaMNx7Ex86jbhEuTzSA08TIH1VdtDsfUoDbfs8hyVRyZh1lLUx6tKyDh3tTq9Mz2fMKF5h5slKy9N4tQ3jM1JJIK8Bwrg==
import re

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http, validate
from ACEStream.PluginsContainer.livestreamer.stream import RTMPStream

PAGE_URL = "https://www.tigerdile.com/stream/"
ROOT_URL = "rtmp://stream.tigerdile.com/live/{}"
STREAM_TYPES=["rtmp"]

_url_re = re.compile("""
    https?://(?:www|sfw)\.tigerdile\.com
    \/stream\/(.*)\/""", re.VERBOSE)


class Tigerdile(Plugin):
    @classmethod
    def can_handle_url(self, url):
        return _url_re.match(url)

    def _get_streams(self):
        res = self.url
        streamname = _url_re.search(res).group(1)
        streams = {}
        stream = RTMPStream(self.session, {
            "rtmp": ROOT_URL.format(streamname),
            "pageUrl": PAGE_URL,
            "live": True,
            "app": "live",
            "flashVer": "LNX 11,2,202,280",
            "swfVfy": "https://www.tigerdile.com/wp-content/jwplayer.flash.swf",
            "playpath": streamname,
        })
        streams["live"] = stream

        return streams

__plugin__ = Tigerdile
