#-plugin-sig:HescUFYqgxyTs2M7oBvrZ4L35k8dV3ujNFOpGBPghtTDhNgXmcrSy91oZwgTtaRC5ORjrsN0BACLmI0ylEm7Qswjro1S4Z6rCezX8KMYB3c1LwDmNchg33JDTyozZ17T3esLyKeCUyFlKL3ZKxL4yxo9+8ntBhZ0NcDwHuvSjD6B1sfhBoay5z3ATZ/sbhV5Suz/WPP8XiRyGGCPrSR2C3mQ6fEv2k57UXmUFurs5nQHFg8FzJ2SN3OC450Q6qYsoB/uXlwp5k7aQlyoUK4hTAggXNdkCfn7uftYl03Y8S5eQGtR1wqkdN/loDyjgWvEHdCQ62nn/PJj1bt4iBQ0uA==
from __future__ import print_function
import re

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http
from ACEStream.PluginsContainer.livestreamer.plugin.api import validate
from ACEStream.PluginsContainer.livestreamer.stream import HLSStream


class FoxTR(Plugin):
    """
    Support for Turkish Fox live stream: http://www.fox.com.tr/canli-yayin
    """
    url_re = re.compile(r"http?://www.fox.com.tr/canli-yayin")
    playervars_re = re.compile(r"desktop.*?:.*?\[.*?\{.*?src.*?:.*?'(.*?)'", re.DOTALL)

    @classmethod
    def can_handle_url(cls, url):
        return cls.url_re.match(url) is not None

    def _get_streams(self):
        res = http.get(self.url)
        match = self.playervars_re.search(res.text)
        if match:
            stream_url = match.group(1)
            return HLSStream.parse_variant_playlist(self.session, stream_url)


__plugin__ = FoxTR
