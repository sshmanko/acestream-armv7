#-plugin-sig:JbtRYBFeUjrvsf9oBy7hsPSFAbe89vnbhX5qpT4P9kV+DJKf3t5DCl1Y+oznCFy9C7b2IlZC3udD1Hsi4nw2sF/AVlFoSjewVCJ79TM+vi71PLy9jrxLOVOZdsJ3WAAEfnuYc2GyPHm6pkQRvgWdTXvVbyqH3oqYVoK65HhU/5hjQH4Y0f3qOMTysAJb8rzmJko1oaEEurrBtbhiJ2sa9Ys6l0X4DoBCqQvhrf9thkJWY2UsPVyynw3oYzukB+8I7O4Wy5wbm+Ele9Yko9aZoUEMeYH6X4CKZZOccfqAwOv3K/JTZ8forFbZ2WHnjDRDrGqJhkxglt76wHwNEQVLjg==
import re

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http, validate
from ACEStream.PluginsContainer.livestreamer.stream import HLSStream


STREAM_INFO_URL = "https://api.periscope.tv/api/v2/getAccessPublic"

STATUS_GONE = 410
STATUS_UNAVAILABLE = (STATUS_GONE,)

_url_re = re.compile(r"http(s)?://(www\.)?periscope.tv/[^/]+/(?P<broadcast_id>[\w\-\=]+)")
_stream_schema = validate.Schema(
    validate.any(
        None,
        validate.union({
            "hls_url": validate.all(
                {"hls_url": validate.url(scheme="http")},
                validate.get("hls_url")
            ),
        }),
        validate.union({
            "replay_url": validate.all(
                {"replay_url": validate.url(scheme="http")},
                validate.get("replay_url")
            ),
        }),
    ),
)


class Periscope(Plugin):
    @classmethod
    def can_handle_url(cls, url):
        return _url_re.match(url)

    def _get_streams(self):
        match = _url_re.match(self.url)
        res = http.get(STREAM_INFO_URL,
                       params=match.groupdict(),
                       acceptable_status=STATUS_UNAVAILABLE)

        if res.status_code in STATUS_UNAVAILABLE:
            return

        playlist_url = http.json(res, schema=_stream_schema)
        if "hls_url" in playlist_url:
            return dict(replay=HLSStream(self.session, playlist_url["hls_url"]))
        elif "replay_url" in playlist_url:
            self.logger.info("Live Stream ended, using replay instead")
            return dict(replay=HLSStream(self.session, playlist_url["replay_url"]))
        else:
            return

__plugin__ = Periscope
