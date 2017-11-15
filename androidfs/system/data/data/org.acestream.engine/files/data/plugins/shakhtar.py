#-plugin-sig:bgDY7DWi3fwE5GZYhj1rmVictYmEZY2qEoP/UNsTortaooXEi7gGfKaR/9zsXeWGdfpdayCa5uD+Uz+/CnZ4PcNGzqZbGnNDLOb/agvHNGrf9WduKW+84eZtT+SrnpPMLG8JHuw/rC4t62snd1oKXhXXPN7P7/uWzTR0lEtJWIYFh6RH1qM7SiDzg+u5DSZ46ptfQki1juKtYbPUWwbcG2GEBQmVq4mBaQB72/j56tt7N9bpKZ3mc7JD1sRedKxgm23SHmyy0chlo0c8oHNJgiqq+/x6BYXkovKE25X/YTwW4fpk/xp1aLl2vBPMLv1yULAPm3HKcnbzlzdeGe0Nvg==
import re

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin, PluginError
from ACEStream.PluginsContainer.livestreamer.plugin.api import http
from ACEStream.PluginsContainer.livestreamer.stream import HTTPStream, HLSStream

from bs4 import NavigableString, BeautifulSoup, Comment

# http://video.shakhtar.com/ru/embed/v8888
_url_re = re.compile(r"http(s)?:\/\/video\.shakhtar\.com\/.*embed\/*")
# User-agent to use for http requests
USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.82 Safari/537.36'

class shakhtar(Plugin):
    @classmethod
    def can_handle_url(cls, url):
        return _url_re.match(url)

    def _get_streams(self):
        # Set header data for user-agent
        hdr = {'User-Agent': USER_AGENT}
        
        # Parse video ID from data received from supplied URL
        res = http.get(self.url, headers=hdr)

        if not res:
            return {}

        try:
            bs = BeautifulSoup(res.text, "html5lib")
            bs = bs.find('video', {'id' : "my-video"})

            if not bs:
                return {}

            src = bs.find('source', {'data-quality' : "hd"})
            
            if not src:
                src = bs.find('video')

            if not src or not src.get('src'):
                return {}

            return {"best" : HTTPStream(self.session, src.get('src'))}
        except Exception as e:
            self.logger.error("Failed to decode player params: {0}", e)
            
            return {}

__plugin__ = shakhtar
