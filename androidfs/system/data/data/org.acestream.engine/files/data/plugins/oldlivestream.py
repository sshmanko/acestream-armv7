#-plugin-sig:ZU05obbdCMmbt1xzh3WbArHSW+O3OcFkwZ131Y3Oa4aZsI4o94c6nZgRiVqrJv0zPou2hmry3edhzI7ZHAA6hZNA4OsPfGTu68Xjeer7Hd26HCe7LTXqlELIT/GT6q9B0caJkyGSQ2MnLupg/FS910FRA4+64BJuQmsnZzkBjAFH/AcktUeDl7KQsapxIZoJmlNgxeuNVjWBsa0XflGSn/lTleqqjdMa83BWTfR5TW689boM14l8YUTK9LRimrUjYYZBItSXeUWQBtqD9MlXKOcrn0oRkNoRFDMEYBzrv99jr+kTATlQwFetZai1JocNt+mMBD61+Aeau01iydIsaw==
import re

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.stream import HLSStream

PLAYLIST_URL = "http://x{0}x.api.channel.livestream.com/3.0/playlist.m3u8"

_url_re = re.compile("http(s)?://original.livestream.com/(?P<channel>[^&?/]+)")


class OldLivestream(Plugin):
    @classmethod
    def can_handle_url(self, url):
        return _url_re.match(url)

    def _get_streams(self):
        match = _url_re.match(self.url)
        channel = match.group("channel")
        channel = channel.replace("_", "-")
        playlist_url = PLAYLIST_URL.format(channel)

        return HLSStream.parse_variant_playlist(self.session, playlist_url, check_streams=True)


__plugin__ = OldLivestream
