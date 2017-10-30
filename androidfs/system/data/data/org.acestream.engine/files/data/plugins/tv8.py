#-plugin-sig:O1sWOvLnrTMOmJmvkP8hg5L3hzYXsbhXA/THNFunjwPUI7nvPrCEHW+Ax3xPG1tp7ZdDLboudjdolTtefr92+GOYK12IIfU/pwGerXkwvQNpiter0i63qhbMOi3xgdxXtbHzwX8FJoXxfWYwNGy59sNEAMuEkmz/GogqJThjNv6wxQWTv9eOzJmU/XkAUR7KRwMlYzkNa0b8Y4PX65X6ZqiciNSEV1uG00d/yMMYntSnbRi0og/oTKRRblqJtHs5QmnfSW1tPUVRKIH82i/iKjOJbAiZ0CIgIaFkPp/4FqeAwUECQnir1yPFYI5tV3EguPigiZY0i8C0zGR+P33qyg==
from __future__ import print_function
import re

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http
from ACEStream.PluginsContainer.livestreamer.plugin.api import validate
from ACEStream.PluginsContainer.livestreamer.stream import HLSStream


class TV8(Plugin):
    """
    Support for the live stream on www.tv8.com.tr
    """
    url_re = re.compile(r"https?://www.tv8.com.tr/canli-yayin")

    player_config_re = re.compile(r"""
        configPlayer.source.media.push[ ]*\(
        [ ]*\{[ ]*'src':[ ]*"(.*?)",
        [ ]*type:[ ]*"application/x-mpegURL"[ ]*}[ ]*\);
    """, re.VERBOSE)
    player_config_schema = validate.Schema(
        validate.transform(player_config_re.search),
        validate.any(
            None,
            validate.all(
                validate.get(1),
                validate.url()
            )
        )
    )

    @classmethod
    def can_handle_url(cls, url):
        return cls.url_re.match(url) is not None

    def _get_streams(self):
        res = http.get(self.url)
        stream_url = self.player_config_schema.validate(res.text)
        if stream_url:
            return HLSStream.parse_variant_playlist(self.session, stream_url)


__plugin__ = TV8
