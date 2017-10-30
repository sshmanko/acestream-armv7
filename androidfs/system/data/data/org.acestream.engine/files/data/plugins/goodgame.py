#-plugin-sig:WjpIOKyUrNWXYCC5l5UFQnCbaGy1DBqiOypDRw8fYe+ThNgBhXMTwFzR9VI2Ok+ZtjQzLNtsd0Itt/FmX56PALSu9iYaSrZZuxTPxvLdEos/pCuG7ypEjzqga8R/a3WDUavK8R7e9/osIjTPjmqOqmLdgSwb5jH5CAb+W8Mp0cMN3mxZg1eWezWBkM3eoXTNNZvQ4Kg37yCiMIWwiJtHCbbEvyPOcxL55pm0YoJbWO23Y7k79eylZaAlrfbF5u5q761nssrChkfBMitF7BFoIoPyttzQu9BILee0nLyDwMltRlB6NrJAGq4j1My3fOxP5OONiE2VYxPlxpOHuCKY/g==
import re

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http
from ACEStream.PluginsContainer.livestreamer.stream import HLSStream

HLS_URL_FORMAT = "https://hls.goodgame.ru/hls/{0}{1}.m3u8"
QUALITIES = {
    "1080p": "",
    "720p": "_720",
    "480p": "_480",
    "240p": "_240"
}

_url_re = re.compile("https://(?:www\.)?goodgame.ru/channel/(?P<user>\w+)")
_stream_re = re.compile(r'var src = "([^"]+)";')
_ddos_re = re.compile(r'document.cookie="(__DDOS_[^;]+)')

class GoodGame(Plugin):
    @classmethod
    def can_handle_url(self, url):
        return _url_re.match(url)

    def _check_stream(self, url):
        res = http.get(url, acceptable_status=(200, 404))
        if res.status_code == 200:
            return True

    def _get_streams(self):
        headers = {
            "Referer": self.url
        }
        res = http.get(self.url, headers=headers)

        match = _ddos_re.search(res.text)
        if match:
            headers["Cookie"] = match.group(1)
            res = http.get(self.url, headers=headers)

        match = _stream_re.search(res.text)
        if not match:
            return

        stream_id = match.group(1)
        streams = {}
        for name, url_suffix in QUALITIES.items():
            url = HLS_URL_FORMAT.format(stream_id, url_suffix)
            if not self._check_stream(url):
                continue

            streams[name] = HLSStream(self.session, url)

        return streams

__plugin__ = GoodGame
