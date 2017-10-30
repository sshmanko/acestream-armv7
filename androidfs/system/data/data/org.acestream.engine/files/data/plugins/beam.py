#-plugin-sig:Rlcgep/LmRT4+yo8JKZ+4JT9a5AqMvoGt8aDr7D4FUbzV02qY7bjfTZNJt6DP1kEHaTZiS/9lT/vKBUUvBa5n2VF8K0qU6eGcv77/1w85EbSh4J4thMrBZs2ClN2tZb0RFdZNJ8rPQhn+XGDT/Kg9jc1RAtQrol8n8gvEPaedWMJLRAZYOpMVHpNW7uNpjuQavFX8yUBVn9UIBVirvACvItOSAuwaRa603ehMDm2iUoJXuGuINlLxoGLhHVsC6tLPwMoMJI74ERuPBuRv6JP18VOMW+NfLJOyIwigZ+ED3tdg380gLqiRI8+WF4PFtmh+1NEsXsfkcrpoEXG2I/ywg==
import re

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http, validate
from ACEStream.PluginsContainer.livestreamer.stream import RTMPStream

_url_re = re.compile("http(s)?://(\w+.)?beam.pro/(?P<channel>[^/]+)")

CHANNEL_INFO = "https://beam.pro/api/v1/channels/{0}"
CHANNEL_MANIFEST = "https://beam.pro/api/v1/channels/{0}/manifest.smil"

_assets_schema = validate.Schema(
    validate.union({
        "base": validate.all(
            validate.xml_find("./head/meta"),
            validate.get("base"),
            validate.url(scheme="rtmp")
        ),
        "videos": validate.all(
            validate.xml_findall(".//video"),
            [
                validate.union({
                    "src": validate.all(
                        validate.get("src"),
                        validate.text
                    ),
                    "height": validate.all(
                        validate.get("height"),
                        validate.text,
                        validate.transform(int)
                    )
                })
            ]
        )
    })
)

class Beam(Plugin):
    @classmethod
    def can_handle_url(self, url):
        return _url_re.match(url)

    def _get_streams(self):
        match = _url_re.match(self.url)
        channel = match.group("channel")
        res = http.get(CHANNEL_INFO.format(channel))
        channel_info = http.json(res)

        if not channel_info["online"]:
            return

        res = http.get(CHANNEL_MANIFEST.format(channel_info["id"]))
        assets = http.xml(res, schema=_assets_schema)
        streams = {}
        for video in assets["videos"]:
            name = "{0}p".format(video["height"])
            stream = RTMPStream(self.session,{
                "rtmp"     : "{0}/{1}".format(assets["base"], video["src"])
            })
            streams[name] = stream

        return streams

__plugin__ = Beam
