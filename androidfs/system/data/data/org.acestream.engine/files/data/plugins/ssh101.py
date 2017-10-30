#-plugin-sig:AsozYFUEqkEg98x4Y1p09+D4gghyeFiEmQ1CXuCFtOvKjVXsaYs0BsjNoUKfUYj03j87DyA3F7ZOjc6HawhB50PRBhuP7qZt4w6I5MtbyN4kbZI8KWIH/H7ZXlPAPvmaG8RXdj+SKQQ8l6hbXKKg3e+QHiUe5OgShQyBTiWQJlxHpLdQuViEEyz7F8BdRI0F1bZsFgtuHy6V+E63nt2e81n/KHDzFNtBM0W7XDa2KA80yQod2Ccm/vIkILiVC+bTAxudP4KQh1T0KYPz5sxX8DG8mxXlRGWw1rX1/hnqLf2QJx70mzIKbkYa10NBUhY/PqruHAQBjWIKfM/VYbIWUA==
import re

from ACEStream.PluginsContainer.livestreamer.compat import urlparse
from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http, validate
from ACEStream.PluginsContainer.livestreamer.stream import HLSStream

_url_re = re.compile("http(s)?://(\w+\.)?ssh101\.com/")

_live_re = re.compile("""
\s*jwplayer\(\"player\"\)\.setup\({.*?
\s*primary:\s+"([^"]+)".*?
\s*file:\s+"([^"]+)"
""", re.DOTALL)

_live_schema = validate.Schema(
    validate.transform(_live_re.search),
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

class SSH101(Plugin):
    @classmethod
    def can_handle_url(self, url):
        return _url_re.match(url)

    def _get_streams(self):
        res = http.get(self.url, schema=_live_schema)
        if not res:
            return

        if res["type"] == "hls" and urlparse(res["url"]).path.endswith("m3u8"):
            stream = HLSStream(self.session, res["url"])
            return dict(hls=stream)

__plugin__ = SSH101
