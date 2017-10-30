#-plugin-sig:ctNhZXCl8m0Z1B43tH8vc0hvdQi7vfGQ2akjwbGyM2/ropk9TDnICVzslt/sBkhk2vgQ7HetXVV6DfPaG9pbEDhvmWWqxbWhGTFrC79bbSKa0ZIGP5N8brP/lsP0ZxXU0jr4BJReQsEvlkcZcjiEPm8dT/HQDiXk62NYAazXBhhUiWtvaK3ancSPcLqS4ZKzolvvbbmQASFHRrdsfsfEMFw/efRKHDUEBXxm98I+apPq2wgWcAbZRwRAC35i1NvN/XUz85BSB/0pPb5dv4sC2fv5HsJfnEDi5vdySpqF865TASEuQVIZ9fhI7pWPtiubq09ACLFLfRO8fAdxcVXZwg==
import re

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http
from ACEStream.PluginsContainer.livestreamer.stream import HLSStream

_RE_URL = re.compile('^https?://streamboat.tv/.+')
_RE_CDN = re.compile(r'"cdn_host"\s*:\s*"([^"]+)"')
_RE_PLAYLIST = re.compile(r'"playlist_url"\s*:\s*"([^"]+)"')


class StreamBoat(Plugin):

    @classmethod
    def can_handle_url(cls, url):
        return bool(_RE_URL.match(url))

    def _get_streams(self):
        res = http.get(self.url)
        text = res.text
        cdn = _RE_CDN.search(text).group(1)
        playlist_url = _RE_PLAYLIST.search(text).group(1)
        url = 'http://{}{}'.format(cdn, playlist_url)
        return dict(source=HLSStream(self.session, url))

__plugin__ = StreamBoat
