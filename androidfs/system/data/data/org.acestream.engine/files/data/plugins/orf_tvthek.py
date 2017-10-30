#-plugin-sig:kmjxWm0gtQXYn7yX4ZEN3F3+t1LAt7+fchD+M41lIb09F6KScowjmm6IeELZdC14Td7Za+li+FwBq/SWvbTTDfReUCososWI0BNGgKZUTx1dXFfeXXuMsNdpS0T8ZaheZ0FkHLNDkVFTFroD/QMQr+Vl13i4aejEs6A5y2/ugKKgWdS0Y0d+ppGA8RDBch965Xevknz3MKoqlEsLQ8sV7qUsS4PgpTM7T/zhnaAG0LFCqYawIckyP3B/XTbiA+m6OHnH7yWU84BknPEdFZMygVsqK3gOOV68mFPlV5wyKQdFVztK4/Bd6rJPjlqVNno4/LcEVoFq3cs96nxRM/sk7A==
import re, json

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin, PluginError
from ACEStream.PluginsContainer.livestreamer.plugin.api import http
from ACEStream.PluginsContainer.livestreamer.stream import HLSStream

_stream_url_re = re.compile(r'https?://tvthek\.orf\.at/(index\.php/)?live/(?P<title>[^/]+)/(?P<id>[0-9]+)')
_vod_url_re = re.compile(r'https?://tvthek\.orf\.at/pro(gram|file)/(?P<showtitle>[^/]+)/(?P<showid>[0-9]+)/(?P<episodetitle>[^/]+)/(?P<epsiodeid>[0-9]+)(/(?P<segmenttitle>[^/]+)/(?P<segmentid>[0-9]+))?')
_json_re = re.compile(r'<div class="jsb_ jsb_VideoPlaylist" data-jsb="(?P<json>[^"]+)">')

MODE_STREAM, MODE_VOD = 0, 1

class ORFTVThek(Plugin):
    @classmethod
    def can_handle_url(self, url):
        return _stream_url_re.match(url) or _vod_url_re.match(url)

    def _get_streams(self):
        if _stream_url_re.match(self.url):
            mode = MODE_STREAM
        else:
            mode = MODE_VOD

        res = http.get(self.url)
        match = _json_re.search(res.text)
        if match:
            data = json.loads(_json_re.search(res.text).group('json').replace('&quot;', '"'))
        else:
            raise PluginError("Could not extract JSON metadata")

        streams = {}
        try:
            if mode == MODE_STREAM:
                sources = data['playlist']['videos'][0]['sources']
            elif mode == MODE_VOD:
                sources = data['selected_video']['sources']
        except (KeyError, IndexError):
            raise PluginError("Could not extract sources")

        for source in sources:
            try:
                if source['delivery'] != 'hls':
                    continue
                url = source['src'].replace('\/', '/')
            except KeyError:
                continue
            stream = HLSStream.parse_variant_playlist(self.session, url)
            streams.update(stream)

        return streams

__plugin__ = ORFTVThek
