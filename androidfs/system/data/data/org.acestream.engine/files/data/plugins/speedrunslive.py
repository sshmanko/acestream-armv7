#-plugin-sig:DRzD3uK2JEP6m0ga8wsWgY3GQ8BbEb3MUgqsH3okTJGse6YPDU/vZchsofL125q6Ei8G9TA3+JxZ2FWCsZf3Q+T+NRYMx+b3RDw4rVMPt0sdOu0SAI0v+63p6FaueyAZwfirwGYAvmPfqJzxlNcAulgPpLEviTZgWud6w4uokSEdmsMv1Mnc+pW4FN41zFTXMXxxZ1F0bLcFN9WSHkfRbO1kO0g3nyfIZ5mq8taySszuWg0O5OtCvsL8QM5TTcky4lLYJoJsJ+p0KmS2WL/RHYbOU0oJ/K2g0ZipSPBjokx3EGfXUy3TuIvoDplZVbPiDws2LDQASHael1gAMduaOA==
import re

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin

TWITCH_URL_FORMAT = "http://www.twitch.tv/{0}"

_url_re = re.compile("http://(?:www\.)?speedrunslive.com/#!/(?P<user>\w+)")


class SpeedRunsLive(Plugin):
    @classmethod
    def can_handle_url(self, url):
        return _url_re.match(url)

    def _get_streams(self):
        match = _url_re.match(self.url)
        username = match.group("user")
        url = TWITCH_URL_FORMAT.format(username)
        return self.session.streams(url)


__plugin__ = SpeedRunsLive
