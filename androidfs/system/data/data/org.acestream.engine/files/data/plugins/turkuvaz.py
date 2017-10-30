#-plugin-sig:Dl/j+r1rvRAxfpO3ThOiokGseTmuB9+5F/kU5eiizFhHR5l/0SPWgZVVyN4jENDsdyxHcpHxlbFRnCZR4fJ/bbKiXHlFhIIFD5cPy8x64TZ4KDaFR5mKh/Gx8D8Th8MctIyPkRmn+Q/t7N6KrpJRqfzq/9toMxSwuRi43IorNtMRfvUEYfcKT0253xOEBYIixBvVUe8qO1BD7wOMnC4VLYYeiRnFPDHpkcNZKFFq3Vh4qFdm0ONLs+veqOWvyEGb+/JR7ckC9a0pUD7Bx5tJ4/slprima1F8TPVxcyIHvVWdQhdNC6nLAs/uFCx+f4rNQcF+0bEaeMaLsOQm31qpVQ==
import random
import re
from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http
from ACEStream.PluginsContainer.livestreamer.plugin.api import validate
from ACEStream.PluginsContainer.livestreamer.stream import HLSStream


class Turkuvaz(Plugin):
    """
    Plugin to support ATV/A2TV Live streams from www.atv.com.tr and www.a2tv.com.tr
    """

    _url_re = re.compile(r"""https?://(?:www.)?
            (?:
                (atv|a2tv|ahaber|aspor|minikago|minikacocuk).com.tr/webtv/canli-yayin|
                (atvavrupa).tv/webtv/videoizle/atv_avrupa/canli_yayin
            )""", re.VERBOSE)
    _hls_url = "http://trkvz-live.ercdn.net/{channel}/{channel}.m3u8"
    _token_url = "http://videotoken.tmgrup.com.tr/webtv/secure"
    _token_schema = validate.Schema(validate.all(
        {
            "Success": True,
            "Url": validate.url(),
        },
        validate.get("Url"))
    )

    @classmethod
    def can_handle_url(cls, url):
        return cls._url_re.match(url) is not None

    def _get_streams(self):
        url_m = self._url_re.match(self.url)
        domain = url_m.group(1) or url_m.group(2)
        # remap the domain to channel
        channel = {"atv": "atvhd",
                   "ahaber": "ahaberhd",
                   "aspor": "asporhd"}.get(domain, domain)

        hls_url = self._hls_url.format(channel=channel)
        # get the secure HLS URL
        res = http.get(self._token_url, params={"url": hls_url})
        secure_hls_url = http.json(res, schema=self._token_schema)

        return HLSStream.parse_variant_playlist(self.session, secure_hls_url)


__plugin__ = Turkuvaz
