#-plugin-sig:HS+goJog/iP/ABVqWuR+SQwwPq4xBPEm7+pycOcsbaIEMQGTUCJx3ugIhBEralDDy07ZMec9AjBAFPIbkWULHYvw4nKJC8o+YA7EArYyCPJIJDE5jkqSe//DNUHfEPAe/IpuFzS1cpoeZNt5WERnizQaXsABZGQVhdlK/gBz1G8h/Y7oYrQ+AfC8n/KE0DQeZuV8uvMuqsVLJCM+e9+pleaM4fr7dOTCB796SDSXpypPKM5Ao8NaRDT/MFDXTW2D76n/f518qna6b5HoIiF0XbsE5CQPvNp9eM5t67kfNCkDmHj7cBZda377sWsUpSGTVTp67PazgtewQZyedM6KPw==
import hashlib
import re
import time

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http, validate
from ACEStream.PluginsContainer.livestreamer.stream import HTTPStream

API_URL = "http://live.bilibili.com/api/playurl?cid={0}&player=1&quality=0&sign={1}&otype=json"
API_SECRET = "95acd7f6cc3392f3"
SHOW_STATUS_ONLINE = 1
SHOW_STATUS_OFFLINE = 2
STREAM_WEIGHTS = {
    "source": 1080
}

_url_re = re.compile("""
    http(s)?://live.bilibili.com
    /(?P<channel>[^/]+)
""", re.VERBOSE)

_room_re = re.compile('var ROOMID = (\\d+)')

class Bilibili(Plugin):
    @classmethod
    def can_handle_url(self, url):
        return _url_re.match(url)

    @classmethod
    def stream_weight(cls, stream):
        if stream in STREAM_WEIGHTS:
            return STREAM_WEIGHTS[stream], "Bilibili"

        return Plugin.stream_weight(stream)

    def _get_streams(self):
        match = _url_re.match(self.url)
        channel = match.group("channel")
        
        html_page = http.get(self.url).content.decode('utf-8')
        room_id = _room_re.search(html_page).group(1)
    
        ts = int(time.time() / 60)
        sign = hashlib.md5(("{0}{1}".format(channel, API_SECRET, ts)).encode("utf-8")).hexdigest()

        res = http.get(API_URL.format(room_id, sign))
        room = http.json(res)
        if not room:
            return

        for stream_list in room["durl"]:
            name = "source"
            url = stream_list["url"]
            stream = HTTPStream(self.session, url)
            yield name, stream

__plugin__ = Bilibili
