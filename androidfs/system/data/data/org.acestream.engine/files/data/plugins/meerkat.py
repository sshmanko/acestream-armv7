#-plugin-sig:Tb0DhHdAwmZoFHoqkjfh0zQRguOaZHiYIJuiilB8bYQjNH7c4IkSX2JhU3B4GT1H5myGFtj3EWBp5Np755BAUUm2ZfJYfIDBIqRvO/Kxb7sQTM7QbTJpd8TefN4ubZOvoiQodwmn8Qx9u8Yluq+/iOnKO92jMtw2tOtTli36KB5JldeLVa9xiGApW4/gFI7MXsmCgcZOLb7bGF20Slk7IhQicJWNPH26Dz/A37OI651GFmH/bOk1YfgY5vy9oLnE5F1OmKqrJM8mYAGWvcINn/KktNtmzC2plqCWw0jCsRWnnafKYBl+b9uUpMpqHqqWhaKHvPAfWuqjF3bbF8J8lw==
import re

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.stream import HLSStream


_url_re = re.compile(r"http(s)?://meerkatapp.co/(?P<user>[\w\-\=]+)/(?P<token>[\w\-]+)")


class Meerkat(Plugin):
    @classmethod
    def can_handle_url(cls, url):
        return _url_re.match(url)

    def _get_streams(self):
        match = _url_re.match(self.url)
        if not match:
            return

        streams = {}
        streams["live"] = HLSStream(self.session, "http://cdn.meerkatapp.co/broadcast/{0}/live.m3u8".format(match.group("token")))

        return streams


__plugin__ = Meerkat
