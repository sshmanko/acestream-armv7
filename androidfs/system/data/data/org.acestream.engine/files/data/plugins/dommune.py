#-plugin-sig:Ll5Qj5Plt5GfsjWHtaBexPCODwbpIKmazYHuO/1SrPaK62lCY1Z8zYbOURH7F5T4w3gK/pCJyuIJQQsHkA4eMMMa8ItV03pGQfjuBkDBpTC6rh8dlL2/yBl7lWGimG2wDmBu3SxR8LMQZ2FhaRmQrEiMKrFLQA40Psr0vyy6N/B4xdvrwxB72OgXh2xTQYeLE5GqyipFsTEvCODg3huFRJLCURrCH+Aew9yDzm1sytdNrNJJTmVvimmFgQ+6JdMv7DYcjZzClQFKTYZ+tXAZ8AJ1cvMbxvz/j1LFdsYiiYzzsZn2RH3KCHKITEpMjDVLSi6qv9Qns9OMBJ+dRuhgnA==
"""Plugin for DOMMUNE, simply extracts current live YouTube stream."""

import re

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http, validate

DATA_URL = "http://www.dommune.com/freedommunezero2012/live/data/data.json"

_url_re = re.compile("http(s)?://(\w+\.)?dommune.com")
_data_schema = validate.Schema({
    "channel": validate.text,
    "channel2": validate.text
})


class Dommune(Plugin):
    @classmethod
    def can_handle_url(cls, url):
        return _url_re.match(url)

    def _get_streams(self):
        res = http.get(DATA_URL)
        data = http.json(res, schema=_data_schema)
        video_id = data["channel"] or data["channel2"]
        if not video_id:
            return

        url = "http://youtu.be/{0}".format(video_id)
        return self.session.streams(url)


__plugin__ = Dommune
