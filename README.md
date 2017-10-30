# acestream-armv7
AceStream engine for Raspberry Pi 2/3

Wrapper for latest official ARM version from http://wiki.acestream.org/wiki/index.php/Download

Runs embedded Python in chrooted environment to mimic Android fs on Linux.

Initial author: [pepsik-kiev](https://github.com/pepsik-kiev)


## Installation

1. Unzip latest release to /opt/acestream
2. Copy acestream-user.conf.example to acestream-user.conf and change user/password
3. Copy acestream.service to /etc/systemd/system
4. Enable service to run at boot and start it (systemctl enable acestream; systemctl start acestream)

