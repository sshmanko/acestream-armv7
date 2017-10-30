#-plugin-sig:d+Bj+QNyJ4xRZS+8DYtAJ2U+K07QydG7yg8G2VDJYVK85PB2QHzLBIPLHTZGmohvTucfSXiMJ0/ItrU9C6x+BUKoS+MXFRA5M2HlXSWTvlVY121m/sTN2YI4lekukxg3fvHc6rTi+yxQs9VTV7uNge9OrUqKCD+WNG4eIDSWj/Rhk0+dUiBADxE40V65ztgV10X8vRuvBsaNIq+z+KAdoR3yaQTjsTNaFvk5lSA4ZuSOGk5a3tOWNjqED2RQcgjFeGhcMGT4gbIg1C/WTpm+J/wf+Djl3Al1dhyWgVX1IKAgWfLZkbwJh7NmA0Oi3oungztkUH7plS+pu/XJh318iw==
import re

from random import random

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin, PluginError
from ACEStream.PluginsContainer.livestreamer.plugin.api import http, validate
from ACEStream.PluginsContainer.livestreamer.stream import HTTPStream, RTMPStream

API_CLIENT_NAME = "Bambuser AS2"
API_CONTEXT = "b_broadcastpage"
API_KEY = "005f64509e19a868399060af746a00aa"
API_URL_VIDEO = "http://player-c.api.bambuser.com/getVideo.json"

_url_re = re.compile("http(s)?://(\w+.)?bambuser.com/v/(?P<video_id>\d+)")
_video_schema = validate.Schema({
    validate.optional("error"): validate.text,
    validate.optional("result"): {
        "id": validate.text,
        "size": validate.text,
        "url": validate.url(
            scheme=validate.any("rtmp", "http")
        )
    }
})


class Bambuser(Plugin):
    @classmethod
    def can_handle_url(self, url):
        return _url_re.match(url)

    def _get_streams(self):
        match = _url_re.match(self.url)
        video_id = match.group("video_id")
        params = {
            "client_name": API_CLIENT_NAME,
            "context": API_CONTEXT,
            "raw_user_input": 1,
            "api_key": API_KEY,
            "vid": video_id,
            "r": random()
        }
        res = http.get(API_URL_VIDEO, params=params)
        video = http.json(res, schema=_video_schema)

        error = video.get("error")
        if error:
            raise PluginError(error)

        result = video.get("result")
        if not result:
            return

        url = result["url"]
        if url.startswith("http"):
            stream = HTTPStream(self.session, url)
        elif url.startswith("rtmp"):
            stream = RTMPStream(self.session, {
                "rtmp": url,
                "playpath": result["id"],
                "pageUrl": self.url,
                "live": True
            })

        width, height = result["size"].split("x")
        name = "{0}p".format(height)

        return {name: stream}


__plugin__ = Bambuser
