#!/usr/bin/env python
#-plugin-sig:EE00MFb1ddNo10wMWgedY9G3QXY5Oo/+7SI57EwAGnvq3v9W2/x/8JE0g1X3PxNy3W/ODiyP9gs2ufsqVCHhhvVfFSFFWHKgOhTQ8ueyR5640xHX+OQa6LnBLq3O0yfd9fypLsrFIuTx/v/VbTc5cv208eyPHZaTFzFE7BoQSQQZwdYTGaEw9TVa2Tk1uZkbm9nkfKYEOF5OdN1EEzW7gXRaX9ITOdmq3rCBQhTsrF91eFmTivM7uOiTY/5kUvvCGYotlAAffAC3t4K/QRUMZ3O8BJokSuk0xZJJNJWszRS3fhHe16e/kTVn8s7Sp//GiGuepROIw2D6oSrM+VSY3w==
import re

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.stream import HDSStream

_channel = dict(
    at="servustvhd_1@51229",
    de="servustvhdde_1@75540"
)

STREAM_INFO_URL = "http://hdiosstv-f.akamaihd.net/z/{channel}/manifest.f4m"
_url_re = re.compile(r"http://(?:www.)?servustv.com/(de|at)/.*")


class ServusTV(Plugin):
    @classmethod
    def can_handle_url(cls, url):
        match = _url_re.match(url)
        return match

    def _get_streams(self):
        url_match = _url_re.match(self.url)
        if url_match:
            if url_match.group(1) in _channel:
                return HDSStream.parse_manifest(self.session, STREAM_INFO_URL.format(channel=_channel[url_match.group(1)]))


__plugin__ = ServusTV
