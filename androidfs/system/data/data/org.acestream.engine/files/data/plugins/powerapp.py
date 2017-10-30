#-plugin-sig:Pfmc/Dirl0JHjA4k2+RBwRiHNAhatVme0JXyVAUGzzd9jPEQgPNySEDB2qMuGZAEb+NrhUy+VjZvUlfcnsDbQNAfQYZnu/Ud1gEM4SFNMX+Qcxv9h3ZvxBRTy4ldh1w6Lp+DCCqL5rD/XzygZP9qvDD4agCutbqedL8G+JTQnuRTVdpN7UX2dy4oArB6LTtkncondaaC25Lr3fuSo58fVVIjvWbyVPcEDBocnbb887kpMe6x+GlFe7PPy1XbaRrz9nXrY8L254P0O/AyQWUuz1jX5X92gS1Yn8SAwaFzHjqWdqw0tgRNpDrIgRguxfIWbftv4r6cE3teUeflE3zOsA==
from __future__ import print_function
import re

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http
from ACEStream.PluginsContainer.livestreamer.plugin.api import validate
from ACEStream.PluginsContainer.livestreamer.stream import HLSStream


class PowerApp(Plugin):
    url_re = re.compile(r"https?://(?:www.)?powerapp.com.tr/tv/(\w+)")
    api_url = "http://api.powergroup.com.tr/Channels/{}/?appRef=iPowerWeb&apiVersion=11"
    api_schema = validate.Schema(validate.all({
        "errorCode": 0,
        "response": {
            "channel_stream_url": validate.url()
        }
    }, validate.get("response")))

    @classmethod
    def can_handle_url(cls, url):
        return cls.url_re.match(url) is not None

    def _get_streams(self):
        channel = self.url_re.match(self.url).group(1)

        res = http.get(self.api_url.format(channel))
        data = http.json(res, schema=self.api_schema)

        return HLSStream.parse_variant_playlist(self.session, data["channel_stream_url"])


__plugin__ = PowerApp
