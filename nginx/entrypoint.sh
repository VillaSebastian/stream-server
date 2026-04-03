#!/usr/bin/env bash
set -euo pipefail

# Substitute only our specific variables, leaving nginx's $variables intact
VARS='$DOMAIN:$STREAM_KEY:$HLS_FRAGMENT:$HLS_PLAYLIST_LENGTH:$CHAT_PORT'

envsubst "$VARS" < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
envsubst "$VARS" < /etc/nginx/conf.d/stream.conf.template > /etc/nginx/conf.d/stream.conf

# Remove the template so nginx doesn't try to parse it
rm /etc/nginx/conf.d/stream.conf.template

exec nginx -g 'daemon off;'
