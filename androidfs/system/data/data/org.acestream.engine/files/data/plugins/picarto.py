#-plugin-sig:VYvgm/cO7VxSMuQ6MTU1XRGVT7BojNB3y7BRiNIdMucy+GlV7hWcp37hVFibQeYtCD52kMcy6OY5gVUwcuhqZD+SjdNJY4HMPzT70KsDHletHpsRXk3upSePHDGs7xnP7W50rbM3x0/cayvLl1kM18T6gFQ/1mwHffLXfHcYytRv1jqQ0LW8myMwS5tk1dIxCOuWE4oQRQayfe7zfVqeuhXkOkwp+nYM+mgS00HEMMpVQh0fAAeLyOz7FZWA47HNXsyDqU4NH+WnL7HfgJhZFAFA0i9HNy2xOo2zb1Evr5hUrC64SylBBRawS83vDObI10gzDJgFJKJRS3Bifp3zdw==
import re

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http
from ACEStream.PluginsContainer.livestreamer.stream import HLSStream
from ACEStream.PluginsContainer.livestreamer.stream import RTMPStream

API_CHANNEL_INFO = "https://picarto.tv/process/channel"
RTMP_URL = "rtmp://{}:1935/play/"
RTMP_PLAYPATH = "golive+{}?token={}"
HLS_URL = "https://{}/hls/{}/index.m3u8?token={}"

_url_re = re.compile(r"""
    https?://(\w+\.)?picarto\.tv/[^&?/]
""", re.VERBOSE)

# placeStream(channel, playerID, product, offlineImage, online, token, tech)
_channel_casing_re = re.compile(r"""
    <script>\s*placeStream\s*\((.*?)\);?\s*</script>
""", re.VERBOSE)


class Picarto(Plugin):
    @classmethod
    def can_handle_url(cls, url):
        return _url_re.match(url) is not None

    @staticmethod
    def _get_stream_arguments(page):
        match = _channel_casing_re.search(page.text)
        if not match:
            raise ValueError

        # transform the arguments
        channel, player_id, product, offline_image, online, visibility, is_flash = \
            map(lambda a: a.strip("' \""), match.group(1).split(","))
        player_id, product, offline_image, online, is_flash = \
            map(lambda a: bool(int(a)), [player_id, product, offline_image, online, is_flash])

        return channel, player_id, product, offline_image, online, visibility, is_flash

    def _get_streams(self):
        page = http.get(self.url)

        try:
            channel, _, _, _, online, visibility, is_flash = self._get_stream_arguments(page)
        except ValueError:
            return

        if not online:
            self.logger.error("This stream is currently offline")
            return

        channel_server_res = http.post(API_CHANNEL_INFO, data={
            "loadbalancinginfo": channel
        })

        if is_flash:
            return {"live": RTMPStream(self.session, {
                "rtmp": RTMP_URL.format(channel_server_res.text),
                "playpath": RTMP_PLAYPATH.format(channel, visibility),
                "pageUrl": self.url,
                "live": True
            })}
        else:
            return HLSStream.parse_variant_playlist(self.session,
                                                    HLS_URL.format(channel_server_res.text, channel, visibility),
                                                    verify=False)

__plugin__ = Picarto
