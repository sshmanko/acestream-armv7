#-plugin-sig:nxKn3qSj3u8dietuDnQprLMbaEPyi7iXLY5o2MQ2rz2c4pO9VTE181iaeM2VJlhmSRcdyjumUYca2AfQ6srq75V0/0VJCJXHmzjBfJYvslXQLWYyoLqre1S1vd2IRe1KIo3cOEiLs8m9ai0lQ7Iq5aeGyl/ZGaOUxzy3lk9dIR1Zpc6+ZZIIM2pySSs1CPmNpL/9VHGLXO+n1bVGfHb6mZ9oCM2b7iwge72TEk5gAV4xi8x7zPbJe4wokwv/cOB9p3vXcRBUTSR07MzLk8ogcMmoD3UpgeCg3OlzFiQV0wLknXQHplYKAPloua7/ATzz+TIjsVWAeGPRuOVUUzMcVg==
import re

from ACEStream.PluginsContainer.livestreamer.compat import urlparse
from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import StreamMapper, http, validate
from ACEStream.PluginsContainer.livestreamer.stream import HLSStream, RTMPStream

CHANNEL_URL = "http://www.mobileonline.tv/channel.php"

_url_re = re.compile("http(s)?://(\w+\.)?(ilive.to|streamlive.to)/.*/(?P<channel>\d+)")
_link_re = re.compile("<a href=(\S+) target=\"_blank\"")
_schema = validate.Schema(
    validate.transform(_link_re.findall),
)


class StreamLive(Plugin):
    @classmethod
    def can_handle_url(self, url):
        return _url_re.match(url)

    def _create_hls_streams(self, url):
        try:
            streams = HLSStream.parse_variant_playlist(self.session, url)
            return streams.items()
        except IOError as err:
            self.logger.warning("Failed to extract HLS streams: {0}", err)

    def _create_rtmp_stream(self, url):
        parsed = urlparse(url)
        if parsed.query:
            app = "{0}?{1}".format(parsed.path[1:], parsed.query)
        else:
            app = parsed.path[1:]

        params = {
            "rtmp": url,
            "app": app,
            "pageUrl": self.url,
            "live": True
        }

        stream = RTMPStream(self.session, params)
        return "live", stream

    @Plugin.broken(315)
    def _get_streams(self):
        channel = _url_re.match(self.url).group("channel")
        urls = http.get(CHANNEL_URL, params=dict(n=channel), schema=_schema)
        if not urls:
            return

        mapper = StreamMapper(cmp=lambda scheme, url: url.startswith(scheme))
        mapper.map("http", self._create_hls_streams)
        mapper.map("rtmp", self._create_rtmp_stream)

        return mapper(urls)

__plugin__ = StreamLive
