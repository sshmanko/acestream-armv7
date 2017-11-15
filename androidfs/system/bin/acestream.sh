#!/system/bin/sh

export ANDROID_ROOT=/system
export ANDROID_DATA=/system/data
export ANDROID_STORAGE=/storage
export PYTHONHOME=/system/data/data/org.acestream.engine/files/python
export PYTHONPATH=/system/data/data/org.acestream.engine/files/python/lib/python2.7/lib-dynload:/system/data/data/org.acestream.engine/files/python/lib/python2.7
export PATH=$PYTHONHOME/bin:$PATH
export LD_LIBRARY_PATH=/system/data/data/org.acestream.engine/files/python/lib:/system/data/data/org.acestream.engine/files/python/lib/python2.7/lib-dynload
/system/data/data/org.acestream.engine/files/python/bin/python
