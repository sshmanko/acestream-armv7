#-plugin-sig:U+LTWmhEZTetyKY8ZBcxK5gmc7yJi5wZ42a1b2Eq39HQMb9ONm8sTKfNJcHDrZ56TGfe/FayACsRWbQJqcoEjU5XJdRkB7ggbz62VYYmGshmE3Uo8zi+o1VW4/xsRJ60KfZ0T+9+KhrjtR5zd+B4IjxNEqM2o/29Rfhc4TfcIK1udN+8G0tfZeeFBA8g2FONhrkA6rUzgRdFX0lP0O1hB8Fxt3S6Q8vqyfQxd/9O67wOl14DYlbIQB5hsqthTcD4VQzWSHOolFbHjP4ZX00e3YE2Fr7GrwcT+M16rsl842aKm8AoMnBedsvehVNgfCO4xRyGl73AiaRo4kMNFqH9dA==
import re

from ACEStream.PluginsContainer.livestreamer.compat import urljoin
from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http, validate
from ACEStream.PluginsContainer.livestreamer.plugin.api.utils import parse_json
from ACEStream.PluginsContainer.livestreamer.stream import AkamaiHDStream, HLSStream

_url_re = re.compile("http(s)?://(www\.)?livestream.com/")
_stream_config_schema = validate.Schema({
    "event": {
        "stream_info": validate.any({
            "is_live": bool,
            "qualities": [{
                "bitrate": int,
                "height": int
            }],
            validate.optional("play_url"): validate.url(scheme="http"),
            validate.optional("m3u8_url"): validate.url(
                scheme="http",
                path=validate.endswith(".m3u8")
            ),
        }, None)
    },
    validate.optional("playerUri"): validate.text,
    validate.optional("viewerPlusSwfUrl"): validate.url(scheme="http"),
    validate.optional("lsPlayerSwfUrl"): validate.text,
    validate.optional("hdPlayerSwfUrl"): validate.text
})
_smil_schema = validate.Schema(validate.union({
    "http_base": validate.all(
        validate.xml_find("{http://www.w3.org/2001/SMIL20/Language}head/"
                          "{http://www.w3.org/2001/SMIL20/Language}meta"
                          "[@name='httpBase']"),
        validate.xml_element(attrib={
            "content": validate.text
        }),
        validate.get("content")
    ),
    "videos": validate.all(
        validate.xml_findall("{http://www.w3.org/2001/SMIL20/Language}body/"
                             "{http://www.w3.org/2001/SMIL20/Language}switch/"
                             "{http://www.w3.org/2001/SMIL20/Language}video"),
        [
            validate.all(
                validate.xml_element(attrib={
                    "src": validate.text,
                    "system-bitrate": validate.all(
                        validate.text,
                        validate.transform(int)
                    )
                }),
                validate.transform(
                    lambda e: (e.attrib["src"], e.attrib["system-bitrate"])
                )
            )
        ],
    )
}))


class Livestream(Plugin):
    @classmethod
    def default_stream_types(cls, streams):
        return ["akamaihd", "hls"]

    @classmethod
    def can_handle_url(self, url):
        return _url_re.match(url)

    # def _get_config_text(self, text):
    #     match = re.search("window.config = ({.+})", text)
    #     if match:
    #         config = match.group(1)
    #     else:
    #         config = None

    #     return config

    def _get_config_text(self, text):
        config = None

        pos = text.find("window.config = {")
        if pos >= 0:
            pos2 = text.find(";</script>", pos)
            if pos2 >= 0:
                config = text[pos+16:pos2]

        return config

    def _get_stream_info(self):
        res = http.get(self.url)

        config = self._get_config_text(res.text)
        if config:
            return parse_json(config, "config JSON",
                              schema=_stream_config_schema)

    def _parse_smil(self, url, swf_url):
        res = http.get(url)
        smil = http.xml(res, "SMIL config", schema=_smil_schema)

        for src, bitrate in smil["videos"]:
            url = urljoin(smil["http_base"], src)
            yield bitrate, AkamaiHDStream(self.session, url, swf=swf_url)

    def _get_streams(self):
        info = self._get_stream_info()
        if not info:
            return

        stream_info = info["event"]["stream_info"]
        if not (stream_info and stream_info["is_live"]):
            # Stream is not live
            return

        play_url = stream_info.get("play_url")
        if play_url:
            swf_url = info.get("playerUri") or info.get("hdPlayerSwfUrl") or info.get("lsPlayerSwfUrl") or info.get("viewerPlusSwfUrl")
            if swf_url:
                if not swf_url.startswith("http"):
                    swf_url = "http://" + swf_url

                # Work around broken SSL.
                swf_url = swf_url.replace("https://", "http://")

            qualities = stream_info["qualities"]
            for bitrate, stream in self._parse_smil(play_url, swf_url):
                name = "{0:d}k".format(int(bitrate / 1000))
                for quality in qualities:
                    if quality["bitrate"] == bitrate:
                        name = "{0}p".format(quality["height"])

                yield name, stream

        m3u8_url = stream_info.get("m3u8_url")
        if m3u8_url:
            streams = HLSStream.parse_variant_playlist(self.session, m3u8_url, namekey="pixels")

            # TODO: Replace with "yield from" when dropping Python 2.
            for stream in streams.items():
                yield stream

__plugin__ = Livestream
