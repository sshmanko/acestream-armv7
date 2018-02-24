#!/system/bin/busybox sh

export ANDROID_ROOT=/system
export ANDROID_DATA=/system
export ANDROID_STORAGE=/storage
export PYTHONHOME=/acestream.engine/python
export PYTHONPATH=/acestream.engine/python/lib/python2.7/lib-dynload
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/acestream.engine/python/lib:/acestream.engine/python/lib/python2.7/lib-dynload
export PATH=$PYTHONHOME/bin:$PATH

if [ ! -d /bin ]; then
mkdir bin
fi
if [ ! -d /sbin ]; then
mkdir sbin
fi

if [ `ls /bin | wc -l` -eq 0 ]; then
/system/bin/busybox --install -s
fi

if [ `ls /sbin | wc -l` -eq 0 ]; then
/system/bin/busybox --install -s
fi

cd /acestream.engine
/acestream.engine/python/bin/python main.pyc
