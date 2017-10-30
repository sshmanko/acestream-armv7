#-plugin-sig:c66b9jbsbiXB06p1RGUJo3Uq39IYzgBRyXH9FeoXH6mPMH+xFkz2hLUIVfvNwyw3COBQp1A/HvyAupJGLgMH06UzOGJmOAe5gufbCPCU7QHZ4dTyPkJPIDX+fsngeE6f20RLOYVxDlMLyz7w4GCU5Arz1RotYj9II20LqZo7hCXqfD1bYClbgygMvnouu500fNaA6HwQM/fyHORAapRK+H2qizPM2SRKYZes4ApyV9NvlPNOdlQCSLWrAAljH529/cg+99yKixOopQrQQozcBBJtsQE0S+e1WQBxP/3Pd6EnLBfSEe7oT1VbDLbRCRNWjfmKCM0B3MxWQJ+kTgBtkQ==
import re

from ACEStream.PluginsContainer.livestreamer.compat import urlparse
from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http, validate
from ACEStream.PluginsContainer.livestreamer.stream import HLSStream, HTTPStream

_url_re = re.compile("http(s)?://(\w+\.)?seemeplay.ru/")
_player_re = re.compile("""
    SMP.(channel|video).player.init\({
    \s+file:\s+"([^"]+)"
""", re.VERBOSE)

_schema = validate.Schema(
    validate.transform(_player_re.search),
    validate.any(
        None,
        validate.union({
            "type": validate.get(1),
            "url": validate.all(
                validate.get(2),
                validate.url(scheme="http"),
            ),
        })
    )
)


class SeeMePlay(Plugin):
    @classmethod
    def can_handle_url(cls, url):
        return _url_re.match(url)

    def _get_streams(self):
        res = http.get(self.url, schema=_schema)
        if not res:
            return

        if res["type"] == "channel" and urlparse(res["url"]).path.endswith("m3u8"):
            return HLSStream.parse_variant_playlist(self.session, res["url"])
        elif res["type"] == "video":
            stream = HTTPStream(self.session, res["url"])
            return dict(video=stream)

__plugin__ = SeeMePlay
