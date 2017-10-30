#-plugin-sig:ikjIScxwEUpQuQx1dXsDyTM2m4eZ5VFTaouGTVWDuWWHOS1iJ0Ssd9hUFiCtWZId1R94qlJadTRNtgj4uYBw/H45tz8O+x4fpOXzYumMjjAxtBcEXRc7xh635s4wRePLCoDfcg4TFmXOKWgU41o8uW4j+zIcAy8xd9N8N0/qk+3hilJd8HNorL5+r8F2Q8a8pLT7pXQZ70BmuvZvgkTAWQ380gPa/KBxKmg+3iFz+3NrdjDuKcclGrTef3ePhj90kbq07Pjc1M7OKiFjCPdiYoW48DoSBlIMqxpUY5YhXi0Tm+UX1seoh8P6Zd41oiArYVAO2ymUEVQyktTY0obUNg==
"""Plugin for younow.com by WeinerRinkler"""

import re

from ACEStream.PluginsContainer.livestreamer.plugin import Plugin, PluginError
from ACEStream.PluginsContainer.livestreamer.plugin.api import http
from ACEStream.PluginsContainer.livestreamer.stream import RTMPStream

jsonapi= "https://api.younow.com/php/api/broadcast/info/curId=0/user="

# http://younow.com/channel/
_url_re = re.compile("http(s)?://(\w+.)?younow.com/(?P<channel>[^/&?]+)")

def getStreamURL(channel):
    url = jsonapi + channel
    res = http.get(url)
    streamerinfo = http.json(res)
    #print(streamerinfo)

    if not any("media" in s for s in streamerinfo):
        print ("User offline or invalid")
        return
    else:
        streamdata = streamerinfo['media']
        #print(streamdata)
        streamurl = "rtmp://" + streamdata['host'] + streamdata['app'] + "/" + streamdata['stream']
        #print (streamurl)

    return streamurl

class younow(Plugin):
    @classmethod
    def can_handle_url(self, url):
        return _url_re.match(url)

    def _get_streams(self):
        match = _url_re.match(self.url)
        channel = match.group("channel")

        streamurl = getStreamURL(channel)
        if not streamurl:
            return
        streams = {}
        streams["live"] = RTMPStream(self.session, {
            "rtmp": streamurl,
            "live": True
        })
        
        return streams


__plugin__ = younow
