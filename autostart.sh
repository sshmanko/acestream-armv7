#!/bin/bash
PATH=/sbin:/bin:/usr/sbin:/usr/bin

ACE_DIR=$(readlink -f $(dirname $0))
ACE_ARG="--client-console" 

if [ -f $ACE_DIR/acestream-user.conf ]; then
  . $ACE_DIR/acestream-user.conf
  if [ -n "$ACE_USER_ARG" ]; then
    ACE_ARG="$ACE_ARG $ACE_USER_ARG"
  fi
fi
$ACE_DIR/acestream.start $ACE_ARG
