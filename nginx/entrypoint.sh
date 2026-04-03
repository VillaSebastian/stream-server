#!/usr/bin/env bash
set -euo pipefail

# Substitute only our specific variables, leaving nginx's $variables intact
VARS='$DOMAIN:$STREAM_KEY:$HLS_FRAGMENT:$HLS_PLAYLIST_LENGTH:$CHAT_PORT'

envsubst "$VARS" < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

CERT="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"

if [ -f "$CERT" ]; then
    echo "SSL certificate found — starting with HTTPS config"
    envsubst "$VARS" < /etc/nginx/conf.d/stream.conf.template > /etc/nginx/conf.d/stream.conf
else
    echo "No SSL certificate found — starting with HTTP-only config"
    echo "Run: bash scripts/init-ssl.sh  to obtain a certificate, then restart the container."
    envsubst "$VARS" < /etc/nginx/conf.d/stream-http.conf.template > /etc/nginx/conf.d/stream.conf
fi

exec nginx -g 'daemon off;'
