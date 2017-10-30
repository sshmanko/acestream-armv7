#-plugin-sig:OtUBB3nnedLEfd0BBS5p23/nrzUa8WV9Yp09voI94cFIy6e+yiA9Hj1hfNyVItoUzi8BqMhr01mwQTbrAMZpkKZ6Evcagg21wqaO5PoZY9DqopTXyLaDRRnhcxQqkIZUaCDZbiMSYOhY9mxB9HNn5+81Z6NSU4ky/KP8QAO/bF2cglHDx2CLHpou5vwkphge7DG43XG4TFUHoKkUSeWxsPCqhWsdd24EZe1vS4vZtVS+iRnPoVdyfcT2DigmDmI7zGg6SadJqhAATCH0OguQxnbNDo799RNIpW/6/TRIaTNPoAk699bmCRs4+2YgOVXL5Wrs5RSFB2TFYuDiRCEIuw==
import re
import json

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http, validate
from ACEStream.PluginsContainer.livestreamer.stream import RTMPStream

_url_re = re.compile(r"http(?:s)?://connectcast.tv/(\w+)?")
_stream_re = re.compile(r'<video src="mp4:(.*?)"')
_stream_url = "http://connectcast.tv/channel/stream/{channel}"

class ConnectCast(Plugin):
    @classmethod
    def can_handle_url(self, url):
        return _url_re.match(url)

    def _get_streams(self):
        url_match = _url_re.match(self.url)
        stream_url = _stream_url.format(channel=url_match.group(1))
        res = self.session.http.get(stream_url)
        match = _stream_re.search(res.text)
        if match:
            params = dict(rtmp="rtmp://stream.connectcast.tv/live",
                          playpath=match.group(1),
                          live=True)

            return dict(live=RTMPStream(self.session, params))

__plugin__ = ConnectCast
