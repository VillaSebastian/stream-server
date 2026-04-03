FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    nginx \
    libnginx-mod-rtmp \
    gettext-base \
    && rm -rf /var/lib/apt/lists/*

COPY nginx.conf.template /etc/nginx/nginx.conf.template
COPY conf.d/stream.conf.template /etc/nginx/conf.d/stream.conf.template
COPY conf.d/stream-http.conf.template /etc/nginx/conf.d/stream-http.conf.template
COPY entrypoint.sh /entrypoint.sh

RUN mkdir -p /tmp/hls /var/www/stream /var/www/certbot

EXPOSE 80 443 1935

ENTRYPOINT ["/bin/bash", "/entrypoint.sh"]
