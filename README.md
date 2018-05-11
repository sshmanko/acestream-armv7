# acestream-armv7
AceStream engine for Raspberry Pi 2/3 (and probably other ARM devices)

Wrapper for latest official ARM version from http://wiki.acestream.org/wiki/index.php/Download

Runs embedded Python in chrooted environment to mimic Android fs on Linux.

Original author [pepsik-kiev](https://github.com/pepsik-kiev)


Engine version can be checked via HTTP:
```
http://<IP>:6878/webui/api/service?method=get_version&format=jsonp&callback=mycallback
```

Starting from version 3.1.30 WebUI is available at:
```
http://<IP>:6878/webui/app/ReplaceMe/server#proxy-server-settings
```
(ReplaceMe string is set as --access-token in acestream.conf)

## Installation

1. Unzip latest release to /opt/acestream
2. Edit androidfs/acestream.engine/acestream.conf: change --login and --password
3. Run /opt/acestream/acestream.start

   -OR-

   Copy acestream.service to /etc/systemd/system

   Enable service to run at boot and start it: systemctl enable acestream; systemctl start acestream


## Uninstallation

1. Stop acestream service by running /opt/acestream/acestream.stop
3. rm -rf /opt/acestream
