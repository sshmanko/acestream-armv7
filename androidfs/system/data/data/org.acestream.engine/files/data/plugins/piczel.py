#-plugin-sig:IeSP1DUEApCIvqv42JyrjJXKrvluI9mYzXq2aqK+4pHutvpBhkE9g056Dbm1KeTe+QuNNDR0c9CVeFmfskTTMMADfzciHuCc6x9xIkI0BUxDJPS6Tt9W2zJUdHb1pDTP125+Z9UiMrz7eZUyj7nPak+XPfJAuth6SvNxYHHh8XEdV6EOPavNCele3w1JMyAekaO9mebNz/gJIXN1NOfJ4y1M4oJ23y2mojypev6M3Cq/Y/4fcdYlwmTzZuektLz0skgq40ivQMoIApgFUkimHp8x2cdjNpzmvtXSB1S2pO8oaGblXOfANZBCY8+s7mcCVfLy7TntZdzND05tF1rwmQ==
import re

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http, validate
from ACEStream.PluginsContainer.livestreamer.stream import RTMPStream, HLSStream

STREAMS_URL = "https://piczel.tv:3000/streams/{0}?&page=1&sfw=false&live_only=true"
HLS_URL = "https://5810b93fdf674.streamlock.net:1936/live/{0}/playlist.m3u8"
RTMP_URL = "rtmp://piczel.tv:1935/live/{0}"

_url_re = re.compile("https://piczel.tv/watch/(\w+)")

_streams_schema = validate.Schema(
	{
		"type": validate.text,
		"data": [
			{
				"id": int,
				"live": bool,
				"slug": validate.text
			}
		]
	}
)

class Piczel(Plugin):
	@classmethod
	def can_handle_url(cls, url):
		return _url_re.match(url)

	def _get_streams(self):
		match = _url_re.match(self.url)
		if not match:
			return

		channel_name = match.group(1)

		res = http.get(STREAMS_URL.format(channel_name))
		streams = http.json(res, schema=_streams_schema)
		if streams["type"] not in ("multi", "stream"):
			return

		for stream in streams["data"]:
			if stream["slug"] != channel_name:
				continue

			if not stream["live"]:
				return

			streams = {}

			try:
				streams.update(HLSStream.parse_variant_playlist(self.session, HLS_URL.format(stream["id"])))
			except IOError as e:
				# fix for hosted offline streams
				if "404 Client Error" in str(e):
					return
				raise

			streams["rtmp"] = RTMPStream(self.session, {
				"rtmp": RTMP_URL.format(stream["id"]),
				"pageUrl": self.url,
				"live": True
			})

			return streams

		return

__plugin__ = Piczel
