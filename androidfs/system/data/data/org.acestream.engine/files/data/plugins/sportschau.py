#-plugin-sig:R5vwk2ap4t9jgBvjNZwWVmyfLRuwtRcJZgNacdSaKLNahqyxuoow4OQVlLagM/4N8rGNhH2agMRH3Cx9ii2n7BYSvd6xzxhyTzf+DXVTEu0feE3JSE44B5zxEWbzxgv3EcAV1mdVgNJys/1BMN7Gw5pKlJWpAtPM6PLfYofkNVueYvXoaGtHnZtGhaRto4DxhA2WyaNaCPqpOXOf4EeuPk3NLc5qSK8EWyuCwXBzRzqmdnwSwg8L6DcGiEVCBKIO1q04j7APPtB/4X/qu/tpKJ9xYC4bROB4mTKbJD7KvAqbM6uAy102yckDemSRVDRaIxgLWm7C8qYRry7eQwhM2A==
import re
import json

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http
from ACEStream.PluginsContainer.livestreamer.stream import HDSStream

_url_re = re.compile("http(s)?://(\w+\.)?sportschau.de/")
_player_js = re.compile("https?://deviceids-medp.wdr.de/ondemand/.*\.js")

class sportschau(Plugin):
    @classmethod
    def can_handle_url(cls, url):
        return _url_re.match(url)

    def _get_streams(self):
        res = http.get(self.url)
        match = _player_js.search(res.text)
        if match:
            player_js = match.group(0)
            self.logger.info("Found player js {0}", player_js)
        else:
            self.logger.info("Didn't find player js. Probably this page doesn't contain a video")
            return

        res = http.get(player_js)

        jsonp_start = res.text.find('(') + 1
        jsonp_end = res.text.rfind(')')

        if jsonp_start <= 0 or jsonp_end <= 0:
            self.logger.info("Couldn't extract json metadata from player.js: {0}", player_js)
            return

        json_s = res.text[jsonp_start:jsonp_end]

        stream_metadata = json.loads(json_s)

        return HDSStream.parse_manifest(self.session, stream_metadata['mediaResource']['dflt']['videoURL']).items()

__plugin__ = sportschau
