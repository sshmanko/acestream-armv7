#-plugin-sig:jxefQJvEwKDXYv5Hn8tlSzKiqw7aaaqO9S26M8uGJy/m/ffySt/HSWoVtldsB/l4E/ned3JRiuCVZjVCIVtg4JFvXF84NfZYhxvXHPdqKdtP0GpbrgIwdeaDB/RLkEtqalp6B3nwnDzeWl+GJJRx02oDQ6CLIHfPXavb+NcaWivRh85tZSut/qRRDU8GnObpqGeq5aob8v5PzIBmpgZzz8Pfa/dxECekrQca7Sx85Qbjcd56h2ok1vHBqb5W3guU9uFjfHtu8jKw7dBP5sg7FLtZHdrHIztpfFEWuXoDYMVu+mWGEUeeBgnm55m1H4XMtvr7005lbXR7wMxpaZHRhw==

"""
The purpose of this plugin is to request specified URL using mobile (iPhone) user agent.
Many sites outout <video> tag with direct links to content for mobile devices.
We try to find those direct links.
"""
import re
import urlparse

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin, PluginError
from ACEStream.PluginsContainer.livestreamer.plugin.api import http
from ACEStream.PluginsContainer.livestreamer.stream import HTTPStream, HLSStream

PREFIX = "html5_video::"
HTML5_VIDEO_PATTERN = re.compile(r"<video.+</video>", re.M)
USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1 (KHTML, like Gecko) CriOS/60.0.3112.40 Mobile/13B143 Safari/601.1.46'

class UniversalHtml5Video(Plugin):
    @classmethod
    def can_handle_url(cls, url):
        # this plugin is disabled for now
        return False

    def _get_streams(self):
        streams = {}
        url = self.url[len(PREFIX):]

        print "url", url

        # Set header data for user-agent
        hdr = {'User-Agent': USER_AGENT}

        # Parse video ID from data received from supplied URL
        res = http.get(url, headers=hdr)

        for match in re.findall(HTML5_VIDEO_PATTERN, res.text):
            print "match", match

        return streams

__plugin__ = UniversalHtml5Video
