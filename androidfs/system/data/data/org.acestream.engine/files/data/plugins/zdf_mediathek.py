#-plugin-sig:TSqRIsfJA4iXiDWKUq7pt6T9X5qfWo4h9geKPYbq4ieaaEt6iNF38vnUSx2MdnhIJ9vPd1BRWuzsY6FD3BY9rE2hm7reJ2aYSRUUujPIxwd7Gw2njjxQ7X7Cj3exkcIr6eRD+2yEoEhfJF0VZw8u1JJs8P5boG6UHxH9T0DxePsHfOp3R0gI3xg0Ftxh23DucnzDG0O8NLmpD1HFq7pc5AKIF5llA5L7sHCwma5pt1bPwoomZwq8q6Ik5SxWsDw5etDRFvON7nQO4Gu1u4wuzzQFaoIdL0GnNoVQv8o3FH7L38I0CJzsvF26S6PU+mysCxN9WQqYpuubji9JUpVMaQ==
import re

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http, validate
from ACEStream.PluginsContainer.livestreamer.stream import HDSStream, HLSStream
from ACEStream.PluginsContainer.livestreamer.plugin.api.utils import parse_query

API_URL = "https://api.zdf.de"

QUALITY_WEIGHTS = {
    "hd": 720,
    "veryhigh": 480,
    "high": 240,
    "med": 176,
    "low": 112
}

STREAMING_TYPES = {
    "h264_aac_f4f_http_f4m_http": (
        "HDS", HDSStream.parse_manifest
    ),
    "h264_aac_ts_http_m3u8_http": (
        "HLS", HLSStream.parse_variant_playlist
    )
}

_url_re = re.compile("""
    http(s)?://(\w+\.)?zdf.de/
""", re.VERBOSE | re.IGNORECASE)

_documents_schema = validate.Schema(
    {
        "mainVideoContent": {
            "http://zdf.de/rels/target": {
                "http://zdf.de/rels/streams/ptmd": validate.text
            },
        },
    }
)

_schema = validate.Schema(
    {
        "priorityList": [
            {
                "formitaeten": [
                    {
                        "type": validate.text,
                        "qualities": [
                            {
                                "audio": {
                                    "tracks": [
                                        {
                                            "uri": validate.text
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                ]
            }
        ]
    }
)

class zdf_mediathek(Plugin):
    @classmethod
    def can_handle_url(cls, url):
        return _url_re.match(url)

    @classmethod
    def stream_weight(cls, key):
        weight = QUALITY_WEIGHTS.get(key)
        if weight:
            return weight, "zdf_mediathek"

        return Plugin.stream_weight(key)

    def _extract_streams(self, response):
        if "priorityList" not in response:
            self.logger.error("Invalid response! Contains no priorityList!")

        for priority in response["priorityList"]:
            for format_ in priority["formitaeten"]:
                yield self._extract_from_format(format_)

    def _parse_track(self, track, parser):
        try:
            return parser(self.session, track["uri"])
        except IOError as err:
            self.logger.error("Failed to extract {0} streams: {1}", name, err)

    def _extract_from_format(self, format_):
        qualities = {}

        if format_["type"] not in STREAMING_TYPES:
            return qualities

        name, parser = STREAMING_TYPES[format_["type"]]
        for quality in format_["qualities"]:
            for track in quality["audio"]["tracks"]:
                option = self._parse_track(track, parser)
                qualities.update(option)

        return qualities
            

    def _get_streams(self):
        match = _url_re.match(self.url)
        title = self.url.rsplit('/', 1)[-1]
        if title.endswith(".html"):
            title = title[:-5]

        request_url = "https://api.zdf.de/content/documents/%s.json?profile=player" % title
        res = http.get(request_url, headers={"Api-Auth" : "Bearer d2726b6c8c655e42b68b0db26131b15b22bd1a32"})
        document = http.json(res, schema=_documents_schema)

        stream_request_url = document["mainVideoContent"]["http://zdf.de/rels/target"]["http://zdf.de/rels/streams/ptmd"]
        stream_request_url = API_URL + stream_request_url

        res = http.get(stream_request_url)
        res = http.json(res, schema=_schema)

        streams = {}
        for format_ in self._extract_streams(res):
            streams.update(format_)

        return streams

__plugin__ = zdf_mediathek
