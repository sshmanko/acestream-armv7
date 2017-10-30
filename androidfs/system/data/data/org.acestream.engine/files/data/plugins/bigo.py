#-plugin-sig:SZRmC5qppiVo2FjgXSwxaJHVtjYXRON4yigBMZflqA4pbUSnGNB7+aS2dZovfrB3+7mrmSHE3/MG5iAfDk7O+ByNXXQSB5vzRIXyS2Poz4BD9mH3tqdEJo6Sl/v3uZCk1cMPCV6VX5iFyWu6mLk7eK3TS/fh9yF9Qxoehh+zzHZCrei1yqFjAuLRSE4fk3+7bGELFbaxFvtqv02cQG1zXDJc11EOsKxyE7kq64ELQIDgDNzG2f3rHpQ5MBPS4i1HIzY7MY1uxckhZY0vnFatQXkz+EKEUezmrufdYJElsE8JmBAsizDWRL/56JbOlPd++o2O1fDQ16mgm9zrEdnh0Q==
import re
import socket
import struct

from ACEStream.PluginsContainer.livestreamer import PluginError
from ACEStream.PluginsContainer.livestreamer.plugin import Plugin
from ACEStream.PluginsContainer.livestreamer.plugin.api import http
from ACEStream.PluginsContainer.livestreamer.stream import Stream


class BigoStream(Stream):
    """
    Custom streaming protocol for Bigo

    The stream is started by sending the uid and sid as little-endian unsigned longs
    after connecting to the server. The video stream is FLV.
    """
    def __init__(self, session, sid, uid, ip, port):
        super(BigoStream, self).__init__(session)
        try:
            self.sid = int(sid)
            self.uid = int(uid)
        except ValueError:
            raise PluginError("invalid sid or uid parameter for Bigo Stream: {}/{}".format(self.sid, self.uid))
        self.ip = ip
        try:
            self.port = int(port)
        except ValueError:
            raise PluginError("invalid port number for Bigo Stream: {}:{}".format(self.ip, self.port))
        self.con = None

    def open(self):
        try:
            self.con = socket.create_connection((self.ip, self.port))
            self.con.send(struct.pack("<LL", self.uid, self.sid))
        except IOError:
            raise PluginError("could not connect to Bigo Stream")
        return self

    def read(self, size):
        return self.con.recv(size)

    def close(self):
        if self.con:
            self.con.close()


class Bigo(Plugin):
    _url_re = re.compile(r"https?://(live.bigo.tv/\d+|bigoweb.co/show/\d+)")
    _flashvars_re = flashvars = re.compile(
        r'''^\s*(?<!<!--)<param.*value="tmp=(\d+)&channel=(\d+)&srv=(\d+\.\d+\.\d+\.\d+)&port=(\d+)"''',
        re.M)

    @classmethod
    def can_handle_url(cls, url):
        return cls._url_re.match(url) is not None

    def _get_streams(self):
        page = http.get(self.url,
                        allow_redirects=True,
                        headers={"User-Agent": "Mozilla/5.0 (MSIE 10.0; Windows NT 6.1; Trident/5.0)"})
        flashvars = self._flashvars_re.search(page.text)
        if not flashvars:
            return

        sid, uid, ip, port = flashvars.groups()
        yield "live", BigoStream(self.session, sid, uid, ip, port)

__plugin__ = Bigo
