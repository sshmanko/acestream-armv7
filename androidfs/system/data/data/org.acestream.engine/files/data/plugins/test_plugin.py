#-plugin-sig:E0XZW6X5BGUsNe6MrioYxM855MFshxF5Ig4XR6e2LcIAGWT47BaOTyv1HjjGS7YzYKrahWV65uSPSYx3Gwn5PE7+UeNQie6i6axel4QiXfF134vfkzbKSURKD3jN5cJOw/7wyVPU2vzdReInmDRMTJCPvsD2JebmUsR9o1KfWZh3ev1WhN3mmBU2IOJWp9iinXMauUuV2hscfb5mx2KOApTwGAFqhk/TdIQHffMqbcAE9a/S+flbLGyKFqS4YSxOASikalRK+jJqPpLQGHbaOkgL+DBhtPdCJlkySYqCV0tI2dCOwaZ9d5AuL2ZOL9r1xPY6NlnKYKMl3dS8P7WcSg==
import re
import time

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http

_url_re = re.compile("http(s)?://acestream\\.net/test/plugin")

class TestPlugin(Plugin):
    @classmethod
    def can_handle_url(self, url):
        return _url_re.match(url)

    def _get_streams(self):
        # sleep and return youtube vod
        time.sleep(3.0)
        url = "https://youtu.be/scWpXEYZEGk"
        return self.session.streams(url)


__plugin__ = TestPlugin
