#-plugin-sig:RQOy/WJl6UqZ8CYhuFEDhH7M0IazAxQdk163P5Ku5IKEZcjaNJ4OoBY5MEcYHTtSF7JflRBmSKJQ2QB1pF7mX0DvguyvB4sGHHu7XrKoAKgn4hLABp/3BpddNoQfjIIr4geWMjUfEETLkul6DY6Kdn48bah/euZCJ0Ka3yTpcDK3olUJpq5PB2gd5pBj4qr0zhr9F2hprciDfTUVVUaWF4/HtSC8lm+ujILGtCauZap3LxVOT83acq0+6iFGpZXnYqOar/0dCS2L3Lq2o/RSK41GMuC3N18GhbNqworU1XVKdzmfiPAuUhpdPqhA6S1JJywgV41E0rGkm+WTRgP+nw==
from __future__ import print_function

import json
import re

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http
from ACEStream.PluginsContainer.livestreamer.plugin.api import validate
from ACEStream.PluginsContainer.livestreamer.stream import HLSStream
from ACEStream.PluginsContainer.livestreamer.compat import unquote


class CinerGroup(Plugin):
    """
    Support for the live stream on www.showtv.com.tr
    """
    url_re = re.compile(r"""https?://(?:www.)?
        (?:
            showtv.com.tr/canli-yayin/showtv|
            haberturk.com/canliyayin|
            showmax.com.tr/canliyayin|
            showturk.com.tr/canli-yayin/showturk|
            bloomberght.com/tv|
            haberturk.tv/canliyayin
        )/?""", re.VERBOSE)
    stream_re = re.compile(r"""div .*? data-ht=(?P<quote>["'])(?P<data>.*?)(?P=quote)""", re.DOTALL)
    stream_data_schema = validate.Schema(
        validate.transform(stream_re.search),
        validate.any(
            None,
            validate.all(
                validate.get("data"),
                validate.transform(unquote),
                validate.transform(lambda x: x.replace("&quot;", '"')),
                validate.transform(json.loads),
                {
                    "ht_stream_m3u8": validate.url()
                },
                validate.get("ht_stream_m3u8")
            )
        )
    )

    @classmethod
    def can_handle_url(cls, url):
        return cls.url_re.match(url) is not None

    def _get_streams(self):
        res = http.get(self.url)
        stream_url = self.stream_data_schema.validate(res.text)
        if stream_url:
            return HLSStream.parse_variant_playlist(self.session, stream_url)


__plugin__ = CinerGroup
