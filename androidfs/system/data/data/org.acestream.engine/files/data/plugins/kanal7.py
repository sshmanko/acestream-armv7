#-plugin-sig:FYqlUpgrGZKf4S5pa8HKsoS2wgyfmPgihFuw6Vl4CHtkFeNSypo0xgl8Y3Oijm4c2MJSfA93oxoGnSakH0/wlJB7PMWOgzVRLqZPh7OLHDlI0wZOSFp9yvnEIt9NalFFWXz0ip7AU5BZyeGZySzxHlK0yTIDKCLScZTo+XjHUc52s24tji4k4tphvfbTSjyXG2ipt4+5q1fikabjRJKoj7zprGVc9EqqaKXrk3/+yvzpX/OL49zfOUpyQYEUSJkRexnu8AHcMGjN+ehHAXCvRSkXZgEKXMdjClrCU1pfEMG1QkTIOte44Em7qlqhbTOsVZq7pUZdGowy8UDRFdpAkQ==
from __future__ import print_function
import re

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http
from ACEStream.PluginsContainer.livestreamer.plugin.api import validate
from ACEStream.PluginsContainer.livestreamer.stream import HLSStream


class Kanal7(Plugin):
    url_re = re.compile(r"https?://(?:www.)?kanal7.com/canli-izle")
    data_re = re.compile(r'''videoPlayer.setup\(\{\s*file:\s*"(http[^"]*?)"''', re.DOTALL)

    @classmethod
    def can_handle_url(cls, url):
        return cls.url_re.match(url) is not None

    def _get_streams(self):
        res = http.get(self.url)
        data_m = self.data_re.search(res.text)
        if data_m:
            stream_url = data_m.group(1)
            self.logger.debug("Found stream: {}", stream_url)
            yield "live", HLSStream(self.session, stream_url)


__plugin__ = Kanal7
