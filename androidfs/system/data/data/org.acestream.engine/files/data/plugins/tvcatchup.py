#-plugin-sig:dI2NrXzWVIy4RbHdD7DvGlKeS/WdQpW/rNCPLh9ThBKI/gRTCt1xuz3LJrrML8Y9lrxWKditY4ZwpVKEUyt+J9JQQXeb4Ggx8WuHOJl+TBsqx2cjogjMMdqArIWcvMV6eLIC053bBMQnNepemaU/JzcXh2iwmiAExqf2bNEiGflcSkh1gKe7+4H8eSdoh1EWbPx1HLgU17hWi4RRwOgdiWl18rW096t3lMMzvIZ/TfAA41JEk0qVi4k7yqT4IcMGVGyKGOnimM3G4R5kZVfw8uR1szZOULf3vY/SeFIMR8uVvqSK3/PqvCc9E7opHAVBTUWIOkZdvpfRx/IEsRBf7g==
import re

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http
from ACEStream.PluginsContainer.livestreamer.stream import HLSStream

USER_AGENT = "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36"
_url_re = re.compile("http://(?:www\.)?tvcatchup.com/watch/\w+")
_stream_re = re.compile(r'''(?P<q>["'])(?P<stream_url>https?://.*m3u8\?.*clientKey=.*?)(?P=q)''')


class TVCatchup(Plugin):
    @classmethod
    def can_handle_url(cls, url):
        return _url_re.match(url)

    def _get_streams(self):
        """
        Finds the streams from tvcatchup.com.
        """
        http.headers.update({"User-Agent": USER_AGENT})
        res = http.get(self.url)

        match = _stream_re.search(res.text, re.IGNORECASE | re.MULTILINE)

        if match:
            stream_url = match.group("stream_url")

            if stream_url:
                if "_adp" in stream_url:
                    return HLSStream.parse_variant_playlist(self.session, stream_url)
                else:
                    return {'576p': HLSStream(self.session, stream_url)}


__plugin__ = TVCatchup
