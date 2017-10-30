#-plugin-sig:YuIi0eXEjJ0bA+v861i8jvdgCuyqLctKN65OQKez6yjdemM9eh0Q29+S5LTgungTgVS+QL4iwXvSjrYf5ho3xOVYK/C9nY/tYph7oXva7IZ7iAwSLLHVjYuI0OzT8lyktTj4HaAnENChYHNOlOWRQsyxtSUNzF7wtWSQ0JpUbacgWcGEQ3y9ER1VSKIZLlvgvUW+N7dDWYfAchsniDgqo8MRwIuj0rpwtStryf64L/CvW2Az0Q0vip+7FNnIO5ki4pqmAWx6rcJgOEudAVG2o7gbu9McjB6MyWXpf4ZKrc9cYv+1Ou8eaxfUeOW3wmfdTsqhDXUxsANLvjPLbt/hOQ==
import re

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin, PluginError
from ACEStream.PluginsContainer.livestreamer.plugin.api import http
from ACEStream.PluginsContainer.livestreamer.stream import HTTPStream

_url_re = re.compile("(http(s)?://)?blip.tv/.*-(?P<videoid>\d+)")
VIDEO_GET_URL = 'http://player.blip.tv/file/get/{0}'
SINGLE_VIDEO_URL = re.compile('.*\.((mp4)|(mov)|(m4v)|(flv))')

QUALITY_WEIGHTS = {
    "ultra": 1080,
    "high": 720,
    "medium": 480,
    "low": 240,
}

QUALITY_WEIGHTS_ULTRA = re.compile('ultra+_(?P<level>\d+)')


def get_quality_dict(quality_list):
    quality_list.sort()
    quality_dict = {}
    i = 0
    for i, bitrate in enumerate(quality_list):
        if i == 0:
            quality_dict['%i' % bitrate] = 'low'
        elif i == 1:
            quality_dict['%i' % bitrate] = 'medium'
        elif i == 2:
            quality_dict['%i' % bitrate] = 'high'
        elif i == 3:
            quality_dict['%i' % bitrate] = 'ultra'
        else:
            quality_dict['%i' % bitrate] = 'ultra+_%i' % (i-3)
    return quality_dict


class bliptv(Plugin):
    @classmethod
    def can_handle_url(cls, url):
        return _url_re.match(url)

    @classmethod
    def stream_weight(cls, key):
        match_ultra = QUALITY_WEIGHTS_ULTRA.match(key)
        if match_ultra:
            ultra_level = int(match_ultra.group('level'))
            return 1080 * (ultra_level + 1), "bliptv"
        weight = QUALITY_WEIGHTS.get(key)
        if weight:
            return weight, "bliptv"
        return Plugin.stream_weight(key)

    def _get_streams(self):
        match = _url_re.match(self.url)
        videoid = match.group('videoid')
        get_return = http.get(VIDEO_GET_URL.format(videoid))
        json_decode = http.json(get_return)
        streams = {}
        quality_list = []
        for stream in json_decode:
            if SINGLE_VIDEO_URL.match(stream['direct_url']):
                quality_list.append(int(stream['video_bitrate']))
        if len(quality_list) == 0:
            return
        quality_dict = get_quality_dict(quality_list)
        for stream in json_decode:
            if SINGLE_VIDEO_URL.match(stream['direct_url']):
                streams[quality_dict[stream['video_bitrate']]] = HTTPStream(self.session, stream['direct_url'])
        return streams

__plugin__ = bliptv
