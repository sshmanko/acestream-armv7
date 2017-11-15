#-plugin-sig:jNYmRAgphTqebdyVRuEYx/DZbFP6UEJp4J22+58sHpPfAn2HwPJKyHsi8xaMaAwcqYkpHoGRtR+mN/TEB147CGpzwOijJmdcjHjahZitFeBdfyVMMt0gvOegBX8KCBLlVceoD61PHK8zYpwxZCHwoCs1KI5NbZJjMK+SgWlsd2u0TimQddL2U65jfYftT7MWI9rBwNBQkPFvAlOmQj1cpJ/jhY6p/LdjirCKiFsSKIBmSwuRi3/eba/wTasNSxOPlg94jez8EmRKBlQ08eQhBwTOs0AVhrArgAkx6Oq5/S+N3fvXjSM4gtDbM2/7v25zC7ACEahiRn/zFlNFavGkMw==
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
        url = "https://youtu.be/-xC6b108_P4"
        return self.session.streams(url)


__plugin__ = TestPlugin
