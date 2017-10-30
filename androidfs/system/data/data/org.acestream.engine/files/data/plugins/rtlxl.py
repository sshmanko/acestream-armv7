#-plugin-sig:NBqDGyHGYAfjiQcYklMvtH6qQf0n0KEHf0w/QAabINX1JgdnzZo/8IjH+sHgw1ixMdYaGJxoIfSrGslm4xejwXeB2z+KrMWyIT0hE3utJroCLgXdt9TwcW65JJsKzSXCy8Wq5YP+tksI8uAtUpBNkcZabz8swrqacA1+oeRso0NvfqDAJ51yRQGRuVV53PCz3s6N1AIaU4vKWWepDa3JZe2CwavVK3kiNAhWdVlvyJkd3NB+0+3oIkD0GPfLJ3Bm4qnLShE0DTvb0Vf62lweagX+L/McKROkx5w4/3ksTvYhkMoQyb+SrWgmrGecqbjIwqbLg5irWxV6ImrGfLl3NQ==
import re

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http, validate
from ACEStream.PluginsContainer.livestreamer.stream import HDSStream, HLSStream, RTMPStream

_url_re = re.compile("""http(?:s)?://(?:\w+\.)?rtlxl.nl/#!/(?:.*)/(?P<uuid>.*?)\Z""", re.IGNORECASE)

class rtlxl(Plugin):
    @classmethod
    def can_handle_url(cls, url):
        return _url_re.match(url)

    def _get_streams(self):
        match = _url_re.match(self.url)
        uuid = match.group("uuid")
        html = http.get('http://www.rtl.nl/system/s4m/vfd/version=2/uuid={}/d=pc/fmt=adaptive/'.format(uuid)).text

        playlist_url = "http://manifest.us.rtl.nl" + re.compile('videopath":"(?P<playlist_url>.*?)",', re.IGNORECASE).search(html).group("playlist_url")
        return HLSStream.parse_variant_playlist(self.session, playlist_url)

__plugin__ = rtlxl
