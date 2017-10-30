#-plugin-sig:ndEiyRW3P8MfPorpHFFSH2O2CRPRvepIW9hNPMAUB94OXs//5NgB2pw9lVxgHr4o2YUj7M3wtnAG9Ws7KEVRVq6vd+cjAJyWDaKmOAA/VdVbPGrLRTwJaTucHPGogJ0xcNDm/huGb+6ExZ71IN5zAFcI9Ko03xU9mgd/gp5fKTWS3I00ESjXkEkCs05tkqk4IzhfZbIZIrRpM28XOycKQxgc9Ot4Kq2npHByj4E0XGn+X9QoOdc/5uqQ0VrJUSVdxq47V+Zc2pI1FBK87Z1hktEKAx8bESXzKTvFnJUcNLuJHUxutXrwNH4MKVroxpap7wZUc7a/YplEOQXPRRpdJA==
import re

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http, validate
from ACEStream.PluginsContainer.livestreamer.stream import HLSStream

_url_re = re.compile("http(s)?://(www\.)?openrec.tv/(live|movie)/[^/?&]+")
_playlist_url_re = re.compile("data-file=\"(?P<url>[^\"]+)\"")
_schema = validate.Schema(
    validate.transform(_playlist_url_re.search),
    validate.any(
        None,
        validate.all(
            validate.get("url"),
            validate.url(
                scheme="http",
                path=validate.endswith(".m3u8")
            )
        )
    )
)

class OPENRECtv(Plugin):
    @classmethod
    def can_handle_url(self, url):
        return _url_re.match(url)

    def _get_streams(self):
        playlist_url = http.get(self.url, schema=_schema)
        if not playlist_url:
            return

        return HLSStream.parse_variant_playlist(self.session, playlist_url)

__plugin__ = OPENRECtv
