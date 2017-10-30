#!/usr/bin/env python
#-plugin-sig:j5IvF8YBcLoDm+PQagnwUnnyhIUaeWtb571lPo8bfkQ6gjvBdfOaKbEHp/GyEby4t6Kkj4C+ZyJ66jEdVSHvAFFCMjQkDcWRnwNrq0MkM00umifbqh2QzrftiDZbGiTzcqCue3gWenHU3E6NUmLxbbY/wYrpSM4Is0cf358kJ3PcDgyoIEibqxxV4feJCu0/95GWxQJ7OILfqTs15+nhGYkgDtWNHAD55jxq7BKIwFI/J5otPp094RW7gY3oThv8xagrn0OIVf9J75Nyha8rebWRoE9cHYaC6urzD3ji9H7P1v6DNaRTlkk5cmasUP8b1y/Y35eEUe9hiwtnw2HeRQ==
import re

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http
from ACEStream.PluginsContainer.livestreamer.stream import HLSStream
from ACEStream.PluginsContainer.livestreamer.plugin.api import validate

STREAM_INFO_URL = "http://dinamics.ccma.cat/pvideo/media.jsp?media=video&version=0s&idint={ident}&profile=pc&desplacament=0"
_url_re = re.compile(r"http://(?:www.)?ccma.cat/tv3/directe/(.+?)/")
_media_schema = validate.Schema({
        "geo": validate.text,
        "url": validate.url(scheme=validate.any("http"))
    })
_channel_schema = validate.Schema({
    "media": validate.any([_media_schema], _media_schema)
    })


class TV3Cat(Plugin):
    @classmethod
    def can_handle_url(self, url):
        match = _url_re.match(url)
        return match

    def _get_streams(self):

        match = _url_re.match(self.url)
        if match:
            ident = match.group(1)
            data_url = STREAM_INFO_URL.format(ident=ident)

            # find the region, default to TOTS (international)
            res = http.get(self.url)
            geo_data = re.search(r'data-geo="([A-Z]+?)"', res.text)
            geo = geo_data and geo_data.group(1) or "TOTS"

            stream_data = http.json(http.get(data_url), schema=_channel_schema)

            # If there is only one item, it's not a list ... silly
            if isinstance(stream_data['media'], list):
                stream_infos = stream_data['media']
            else:
                stream_infos = [stream_data['media']]

            for stream in stream_infos:
                if stream['geo'] == geo:
                    return HLSStream.parse_variant_playlist(self.session, stream['url'])


__plugin__ = TV3Cat

