#-plugin-sig:G8K4IIOtcELL7LkHK41Rxe32AnXIEuYnvlAHQzFfQC7jnR5ZogrEDuy/+ZUtQnbfEgMaUAHcHJI8PYj0wwuqavAVAbRGdbOLdVgKjBzWXwhIZm+tMsXvE5xV3kaD6e/vm+7yCpawNl+UHWUnbSqJwmrK5uuseGPAu5F55r1AuJUWi4JEo3IQZjx12HA6dI0oC8mIyIyCPkX/6OAYWxU/BAAxih+04UWExcjYWdFEBwbkqZ9UPFKDqkDCy6LFh6Qf7RG9JrC+h2yAAIeQvEGISmfBc0nu00CBdxqvSpsQS1E+l1cog3n4UIqHdcogdXaTBwop7keITWFHV9Hf4bOSMw==
import re
from ACEStream.PluginsContainer.livestreamer.compat import urlparse
from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http
from ACEStream.PluginsContainer.livestreamer.stream import HDSStream, HLSStream, RTMPStream


STREAMS_INFO_URL = "http://www.expressen.se/Handlers/WebTvHandler.ashx?id={0}";

_url_re = re.compile("http(s)?://(?:\w+.)?\.expressen\.se")
_meta_xmlurl_id_re = re.compile('<meta.+xmlUrl=http%3a%2f%2fwww.expressen.se%2fHandlers%2fWebTvHandler.ashx%3fid%3d([0-9]*)" />')


class Expressen(Plugin):
    @classmethod
    def can_handle_url(cls, url):
        return _url_re.match(url)

    def _get_streams(self):
        res = http.get(self.url)
        
        match = _meta_xmlurl_id_re.search(res.text)
        if not match:
            return;
        
        xml_info_url = STREAMS_INFO_URL.format(match.group(1))
        video_info_res = http.get(xml_info_url)
        parsed_info = http.xml(video_info_res)
        
        live_el = parsed_info.find("live");
        live = live_el is not None and live_el.text == "1"
        
        streams = { }
        
        hdsurl_el = parsed_info.find("hdsurl");
        if hdsurl_el is not None and hdsurl_el.text is not None:
            hdsurl = hdsurl_el.text
            streams.update(HDSStream.parse_manifest(self.session, hdsurl))
            
        if live:
            vurls_el = parsed_info.find("vurls");
            if vurls_el is not None:
                for i, vurl_el in enumerate(vurls_el):
                    bitrate = vurl_el.get("bitrate")
                    name = bitrate + "k" if bitrate is not None else "rtmp{0}".format(i)
                    params = {
                        "rtmp": vurl_el.text,
                    }
                    streams[name] = RTMPStream(self.session, params)
                    
        parsed_urls = set()
        mobileurls_el = parsed_info.find("mobileurls");
        if mobileurls_el is not None:
            for mobileurl_el in mobileurls_el:
                text = mobileurl_el.text
                if not text:
                    continue
                
                if text in parsed_urls:
                    continue
                
                parsed_urls.add(text)
                url = urlparse(text)
                
                if url[0] == "http" and url[2].endswith("m3u8"):
                    streams.update(HLSStream.parse_variant_playlist(self.session, text))
        
        return streams

__plugin__ = Expressen