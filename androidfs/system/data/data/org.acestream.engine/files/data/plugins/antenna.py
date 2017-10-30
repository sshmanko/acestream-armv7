#-plugin-sig:LTi+EFxW20jWET9p9tLKawbvRUq+dF3ZXpJkGA8kXGGyt+BBlu/hYvwVJPtf43M0zfnUiWkYHTVk4oOSoUhJz27YcHKidBOfnsKWINYd4KGmhC2Is/h5viK3SKhQiqC1E25QSSYw7bMwtBCTmRqCQHQz23f43zY5vmoVy5c5TkYRnreHdEosHsKRP6ub8lWTAT+NibMdydDIv2ohM8fQCJm8bVYEp/pJt/oT+Bd5HfAquNF+1K0Hp0TLfUBHTjBJTV9FN1CEugqy3KnfAsIWLnfqQmhsagddSmHdOlX9ADoIl9TBPxbmKyoQRWtwZuts+0gKKxfWGK4ggVTecw1HEg==
import re
import json

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http, validate
from ACEStream.PluginsContainer.livestreamer.stream import HDSStream

_url_re = re.compile("(http(s)?://(\w+\.)?antenna.gr)/webtv/watch\?cid=.+")
_playlist_re = re.compile("playlist:\s*\"(/templates/data/jplayer\?cid=[^\"]+)")
_manifest_re = re.compile("jwplayer:source\s+file=\"([^\"]+)\"")
_swf_re = re.compile("<jwplayer:provider>(http[^<]+)</jwplayer:provider>")

class Antenna(Plugin):
    @classmethod
    def can_handle_url(self, url):
        return _url_re.match(url)

    def _get_streams(self):

        # Discover root
        match = _url_re.search(self.url)
        root = match.group(1)

        # Download main URL
        res = http.get(self.url)

        # Find playlist
        match = _playlist_re.search(res.text)
        playlist_url = root + match.group(1) + "d"

        # Download playlist
        res = http.get(playlist_url)

        # Find manifest
        match = _manifest_re.search(res.text)
        manifest_url = match.group(1)

        # Find SWF
        match = _swf_re.search(res.text)
        swf_url = match.group(1);

        streams = {}
        streams.update(
            HDSStream.parse_manifest(self.session, manifest_url, pvswf=swf_url)
        )
        
        return streams

__plugin__ = Antenna
