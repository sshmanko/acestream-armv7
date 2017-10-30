#-plugin-sig:VvOwgIVzXfEzEK3skVryeC0OzqvbETrNHpKKkudiDI6vyD5jQkNrD81YQ7TyAsUFZet1sHixqfY/eiXoJd8NZnEkU3l7k4FZCLhBcTCQGSmTt8c9aSe6QMdgdMNOtdIbOITTX8Z4rCzumKZTMUr6X0I+VmWyEpb+Ge6C7SnKFDcPgRi7ZLfl/s4WnR0BZ0Jt3z8jMs6yZGk5V43n+Asx8VdJOsPscUhrQ+9tMppGqRcruQaSe7PSfgwnegqbwbeQTKShTAEcILE3rJMojxKpNMpBSnRX0AHKRgIUfXqQe66iTQzaEobzJStUqXva4MTYUgOUiK1SDDZ/EbaZylR23g==
"""Plugin for Swedish TV channels Kanal 5, Kanal 9 and Kanal 11."""

import re

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http, validate
from ACEStream.PluginsContainer.livestreamer.stream import RTMPStream

API_URL = "http://www.kanal{0}play.se/api/getVideo?videoId={1}&format=FLASH"

_url_re = re.compile ("""
    (http(s)?://)?www.kanal(?P<channel>5|9|11)play.se/(play/)?
    program/\d+/video/(?P<video_id>\d+)
    """, re.VERBOSE)

_schema = validate.Schema (
    {
        "streams": validate.all (
            [{
                "bitrate": validate.transform (int),
                "source": validate.text
            }]),
        "streamBaseUrl": validate.text
    }
)

class Kanal5_9_11 (Plugin):
    @classmethod
    def can_handle_url (cls, url):
        return _url_re.match (url)

    def _get_streams (self):
        match = _url_re.match (self.url)
        channel = match.group ("channel")
        video_id = match.group ("video_id")
        
        # Get response from API and validate
        res = http.get (API_URL.format (channel, video_id))
        data = http.json (res, schema=_schema)
        
        # Form collection of available streams
        baseUrl = data["streamBaseUrl"]
        streams = {}
        for stream in data["streams"]:
            kbitrate = int (stream["bitrate"] / 1000)
            name = "{0}k".format (kbitrate)
            params = {
                "rtmp": baseUrl,
                "playpath": stream["source"],
                "live": True
            }
            streams[name] = RTMPStream (self.session, params)
        
        return streams

__plugin__ = Kanal5_9_11
