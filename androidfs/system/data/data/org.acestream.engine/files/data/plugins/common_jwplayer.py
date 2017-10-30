#-plugin-sig:aavGbgu25BH3tVqGAcLbnkvxoEd3w5BCl8DSx+1DnYg1Uc7gmHVfcBk11uJUqv4DT/MrleczvIlhXNcfrZY6svb4JAGptIzelQrxXrBUUyqnmA7LIByGFWurfVPLTrKv1NWWmurdO6O5IRFf675L3boLPajwpjzkSpJwtR44wl5+SfZ45I9Gr25Aq6VQC1qU7A1qSW9JhTSMcj9uFQ4JEC1AZQtlcuhnP1/Iwz4jjhMziIm2+RGTV2xBcbKI2YNWqsLRlqtT9sT099Eh28iiALeXmvyC5zvXaPvf0Rgz39b7kvSwL9ZAlt0TZwSk741Fg+j6x+9IWL06XgWkHcgUZg==
import re

from functools import partial

from ACEStream.PluginsContainer.livestreamer.plugin.api import validate
from ACEStream.PluginsContainer.livestreamer.plugin.api.utils import parse_json

__all__ = ["parse_playlist"]

_playlist_re = re.compile("\(?\{.*playlist: (\[.*\]),.*?\}\)?;", re.DOTALL)
_js_to_json = partial(re.compile("(\w+):\s").sub, r'"\1":')

_playlist_schema = validate.Schema(
    validate.transform(_playlist_re.search),
    validate.any(
        None,
        validate.all(
            validate.get(1),
            validate.transform(_js_to_json),
            validate.transform(parse_json),
            [{
                "sources": [{
                    "file": validate.text,
                    validate.optional("label"): validate.text
                }]
            }]
        )
    )
)


def parse_playlist(res):
    """Attempts to parse a JWPlayer playlist in a HTTP response body."""
    return _playlist_schema.validate(res.text)
