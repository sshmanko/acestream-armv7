#-plugin-sig:nE2K3kHskCh9SedhCAC93WIiXaG8MzK0AKzy6UDPfryA27YAmZTibxqQTN/Mrk2qQkQMTv/QsVrqh2aKqvHdubBlafwuYU92tw2qcfW6hUoWrVJnxpJPH69FzT893Mtfq5nyp0B7dbv+bco4rXq1IsAkcy+qYpmpNiyql6yocHg7wcXR89j4ZmevWPMzsZMGZk61fgd5s9YYQRbo60iefe4Wy1NKcMoIZyW6VwWdmRM6ql8eVQSc3srWgNxkTs9BDPhukRpmtDP0je2guUOOtfWULjrdctkA46rDqZ2IChKDNMJROhbLotPFfnbzAxDXTKts6Wx1RhWaKfi4RWwlXA==
from ACEStream.PluginsContainer.livestreamer.compat import urlparse
from ACEStream.PluginsContainer.livestreamer.exceptions import PluginError
from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.stream import (AkamaiHDStream, HDSStream, HLSStream,
                                 HTTPStream, RTMPStream)

import ast
import re

PROTOCOL_MAP = {
    "akamaihd": AkamaiHDStream,
    "hds": HDSStream.parse_manifest,
    "hls": HLSStream,
    "hlsvariant": HLSStream.parse_variant_playlist,
    "httpstream": HTTPStream,
    "rtmp": RTMPStream,
    "rtmpe": RTMPStream,
    "rtmps": RTMPStream,
    "rtmpt": RTMPStream,
    "rtmpte": RTMPStream
}
PARAMS_REGEX = r"(\w+)=({.+?}|\[.+?\]|\(.+?\)|'(?:[^'\\]|\\')*'|\"(?:[^\"\\]|\\\")*\"|\S+)"

class StreamURL(Plugin):
    @classmethod
    def can_handle_url(self, url):
        parsed = urlparse(url)

        return parsed.scheme in PROTOCOL_MAP

    def _parse_params(self, params):
        rval = {}
        matches = re.findall(PARAMS_REGEX, params)

        for key, value in matches:
            try:
                value = ast.literal_eval(value)
            except Exception:
                pass

            rval[key] = value

        return rval

    def _get_streams(self):
        parsed = urlparse(self.url)
        cls = PROTOCOL_MAP.get(parsed.scheme)

        if not cls:
            return

        split = self.url.split(" ")
        url = split[0]
        urlnoproto = re.match("^\w+://(.+)", url).group(1)

        # Prepend http:// if needed.
        if cls != RTMPStream and not len(urlparse(urlnoproto).scheme):
            urlnoproto = "http://{0}".format(urlnoproto)

        params = (" ").join(split[1:])
        params = self._parse_params(params)

        if cls == RTMPStream:
            params["rtmp"] = url

            for boolkey in ("live", "realtime", "quiet", "verbose", "debug"):
                if boolkey in params:
                    params[boolkey] = bool(params[boolkey])

            stream = cls(self.session, params)
        elif cls == HLSStream.parse_variant_playlist or cls == HDSStream.parse_manifest:
            try:
                streams = cls(self.session, urlnoproto, **params)
            except IOError as err:
                raise PluginError(err)

            return streams
        else:
            stream = cls(self.session, urlnoproto, **params)

        return dict(live=stream)


__plugin__ = StreamURL
