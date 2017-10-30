#-plugin-sig:EeZNaxHo1lM5dtEk5yv0vZIei8S083L8BLHcBC+L0dDc36GsFmeAiWCcKD0nNWK1zAFj4h9iqqYa/c6Ls23mv92t2DLz1XQHcqdXOROiiBlDB4mnNu+CQ8Fd2+AXuuEdARoGi7xkhMxkc0eFkD2NpptywPJu+I2hAYAk15uon3ZzhoyiyN5Nu3WzOgElD6PtSSEpU2SGkDkJzF9cp73Df2iiZ3IxhnWuMvrdsxqlmE6KLGilhmDwlQQB0rbYI1FRkDrvBBdtWq5Y+OKUxpItOBGVsnRTzyg301eUjxCck0wAcUKRcEmU4MYDIZuwwDtWt9/m8ULVdU8e7orFR8d69A==
import json
import re

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http
from ACEStream.PluginsContainer.livestreamer.plugin.api import validate
from ACEStream.PluginsContainer.livestreamer.stream import HLSStream
from ACEStream.PluginsContainer.livestreamer.utils import parse_json


class WebTV(Plugin):
    _url_re = re.compile("http(?:s)?://(\w+)\.web.tv/?")
    _sources_re = re.compile(r'"sources": (\[.*?\]),', re.DOTALL)
    _sources_schema = validate.Schema([
        {
            u"src": validate.text,
            u"type": validate.text,
            u"label": validate.text
        }
    ])

    @classmethod
    def can_handle_url(cls, url):
        return cls._url_re.match(url) is not None

    def _get_streams(self):
        """
        Find the streams for web.tv
        :return:
        """
        headers = {}
        res = http.get(self.url, headers=headers)
        headers["Referer"] = self.url

        sources = self._sources_re.findall(res.text)
        if len(sources):
            sdata = parse_json(sources[0], schema=self._sources_schema)
            for source in sdata:
                self.logger.debug("Found stream of type: {}", source[u'type'])
                if source[u'type'] == u"application/vnd.apple.mpegurl":
                    # if the url has no protocol, assume it is http
                    url = source[u"src"]
                    if url.startswith("//"):
                        url = "http:" + url

                    try:
                        # try to parse the stream as a variant playlist
                        variant = HLSStream.parse_variant_playlist(self.session, url, headers=headers)
                        if variant:
                            for q, s in variant.items():
                                yield q, s
                        else:
                            # and if that fails, try it as a plain HLS stream
                            yield 'live', HLSStream(self.session, url, headers=headers)
                    except IOError:
                        self.logger.warning("Could not open the stream, perhaps the channel is offline")

__plugin__ = WebTV
