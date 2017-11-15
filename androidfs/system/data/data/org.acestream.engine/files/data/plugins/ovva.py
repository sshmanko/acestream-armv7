#-plugin-sig:ivQafMxeUDQ6g4K2k+E/46NCo2WdNF0EUxkciCL9f5DU3PEU/Q5az8X9VAG7LFhPQ87PSAI7iOTCOTiQWLe21M9xneeXP/FEJBN6XNZa1oJHjXbA1CHybHCnL+tdOuj8dUm1D+DmFcNEgmgUcxoHw3ZhTEkq+l4EBKCWpHVyV9jgrpjUZeUW6ZV9GwaoKVA7GmTleIXGUeW7/zCb7tsTAmNjr1DoNPoQBJuhJxDstgsXq/np/YYL8IT64yu6gyJ7p56gPZjjtBcECZrdT3beBOWud3xPHOR31brOhEFmcwimm4upkbAd6eDhZVM5g9fFx24EQQ93s/4mbJJQp/0LEg==
import re
import base64
import json

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin, PluginError
from ACEStream.PluginsContainer.livestreamer.plugin.api import http
from ACEStream.PluginsContainer.livestreamer.stream import HTTPStream, HLSStream

# https://ovva.tv/video/embed/EuDTKiaN?logo=tsn&l=ua&autoplay=0
_url_re = re.compile(r"http(s)?:\/\/(?:www\.)?ovva\.tv\/.*embed\/(?P<id>[a-z,A-Z,0-9]+)")
_player_params = re.compile(r"\$\(\'\#ovva-player\'\)\.ovva\(\'(?P<base64>.*)\'\);")
# User-agent to use for http requests
USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.82 Safari/537.36'

class ovva(Plugin):
    @classmethod
    def can_handle_url(cls, url):
        return _url_re.match(url)

    def _get_streams(self):
        match = _url_re.match(self.url)
        videoid = match.group('id')

        # Set header data for user-agent
        hdr = {'User-Agent': USER_AGENT}

        # Parse video ID from data received from supplied URL
        res = http.get(self.url, headers=hdr)

        if not res:
            return {}

        for match in re.findall(_player_params, res.text):
            try:
                params = json.loads(base64.b64decode(match))
                video_url = params.get("url")
                res = http.get(video_url, headers=hdr)

                video_url = res.text.split('=')[1]

                return HLSStream.parse_variant_playlist(self.session, video_url)
            except Exception as e:
                self.logger.error("Failed to decode player params: {0}", e)

                return {}
__plugin__ = ovva
