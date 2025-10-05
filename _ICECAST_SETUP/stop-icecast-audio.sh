#!/bin/bash

STREAM_KEY=$1

if [ -z "$STREAM_KEY" ]; then
  exit 1
fi

systemctl stop audio-icecast@${STREAM_KEY}.service

exit 0









