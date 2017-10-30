#!/usr/bin/env python
#-plugin-sig:C0+gO9ahBZDQatmholVEb/sEp3zsGXCQ0AYMKCnhj0AavmfJ7E99MalS2as+0NLIn0FEXiRfuvN1GcdWe7zpqSjiblLPbl6USDLGDVhmo5zss8KvmdhTWkpOE7neQTHbflA2Rmj0/8lubZWW+lY5eDWVDkTa2aUja0jfxI3dN51S+Wtgkdu0t3jCE5vlgUp8eCh/iypVaB680liu4DUv5SgMU0+cPLMuvYVHKQijQm8UH7/9VtdVoAbd8fO5G/S8zBEMI+YCuCdVor4muBTGnHHVpUz5m5iwGGJc/zw8e6NKsbl10qf/fUnjNqVtxvYccf6NC9bGxFjWtNUuhHuGHw==
import re

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http, validate
from ACEStream.PluginsContainer.livestreamer.stream import HLSStream


class TVPlayer(Plugin):
    _user_agent = (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_3) AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/43.0.2357.65 Safari/537.36")
    API_URL = "http://api.tvplayer.com/api/v2/stream/live"
    _url_re = re.compile(r"https?://(?:www.)?tvplayer.com/(:?watch/?|watch/(.+)?)")
    _stream_attrs_ = re.compile(r'var\s+(validate|platform|resourceId)\s+=\s*(.*?);', re.S)
    _stream_schema = validate.Schema({
        "tvplayer": validate.Schema({
            "status": u'200 OK',
            "response": validate.Schema({
                "stream": validate.url(scheme=validate.any("http"))
            })
        })
    })

    @classmethod
    def can_handle_url(cls, url):
        match = TVPlayer._url_re.match(url)
        return match is not None

    def _get_streams(self):
        # find the list of channels from the html in the page
        self.url = self.url.replace("https", "http")  # https redirects to http
        res = http.get(self.url, headers={"User-Agent": TVPlayer._user_agent})
        stream_attrs = dict((k, v.strip('"')) for k, v in TVPlayer._stream_attrs_.findall(res.text))

        # get the stream urls
        res = http.post(TVPlayer.API_URL, data=dict(id=stream_attrs["resourceId"],
                                                    validate=stream_attrs["validate"],
                                                    platform=stream_attrs["platform"]))

        stream_data = http.json(res, schema=TVPlayer._stream_schema)

        return HLSStream.parse_variant_playlist(self.session,
                                                stream_data["tvplayer"]["response"]["stream"],
                                                headers={'user-agent': TVPlayer._user_agent})


__plugin__ = TVPlayer
