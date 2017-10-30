#-plugin-sig:L8CD4SwbwkcETCQ/F4xCU9o75/eL/0AgCaCojcP3djjlcmOXk7mAOoWRcGqFazGwyVxGuXz3tQwsHWVUC4e8HYzQ4nCiUatk+rol6AvvSVVc3kamZ6LQYDTvs+cJfEfKlOz3vrfZsQnEckx2slhAzGo5ca2TuYFbkyOblb5DsQoPH97qMV/UOM1cAbmus8gz3avtxKefDrApbK3tJUU0W57qNFop408CsB+fLUnIAmvDjjGEJoZwFl0Py2ZcD9e1p1xTShROEL3NV4IQtLIz4WmzYzaa0fNnTqKPOS4twZyYq1W89n5ajpqOsxnTgB0RokfwH4ShlRs41UI5VlTccA==
import re

from ACEStream.PluginsContainer.livestreamer.compat import urlparse
from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http, validate
from ACEStream.PluginsContainer.livestreamer.stream import FLVPlaylist, HTTPStream

API_URL = "http://veetle.com/index.php/stream/ajaxStreamLocation/{0}/flash"

_url_re = re.compile("""
    http(s)?://(\w+\.)?veetle.com
    (:?
        /.*(v|view)/
        (?P<channel>[^/]+/[^/&?]+)
    )?
""", re.VERBOSE)

_schema = validate.Schema({
    validate.optional("isLive"): bool,
    "payload": validate.any(int, validate.url(scheme="http")),
    "success": bool
})


class Veetle(Plugin):
    @classmethod
    def can_handle_url(self, url):
        return _url_re.match(url)

    def _get_streams(self):
        self.url = http.resolve_url(self.url)
        match = _url_re.match(self.url)
        parsed = urlparse(self.url)
        if parsed.fragment:
            channel_id = parsed.fragment
        elif parsed.path[:3] == '/v/':
            channel_id = parsed.path.split('/')[-1]
        else:
            channel_id = match.group("channel")

        if not channel_id:
            return

        channel_id = channel_id.lower().replace("/", "_")
        res = http.get(API_URL.format(channel_id))
        info = http.json(res, schema=_schema)

        if not info["success"]:
            return

        if info.get("isLive"):
            name = "live"
        else:
            name = "vod"

        stream = HTTPStream(self.session, info["payload"])
        # Wrap the stream in a FLVPlaylist to verify the FLV tags
        stream = FLVPlaylist(self.session, [stream])

        return {name: stream}

__plugin__ = Veetle
