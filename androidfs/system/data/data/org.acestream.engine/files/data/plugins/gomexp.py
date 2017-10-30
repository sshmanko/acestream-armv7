#-plugin-sig:gknv15ENUbgfo0PL0zzph53gG9a55mX8k9kHtcubjzu3+fxhTyxtITSrcYQSUTboNMIAM5j7w/I1wzEPfBKola9Tq9fuC36npht4dSAAUQbwbOib8omnrLis++JiAtEWigjUy8b+PDnmLnLdpfc9Mjb/QYsiFy7jPHiOkM2S2HJe+KCIoipCHG+A0Dls/dPn4PLgwDBOmSqqMdT117OHa1ka4POUNC8hFCGsCtkobuZmKEpoiyqtbAsqKjC55XJTJEdEkj19H65EEx3iA5gIjqpCcfspzEc2ubnndrtU6W8NIMr6PVBfJwb3uwz6c5PkRYcMbBr/WD7ILzCfFxGqmQ==
"""Plugin for GOMeXP live streams.

This plugin is using the same API as the mobile app.
"""

import re

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http, validate
from ACEStream.PluginsContainer.livestreamer.stream import HLSStream

API_BASE = "http://gox.gomexp.com/cgi-bin"
API_URL_APP = API_BASE + "/app_api.cgi"
API_URL_LIVE = API_BASE + "/gox_live.cgi"

_url_re = re.compile("http(s)?://(www\.)?gomexp.com")

_entries_schema = validate.Schema(
    validate.xml_findall("./ENTRY/*/[@reftype='live'][@href]"),
    [validate.get("href")]
)


class GOMeXP(Plugin):
    @classmethod
    def can_handle_url(self, url):
        return _url_re.match(url)

    def _get_live_cubeid(self):
        res = http.get(API_URL_APP, params=dict(mode="get_live"))
        root = http.xml(res)
        return root.findtext("./cube/cubeid")

    def _get_streams(self):
        cubeid = self._get_live_cubeid()
        if not cubeid:
            return

        res = http.get(API_URL_LIVE, params=dict(cubeid=cubeid))
        entries = http.xml(res, schema=_entries_schema)
        streams = {}
        for url in entries:
            try:
                streams.update(
                    HLSStream.parse_variant_playlist(self.session, url)
                )
            except IOError as err:
                self.logger.error("Failed to open playlist: {0}", err)

        return streams

__plugin__ = GOMeXP
