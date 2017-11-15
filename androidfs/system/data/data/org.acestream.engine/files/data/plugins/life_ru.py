#-plugin-sig:RH03aHgiSALoPxVbSU8jVbqBS309gYLuKXjTZwi8XmJ4GEvG0fzri0XIbADu/2DovxrP0j6kpUpjFjdoz57sCFOAB+XLruY1Y/gvi+yZhQKeHRHL3MKgkhIkxhMHDignfjXY142XEMGoPKZor+lVw93OwtZ7MLt0hT4yMdr9iZ61DDUZ+Knx8urQMwSJo0kVC4v/jfJXuSAx03++evhqKoSetw1RQAgLPZc31s0q2Bg1Sf+MTFoOcTDtB8WmHMDBYtDnBztWO88Osy9D06YLFoOWtcRbpILIQzrvm3XnUC9hsKOyMXgooQyzdVonyFzOxRBNx7Chfl9yqXrldWo8gg==
import re

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin, PluginError
from ACEStream.PluginsContainer.livestreamer.plugin.api import http
from ACEStream.PluginsContainer.livestreamer.stream import HTTPStream, HLSStream

# https://embed.life.ru/video/dc020486e0248fd466cc4c153c92b1a1
_url_re = re.compile(r"http(s)?:\/\/(?:www\.)?(embed\.)life\.ru\/video\/(?P<id>[a-z,A-Z,0-9]+)")
# "original":"https://static.life.ru/dc020486e0248fd466cc4c153c92b1a1.mp4"
_direct_url = re.compile(r"\"original\":\"(?P<url>http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\(\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+)\"")
# User-agent to use for http requests
USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.82 Safari/537.36'

class life_ru(Plugin):
    @classmethod
    def can_handle_url(cls, url):
        return _url_re.match(url)

    def _get_streams(self):
        match = _url_re.match(self.url)
        videoid = match.group('id')

        # Set header data for user-agent
        hdr = {'User-Agent': USER_AGENT}
        
        # Parse video ID from data received from supplied URL
        res = http.get(self.url, headers=hdr)

        if not res:
            return {}

        for match in re.findall(_direct_url, res.text):
            try:
                return {"original" : HTTPStream(self.session, match)}
            except Exception as e:
                self.logger.error("Failed to extract video url: {0}", e)
                
                return {}
__plugin__ = life_ru
