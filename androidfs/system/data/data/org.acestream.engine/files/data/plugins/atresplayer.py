#-plugin-sig:RmqZsvFGwgzVdDc9qxhclw7ZITVuxFpNFFnaR9sHT1hA3zbL/VDZvt2WHBsxy9ew6wyx21mfEP3XFuVYNewOfe5GfJsUQgTvxq0t0ffUZJl8bDP5ypGvZX0ceXC/pUyNGmWGq+OUA+LzG/znmnn6IVW+rXNi9QMUFOdOJYCvk9Bepzo6iQ5Pbpaeaf2lliw1oNJW29RPpEyfLhAuvpxuERrLO0DaBPDf7SCTFokigKamaVHoHSV5p+aaS4kQ+37XuIjWjdV/iU4co7mvG0YS7cFyVVId/kRkexrKVNbVp5Fvp/wYuz/W/1wO8ggHGyZHYD+8ay3xOSxfGoDi1P8tsw==
from __future__ import print_function
import re
import time
import random

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http
from ACEStream.PluginsContainer.livestreamer.plugin.api import validate
from ACEStream.PluginsContainer.livestreamer.stream import HDSStream


class AtresPlayer(Plugin):
    url_re = re.compile(r"https?://(?:www.)?atresplayer.com/directos/television/(\w+)/?")
    player_re = re.compile(r"""div.*?directo=(\d+)""")
    stream_api = "https://servicios.atresplayer.com/api/urlVideoLanguage/v3/{id}/web/{id}|{time}|{hash}/es.xml"
    manifest_re = re.compile(r"<resultDes>(.+)?</resultDes>")

    @classmethod
    def can_handle_url(cls, url):
        return cls.url_re.match(url) is not None

    def _get_streams(self):
        res = http.get(self.url)
        match = self.player_re.search(res.text)
        if match:
            channel_id = match.group(1)

            stream_api = self.stream_api.format(id=channel_id,
                                                time=int(time.time()),
                                                hash=''.join(random.choice("abcdef0123456789") for x in range(28)))

            res = http.get(stream_api)
            f4m_url = self.manifest_re.search(res.text)
            if f4m_url:
                return HDSStream.parse_manifest(self.session, f4m_url.group(1))


__plugin__ = AtresPlayer
