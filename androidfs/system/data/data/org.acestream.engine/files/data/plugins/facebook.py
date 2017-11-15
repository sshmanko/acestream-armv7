#-plugin-sig:SPqmmxqEioOfeS09AvinJJrjqKG+0bWkTFbOIOKFAw0XnyVa9j4iwtcaHT3KhdleQaWufDZrQ5C0Tw3Jjp4KPxt//MK4Oex/71zqgWmhIGeJfN0iRroTovVdcuB5QTEg3hw9ddGbmOtHbX99qkJ92AGO4PCbRuU3lQuUJemoPuf2AH6rFlYbQLTC28B/USEhV75ySlp/BpmVwJgDKfyxOvPVzHnlcdFQms/Z72qrQZAiwkkYdSKqkOz7FJi/1VhTVe/wmTkwCkK6Est3V04FOVB5gi/C1/4wKrmMqjKnTjsF36p0QA5gu40bs35eyMK0Ely4wsgSpo9H45YN283W6A==
import re

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.stream import HLSStream

_playlist_url = "https://www.facebook.com/video/playback/playlist.m3u8?v={0}"

_url_re = re.compile(r"http(s)?://(www\.)?facebook\.com/[^/]+/videos/(?P<video_id>\d+)")


class Facebook(Plugin):
    @classmethod
    def can_handle_url(cls, url):
        return _url_re.match(url)

    def _get_streams(self):
        match = _url_re.match(self.url)
        video = match.group("video_id")

        playlist = _playlist_url.format(video)

        return HLSStream.parse_variant_playlist(self.session, playlist)

__plugin__ = Facebook
