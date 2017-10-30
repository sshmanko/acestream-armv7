#-plugin-sig:VcwPXA7D8PG1uEPJOXNUtjv84y31sCbPl+nNUTZIrX24Vynzcn1xnfOS6kpiOa4DLUR7Q3YJLM64MLJdH1ZVF3px+vDPAUNfE7sVhADwUP39/RBsNzl9GwB8B4xkrnNAnulRxYawKGn8SJu0eTA1Y5RRy3oRHEW9G8hqOInp9qe8k6Sm4mcb+2k5IoxBXaxJvQwmZb95td+iq8lorZXH/bx8HXomm1lBiBUxx9HgBsFgP7PNghW8VOAP6Uzuu+O3LGfLgj1v2c6k0YMxx70zMu7KGRFcXsebCk4IwT+ZRpKRvDHt1/J9JMjBYt6VwwhQtVFaKBPEiRECMKZuWuu5Rg==
import re

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http, validate
from ACEStream.PluginsContainer.livestreamer.plugin.api.utils import parse_json
from ACEStream.PluginsContainer.livestreamer.stream import HLSStream

try:
    from HTMLParser import HTMLParser
except ImportError:
    from html.parser import HTMLParser

def html_unescape(s):
    parser = HTMLParser()
    return parser.unescape(s)

_url_re = re.compile(r"https?://(?:www\.)?vidio\.com/(?P<type>live|watch)/(?P<id>\d+)-(?P<name>[^/?#&]+)")
_clipdata_re = re.compile(r"""data-json-clips\s*=\s*(['"])(.*?)\1""")

_schema = validate.Schema(
    validate.transform(_clipdata_re.search),
    validate.any(
        None, 
        validate.all(
            validate.get(2),
            validate.transform(html_unescape),
            validate.transform(parse_json),
            [{
                "sources": [{
                    "file": validate.url(
                        scheme="http",
                        path=validate.endswith(".m3u8")
                    )
                }]
            }]
        )
    )
)

class Vidio(Plugin):
    @classmethod
    def can_handle_url(cls, url):
        return _url_re.match(url)

    def _get_streams(self):
        clips = http.get(self.url, schema=_schema)
        if not clips:
            return

        for clip in clips:
            for source in clip["sources"]:
                return HLSStream.parse_variant_playlist(self.session, source["file"])

__plugin__ = Vidio
