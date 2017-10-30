#-plugin-sig:FYqfjOFnaFV6JRGg7vAI0SvbAjPKlomTg1haSv+CC4ZcAktnqrsIG8wqnQW7jITw9g0hUp3f2TuVYE+jwS6e816fIORqXA/17TEGA9M2y7SzFqr7kpemfv34qfsdwPwRiwTgHUVGUftoZ7gbRePaEzAkzfWBiHvMWlWFRzkEOpUJGJ3q/JvuEQJqetB/hawoRkg8fPBr8L+TiVaggOkTUR82ln0QhqTSyB+Ap5brKudzMx6ZPo7Cw7kLoPnH2CL+g0aetLE70yNJCttOG8rEY/M0c/CjjMNMG0lrV+8uSOe0yjem/COOP1I+n2n5eF04fVk0IWRUeO3ssReRCj9uAA==
import re

from ACEStream.PluginsContainer.livestreamer.compat import urljoin
from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http, validate
from ACEStream.PluginsContainer.livestreamer.stream import RTMPStream, HLSStream

_url_re = re.compile("http(s)?://(\w+\.)?streamup.com/(?P<channel>[^/?]+)")
_hls_manifest_re = re.compile('HlsManifestUrl:\\s*"//"\\s*\\+\\s*response\\s*\\+\\s*"(.+)"')

class StreamupCom(Plugin):
    @classmethod
    def can_handle_url(cls, url):
        return _url_re.match(url)

    def _get_streams(self):
        res = http.get(self.url)
        if not res: return
        match = _hls_manifest_re.search(res.text)
        url = match.group(1)
        hls_url = "http://video-cdn.streamup.com{}".format(url)
        return HLSStream.parse_variant_playlist(self.session, hls_url)

__plugin__ = StreamupCom
