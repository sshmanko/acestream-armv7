#!/usr/bin/env python
#-plugin-sig:kPbSffKXouE5EsrU8SGiE6ugjbXpj65qWORCNhzKxXRq7dGERN5xTqhccEyANA/FpSseC6K2i6A+0yPUKaaMP6GHj4TspdMyI017snpFye9WRWQvAcvjxU3C/TnmdNezRPVRqBqH+jc6eS5JwXEWnvk0Ww8pZPu8GJxVYorjz1h2djMAH8WMDAqMREuX74vpIFp02SaCXtnddIr7+uq0jdVVfMmM3pFkn/QA+aDc8mouTUk+NJ/d+RrY4yY1mZLMkHhIxliJ0yY2yost5t5D2UYI46qB3habMGp6R9AsfcQwZCU/qsLQ64KytksnOSGbSm0Ftzs1r1kWWD35//l8+w==
import json
import requests

import re

from io import BytesIO
from time import sleep

from ACEStream.PluginsContainer.livestreamer.exceptions import PluginError

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http, validate
from ACEStream.PluginsContainer.livestreamer.stream import HLSStream


HTTP_HEADERS = {
    "User-Agent": ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                   "(KHTML, like Gecko) Chrome/36.0.1944.9 Safari/537.36"),
    'Accept': 'application/json;pk=BCpkADawqM1gvI0oGWg8dxQHlgT8HkdE2LnAlWAZkOlznO39bSZX726u4JqnDsK3MDXcO01JxXK2tZtJbgQChxgaFzEVdHRjaDoxaOu8hHOO8NYhwdxw9BzvgkvLUlpbDNUuDoc4E4wxDToV'

}

_url_re = re.compile("http(s)?://(\w+\.)?azubu.tv/(?P<domain>\w+)")

PARAMS_REGEX = r"(\w+)=({.+?}|\[.+?\]|\(.+?\)|'(?:[^'\\]|\\')*'|\"(?:[^\"\\]|\\\")*\"|\S+)"
stream_video_url = "http://api.azubu.tv/public/channel/{}/player"


class AzubuTV(Plugin):
    @classmethod
    def can_handle_url(cls, url):
        return _url_re.match(url)

    @classmethod
    def stream_weight(cls, stream):
        if stream == "source":
            weight = 1080
        else:
            weight, group = Plugin.stream_weight(stream)

        return weight, "azubutv"

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

    def _get_stream_url(self, o):

        match = _url_re.match(self.url);
        channel = match.group('domain');

        channel_info = requests.get(stream_video_url.format(channel))
        j = json.loads(channel_info.text)

        if 'data' in j and 'is_live' in j["data"] and j["data"]["is_live"] != True:
            return "", False
        else:
            is_live = True

        stream_url = 'https://edge.api.brightcove.com/playback/v1/accounts/3361910549001/videos/ref:{0}'

        r = requests.get(stream_url.format(j["data"]["stream_video"]["reference_id"]), headers=HTTP_HEADERS)
        t = json.loads(r.text)

        stream_url = t["sources"][0]["src"]
        return stream_url, is_live


    def _get_streams(self):
        hls_url, is_live = self._get_stream_url(self)

        if not is_live:
            return

        split = self.url.split(" ")
        params = (" ").join(split[1:])
        params = self._parse_params(params)

        try:
            streams = HLSStream.parse_variant_playlist(self.session, hls_url, **params)
        except IOError as err:
            raise PluginError(err)

        return streams

__plugin__ = AzubuTV
