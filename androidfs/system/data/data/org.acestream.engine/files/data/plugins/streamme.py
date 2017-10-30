#-plugin-sig:nYBmktewT3PgN5VpyW/2hr1j6xhGjwLjP5KqItbAR3IdHjckYbyOh+AjB8RQobjlgrpkI34tg2391OWWAUkGrVdNiWiF9VcH9gE8d7LA1Ex5CC/ka1AbSqBRJkPA2XKyRUWucdkIwXUsL0maHbvcPbgnBTeO6NmM85Vz0boNN8kMyUkONIcE97/KLjIpdcE8pv42fmMM5MXRfx9xCIFQlgcgL7GooEicda8SKgPSETCT6VKcdK9+TeS9JD1w8asFGvh/V4UT1WOVj68ZJnuP8n5lYE0cc7uNKxMjU8HzRVgkoKgxu/jHKIZ+Y/5gBc0DVHQuQCES6Nrey3ZJ/z7Dlw==
import re

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http
from ACEStream.PluginsContainer.livestreamer.stream import HLSStream

_RE_URL = re.compile(r'^https?://(?:www.)stream.me/(\w+).*$')


class StreamMe(Plugin):

    @classmethod
    def can_handle_url(cls, url):
        return bool(_RE_URL.match(url))

    def _get_streams(self):
        username = _RE_URL.match(self.url).group(1)
        url = 'https://www.stream.me/api-user/v1/{}/channel'.format(username)
        data = http.get(url).json()
        try:
            m3u8 = data['_embedded']['streams'][0]['_links']['hlsmp4']['href']
            return HLSStream.parse_variant_playlist(self.session, m3u8)
        except KeyError:
            return {}

__plugin__ = StreamMe
