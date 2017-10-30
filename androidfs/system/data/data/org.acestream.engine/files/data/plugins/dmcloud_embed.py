#-plugin-sig:n6ekHcBjMuqXtL1+Y2Mdud14oYx5NjtwVmHs2boc0WHhT3Lb+mmqsruHxUVW99JkbDMRJ5+klj8ekU1z6jBEQcTez3bG7Z4PCZxFh+2buImQ+51kkz5jVkhOYXSYoLTMRlFpLYbeU2GPxQKa5B+PoHvD47VYkOTgC9rq/SQChSxCiSJzSs8oqeu5SkZFJLJZ1+GJkDo+6tpPaeXX3OJO5HmlDjz5sdHOKFxndUBkYSWkrd4JMyaeNKvVIRerQG2Y4q1xzTHZ509O3fAeX//x7ttlbJAa5eMd3UoH9Wn7XbbhdMs2D3hpvPnH5nKaPrwJy6ie1nzHd60Hg5owalFU/Q==
import re

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http

HEADERS = {
    "User-Agent": ("Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:25.0) "
                   "Gecko/20100101 Firefox/25.0")
}
URLS = [
    re.compile("http(s)?://(\w+\.)?action24.gr")
]

_embed_re = re.compile("http(s)?://api.dmcloud.net/player/embed/[\w\?=&\/;\-]+")


class DMCloudEmbed(Plugin):
    @classmethod
    def can_handle_url(self, url):
        for site in URLS:
            if site.match(url):
                return True

    def _get_streams(self):
        res = http.get(self.url, headers=HEADERS)

        match = _embed_re.search(res.text)
        if match:
            url = match.group(0)
            return self.session.streams(url)


__plugin__ = DMCloudEmbed
