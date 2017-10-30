#-plugin-sig:fZcPdz7vmPaMeJg/mAOh03pU2ZTVeHA1TuQJQR9K0TgDqEQng8zy/2b0VXGnKu9uX87OO1KPz3EuTopkdPBNIjGSWgore/EqpArMpso2kmzTbiYHGqK/73Hnodws/QXnmxcR7yYMvG7J8d57zHCG4RulzpCBg8zOfW7AtcrwML9GxKHvOmft3MXhpmdpFNYSeM7eM8kbUqsUgpBdP3zjt43P1r1Oy9PYFI4grAqBLKicqX98xLg0LghUbRN9nPQBmYWQkFb1iEsD7Kfzams/c5HvkbZs5uwV98/HKGNE99DdS1aqFTERjCTUuV2VhwyjqnWHrZvnuDSGCInG8UhAjQ==
"""Plugin for NHK World, NHK Japan's english TV channel."""

import re

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http, validate
from ACEStream.PluginsContainer.livestreamer.stream import HLSStream

API_URL = "http://{}.nhk.or.jp/nhkworld/app/tv/hlslive_web.xml"

_url_re = re.compile("http(?:s)?://(?:(\w+)\.)?nhk.or.jp/nhkworld")
_schema = validate.Schema(
        validate.xml_findtext("./main_url/wstrm")
)


class NHKWorld(Plugin):
    @classmethod
    def can_handle_url(cls, url):
        return _url_re.match(url) is not None

    def _get_streams(self):
        # get the HLS xml from the same sub domain as the main url, defaulting to www
        sdomain = _url_re.match(self.url).group(1) or "www"
        res = http.get(API_URL.format(sdomain))

        stream_url = http.xml(res, schema=_schema)
        return HLSStream.parse_variant_playlist(self.session, stream_url)


__plugin__ = NHKWorld
