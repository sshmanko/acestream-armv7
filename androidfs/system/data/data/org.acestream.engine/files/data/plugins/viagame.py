#-plugin-sig:PD1pMWnrsQLNp3JrBQCHh+durtR8nMgONyNARHUMSNsNrTp6ac82HPYsGHhOlQccNQEl5uh4HRzdhw+3pLs3W89TmEp6ySQDepfbl0QPn9UHpWJR9UN1FETuiuMDa0wXUA2kh7xdvAFVaLVkBrvB1SB/xzBU/bS2XCTH7U3ERvsdBknck6UPFSYHAqGxz76snLx2ozwILAiYqhWsBchgaRNBmCBqX9QDhQNYR9xxa1cFPxik9ExAcx2DRDCUMBLv03ufa817PRYoBfBiUquyHECoWg8jE1Cgq6e1MshDp+xQh7utQLl3h8Hip+RboXqcRGpdW4jEhaxJc8jgbu+ypQ==
"""Plugin for Viasat's gaming site Viagame."""

import re

from ACEStream.PluginsContainer.livestreamer.plugin.api import http, validate
from ACEStream.PluginsContainer.livestreamer.plugin.api.utils import parse_json
from ACEStream.PluginsContainer.livestreamer.plugin.api.support_plugin import viasat

STREAM_API_URL = "http://playapi.mtgx.tv/v3/videos/stream/{0}"

_embed_url_re = re.compile(
    '<meta itemprop="embedURL" content="http://www.viagame.com/embed/video/([^"]+)"'
)
_store_data_re = re.compile("window.fluxData\s*=\s*JSON.parse\(\"(.+)\"\);")
_url_re = re.compile("http(s)?://(www\.)?viagame.com/channels/.+")

_store_schema = validate.Schema(
    {
        "initialStoresData": [{
            "instanceName": validate.text,
            "storeName": validate.text,
            "initialData": validate.any(dict, list)
        }]
    },
    validate.get("initialStoresData")
)
_match_store_schema = validate.Schema(
    {
        "match": {
            "id": validate.text,
            "type": validate.text,
            "videos": [{
                "id": validate.text,
                "play_id": validate.text,
            }]
        }
    },
    validate.get("match")
)


class Viagame(viasat.Viasat):
    @classmethod
    def can_handle_url(cls, url):
        return _url_re.match(url)

    def _find_store(self, res, name):
        match = _store_data_re.search(res.text)
        if not match:
            return

        stores_data = parse_json(match.group(1).replace('\\"', '"'),
                                 schema=_store_schema)
        if not stores_data:
            return

        for store in filter(lambda s: s["instanceName"] == name, stores_data):
            return store

    def _find_video_id(self, res):
        match = _embed_url_re.search(res.text)
        if match:
            return match.group(1)

    def _find_stream_id(self):
        res = http.get(self.url)
        video_id = self._find_video_id(res)
        match_store = self._find_store(res, "matchStore")
        if not (video_id and match_store):
            return

        match_store = _match_store_schema.validate(match_store["initialData"])
        for video in filter(lambda v: v["id"] == video_id, match_store["videos"]):
            return video["play_id"]

    def _get_streams(self):
        stream_id = self._find_stream_id()
        if not stream_id:
            return

        return self._extract_streams(stream_id)


__plugin__ = Viagame
