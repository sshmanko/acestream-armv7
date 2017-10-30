#-plugin-sig:i9dRWsdApg0TvR7WJaXq08j1LjsZ3nYXIArKCJcVrVINlK1cDJ4OeeBWzzbnLKilXnoerHnOmLZxTu14rrAD2rrhpYYbkLTsy6IhzeCPBxtAwLBRBzLbpfH7o/IDl1OJ2qWh/xS8oBR7ej+nSUfxkzat/Du+ptCgnpCqrZuhoAPaycP9nLYY3dnCBgHgK9SkfQAz/WctSQjCh9FEamsNF0yuuRCaMCqRjY8DMpBPQxS9A3JsdIyiy0mz3E0H0Qedkihfq47go1CqqVWXniInegwwSwQq3A5FzvfSDY7eK0cXhHPUrs0YD71XBUJ95Kd/LYrKXbrGKzl2naiUeUyxrQ==
import re

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http, validate
from ACEStream.PluginsContainer.livestreamer.stream import RTMPStream

_url_re = re.compile("^http(s)?://(\w+\.)?furstre\.am/stream/.+")
_stream_url_re = re.compile("<source src=\"([^\"]+)\"")
_schema = validate.Schema(
    validate.transform(_stream_url_re.search),
    validate.any(
        None,
        validate.all(
            validate.get(1),
            validate.url(
                scheme="rtmp"
            )
        )
    )
)


class Furstream(Plugin):
    @classmethod
    def can_handle_url(cls, url):
        return _url_re.match(url)

    def _get_streams(self):
        stream_url = http.get(self.url, schema=_schema)
        if not stream_url:
            return

        stream = RTMPStream(self.session, {
            "rtmp": stream_url,
            "pageUrl": self.url,
            "live": True
        })

        return dict(live=stream)

__plugin__ = Furstream
