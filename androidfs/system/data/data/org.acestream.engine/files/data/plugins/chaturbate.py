#-plugin-sig:bZV59+RyQvPOCbVd9HsqEq4qOJoPiF971R/eCebwsJpzsJe4fdIcl8+stSvdU307pU0FZ8QwlVIt5NqT+lWIfA/EUDDSSMgg0Iqm9nHXsZtTZEhPD5RxOWBnn++X8jcq71/Zyqnr6Z4YwoDG+qae6B3R9wnqigB7eNCprTE1rNzWLG8pcJkR8vjjnkv2sKrWjeS1F9broeLCYDnEjuQWUwRuT3m8ZNCFdp6m+2SlM7hIWKNfYYwhFlPZkRc7xgklmpAg7VJIWs5Y5c1/JN47z8GHFFthir6eCppciEJHf2EBwtH8mMX7MniZIhBLyPbB8NC6GRLimyk3WSJQlBxi5A==
import re

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http, validate
from ACEStream.PluginsContainer.livestreamer.stream import HLSStream

_url_re = re.compile("http(s)?://(\w+.)?chaturbate.com/[^/?&]+")
_playlist_url_re = re.compile("html \+= \"src='(?P<url>[^']+)'\";")
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


class Chaturbate(Plugin):
    @classmethod
    def can_handle_url(self, url):
        return _url_re.match(url)

    def _get_streams(self):
        playlist_url = http.get(self.url, schema=_schema)
        if not playlist_url:
            return

        return HLSStream.parse_variant_playlist(self.session, playlist_url)

__plugin__ = Chaturbate
