# acestream-armv7
AceStream engine for Raspberry Pi 2/3 (and probably other ARM devices)

Wrapper for latest official ARM version from http://wiki.acestream.org/wiki/index.php/Download

Runs embedded Python in chrooted environment to mimic Android fs on Linux.


Engine version can be checked via HTTP:
```
http://<IP>:6878/webui/api/service?method=get_version&format=jsonp&callback=mycallback
```

## Installation

1. Unzip latest release to /opt/acestream
2. Copy acestream-user.conf.example to acestream-user.conf and change user/password
3. Run /opt/acestream/autostart.sh

   -OR-

   Copy acestream.service to /etc/systemd/system

   Enable service to run at boot and start it: systemctl enable acestream; systemctl start acestream


## Uninstallation

1. Stop acestream service / kill process
2. umount /opt/acestream/androidfs/{dev,proc,sys}
3. rm -rf /opt/acestream


## Upgrade

1. Stop acestream service / kill process
2. Unzip latest release to /opt/acestream
3. Start service / process
