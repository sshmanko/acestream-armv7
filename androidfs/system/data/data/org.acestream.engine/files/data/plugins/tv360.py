#-plugin-sig:UkFvo3PjCj9DyftXcNDrnfytuKuCX3gRfdBuey4lfkEercMuW764pfbyBPMgIZKbA4J1yolytJRmgZbF5zXZ5cMNrhI8+6kDMAbY+H8Kf0tr85o9mKD1n0BWBZkJTkobrncOSBDjjzqWVNUfAkrpuXkcwCzCahhrtyzaMlujN+6tWkT4xFODhgcHSmeR8lNIercMivN8+sFYGXBNFa8bopE9T/Du7rp69dET2xa41dzs2fPyuXJ5amatRgW3PXwGTfAQFYJlGHxVsXduzXnsqim7u4YqVljFVYDHNPWNh6m5Yoj62WLpMPs4f+HVsQ66tAeNlVl5WQOljJi+DTxeeA==
from __future__ import print_function
import re
from functools import partial

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http
from ACEStream.PluginsContainer.livestreamer.plugin.api import validate
from ACEStream.PluginsContainer.livestreamer.stream import HLSStream
from ACEStream.PluginsContainer.livestreamer.utils import parse_json


class TV360(Plugin):
    url_re = re.compile(r"https?://(?:www.)?tv360.com.tr/CanliYayin")
    data_re = re.compile(r'''div.*?data-tp=(?P<q>["'])(?P<data>.*?)(?P=q)''', re.DOTALL)
    _js_to_json = partial(re.compile(r"""(\w+):(["']|\d+,|true|false)""").sub, r'"\1":\2')
    data_schema = validate.Schema(
        validate.transform(data_re.search),
        validate.any(
            None,
            validate.all(
                validate.get("data"),
                validate.transform(_js_to_json),
                validate.transform(lambda x: x.replace("'", '"')),
                validate.transform(parse_json),
                {
                    "tp_type": "hls4",
                    "tp_file": validate.url(),
                }
            )
        )
    )

    @classmethod
    def can_handle_url(cls, url):
        return cls.url_re.match(url) is not None

    def _get_streams(self):
        res = http.get(self.url)
        data = self.data_schema.validate(res.text)

        if data:
            return HLSStream.parse_variant_playlist(self.session, data["tp_file"])


__plugin__ = TV360
