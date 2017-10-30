#-plugin-sig:lJ3o+pvffOC3rOmgOu5Ux9WjSydz7kZo4QvD79x/F/dzTuMhZala6Q/2HC+UCTh9C/2+nxIa+XJeI8CmyV+UJD3zz7hXEFeKrAyYREHiGR7Tm5sLQF2UHDGCWa8goHyLyOggGUEtA0E5mUJVRWKQxo3ti9UpEC00zdeBz8j3VMWQTb5UYd7clnRcSsWTFqk5Ofc+JG4x7X/SI6hYiYAfTs8uaR/6qe5kYb4URHpQqCtWM91WrL+wvADg+1ScIsWn8pFP+XgsXPoEguFMdgJTn7COBDvYsx7e7cYMYTfAm8eHiZhMkWOIfVDioz0OJndI6OWOIfv/vo3p276UyA2EBw==
import re

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin, PluginError
from ACEStream.PluginsContainer.livestreamer.plugin.api import http
from ACEStream.PluginsContainer.livestreamer.stream import HLSStream

# The last four channel_paths repsond with 301 and provide
# a redirect location that corresponds to a channel_path above.
_url_re = re.compile(r"""
    https?://www\.rtve\.es/
    (?P<channel_path>
        directo/la-1|
        directo/la-2|
        directo/teledeporte|
        directo/canal-24h|

        noticias/directo-la-1|
        television/la-2-directo|
        deportes/directo/teledeporte|
        noticias/directo/canal-24h
    )
    /?
""", re.VERBOSE)

_id_map = {
    "directo/la-1": "LA1",
    "directo/la-2": "LA2",
    "directo/teledeporte": "TDP",
    "directo/canal-24h": "24H",
    "noticias/directo-la-1": "LA1",
    "television/la-2-directo": "LA2",
    "deportes/directo/teledeporte": "TDP",
    "noticias/directo/canal-24h": "24H",
}


class Rtve(Plugin):
    @classmethod
    def can_handle_url(cls, url):
        return _url_re.match(url)

    def __init__(self, url):
        Plugin.__init__(self, url)
        match = _url_re.match(url).groupdict()
        self.channel_path = match["channel_path"]

    def _get_streams(self):
        stream_id = _id_map[self.channel_path]
        hls_url = "http://iphonelive.rtve.es/{0}_LV3_IPH/{0}_LV3_IPH.m3u8".format(stream_id)

        # Check if the stream is available
        res = http.head(hls_url, raise_for_status=False)
        if res.status_code == 404:
            raise PluginError("The program is not available due to rights restrictions")

        return HLSStream.parse_variant_playlist(self.session, hls_url)

__plugin__ = Rtve
