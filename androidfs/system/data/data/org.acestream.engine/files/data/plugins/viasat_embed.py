#-plugin-sig:Tgg2N/mlOCMuMUWR77aIuGUWncB0O1Mc6rLUOmnvO3hbpruyNpgRfDiH5IScd0JNZvzRHw3chwFWMgPzQskdvfDq8u01ZyGbSY5+Z5jK/bO6xZGV4kQumyH4jv59aQiqEjtHk8u7n7878oi1qpqMY1OEDTn6gK7fNE//2XroR9PfGcNTwhpvfoh6pEB2Yzww5I+8wh35cqtcS/oeIB98bXt3X2XOUb88OF8Oepd63G1OM3Lixc/MdVI37N+Kg8BoyBenl3PSpZwB9w7QJV7rRYWsBpnPmeXjLdrHWjzSDfyCK9U5KW39LhjynZltpD/wBV98tALzALrGY1d5VZAawg==
import re

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http


_url_re = re.compile("http(s)?://(www\.)?tv(3|6|8|10)\.se")
_embed_re = re.compile('<iframe class="iframe-player" src="([^"]+)">')


class ViasatEmbed(Plugin):
    @classmethod
    def can_handle_url(self, url):
        return _url_re.match(url)

    def _get_streams(self):
        res = http.get(self.url)

        match = _embed_re.search(res.text)
        if match:
            url = match.group(1)
            return self.session.streams(url)


__plugin__ = ViasatEmbed
