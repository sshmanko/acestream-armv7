#-plugin-sig:Elp1tT1cmATQfBnP8j0cgEut7jWvrzuaX7qhlo2YY/weNAa6b3nu15C16itmdVExTe5R1yiwrN/0lRxAINgBS68Y/bhDTRAGb6mjLCIxNgUvBiPELmGkVqRX9/0vsW2EOJ90YAkAP60f1oKG7/iodyS00wEoTqsxGZfYjaKiq4Jyv0v4BNLnswKXofQ4dDE1asp+720TQsxK13tV3iUJ75uvPUUxCY2DUcRm+TDhKNR/ebZrxwSn+ZrQSX8w2O8fWbK0W3Op4qXf7JN8ZnIV6noHrd2YHg7OqE3hoWZl8wcmze5HoUPvv+qIK2zy75t1Ss7LaPZ2yhS/Z1XBkIs7dA==
from __future__ import print_function
import re

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http
from ACEStream.PluginsContainer.livestreamer.plugin.api import validate
from ACEStream.PluginsContainer.livestreamer.compat import urlparse, parse_qsl
from ACEStream.PluginsContainer.livestreamer.stream import HLSStream
from ACEStream.PluginsContainer.livestreamer.stream import HTTPStream


class LiveMe(Plugin):
    url_re = re.compile(r"https?://(www.)?liveme.com/media/play/(.*)")
    api_url = "http://live.ksmobile.net/live/queryinfo?userid=1&videoid={id}"
    api_schema = validate.Schema(validate.all({
        "status": "200",
        "data": {
            "video_info": {
                "videosource": validate.any('', validate.url()),
                "hlsvideosource": validate.any('', validate.url()),
            }
        }
    }, validate.get("data")))

    @classmethod
    def can_handle_url(cls, url):
        return cls.url_re.match(url) is not None

    def _make_stream(self, url):
        if url and url.endswith("flv"):
            return HTTPStream(self.session, url)
        elif url and url.endswith("m3u8"):
            return HLSStream(self.session, url)

    def _get_streams(self):
        url_params = dict(parse_qsl(urlparse(self.url).query))
        video_id = url_params.get("videoid")

        if video_id:
            self.logger.debug("Found Video ID: {}", video_id)
            res = http.get(self.api_url.format(id=video_id))
            data = http.json(res, schema=self.api_schema)
            hls = self._make_stream(data["video_info"]["hlsvideosource"])
            video = self._make_stream(data["video_info"]["videosource"])
            if hls:
                yield "live", hls
            if video:
                yield "live", video

__plugin__ = LiveMe
