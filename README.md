# Stream

A self-hosted live game streaming platform. OBS pushes an RTMP stream to your VPS, which transcodes it to HLS and serves it through a Video.js player with live chat and stream status.

## Features

- High-quality HLS video playback via Video.js + HLS.js
- Low-latency tunable via `HLS_FRAGMENT` and `HLS_PLAYLIST_LENGTH`
- Live chat with WebSockets
- Stream status badge (live / offline), auto-detected
- Mobile-responsive dark UI
- HTTPS via Let's Encrypt
- Fully containerized with Docker Compose — one `.env` file to configure everything

## Architecture

```
OBS  ──RTMP:1935──►  nginx (rtmp module)  ──HLS──►  /tmp/hls/
                            │
                     serves over HTTPS
                            │
                ┌───────────┴───────────┐
             /hls/*                 /chat, /api/
          (HLS segments)      (WebSocket + status API)
                                        │
                               Node.js chat server
```

## Requirements

- Docker + Docker Compose v2
- A domain name with DNS pointing to your VPS
- Ports `80`, `443`, and `1935` open on the VPS firewall

## Configuration

All configuration lives in a single `.env` file.

```bash
cp .env.template .env
```

Then edit `.env`:

| Variable | Description | Default |
|---|---|---|
| `DOMAIN` | Your domain name | `yourdomain.com` |
| `CERTBOT_EMAIL` | Email for Let's Encrypt notifications | — |
| `STREAM_KEY` | OBS stream key (acts as a password) | `stream` |
| `HLS_FRAGMENT` | HLS segment duration in seconds (lower = less latency) | `2` |
| `HLS_PLAYLIST_LENGTH` | HLS playlist window in seconds | `10` |
| `CHAT_PORT` | Internal port for the chat server | `3000` |
| `STATUS_STALE_SECONDS` | Seconds without a new HLS segment before stream shows as offline | `15` |

## First-time Setup

### 1. Obtain an SSL certificate

Run this once to get a Let's Encrypt certificate. Make sure your domain DNS is already pointing to the VPS before running.

```bash
bash scripts/init-ssl.sh
```

This will:
1. Start nginx temporarily for the ACME HTTP challenge
2. Request a certificate from Let's Encrypt
3. Reload nginx with HTTPS enabled

### 2. Start the platform

```bash
docker compose up -d
```

### 3. Set up SSL auto-renewal

Add this to your crontab (`crontab -e`):

```
0 3 * * * cd /path/to/stream && docker compose run --rm certbot renew && docker compose exec nginx nginx -s reload
```

## OBS Setup

In OBS, go to **Settings → Stream**:

| Field | Value |
|---|---|
| Service | Custom |
| Server | `rtmp://yourdomain.com/live` |
| Stream Key | The value of `STREAM_KEY` in your `.env` |

Hit **Start Streaming** — the site will detect the stream within a few seconds and switch from "Offline" to "● Live".

## Usage

Once live, open `https://yourdomain.com` in a browser. Viewers can:

- Watch the stream with the Video.js player (muted autoplay, unmute manually)
- Chat by entering a username and message
- See the live/offline status badge in the header

## Managing the Platform

```bash
# View logs
docker compose logs -f

# View logs for a specific service
docker compose logs -f nginx
docker compose logs -f chat

# Stop everything
docker compose down

# Rebuild after code changes
docker compose up -d --build

# Renew SSL manually
docker compose run --rm certbot renew
docker compose exec nginx nginx -s reload
```

## Project Structure

```
stream/
├── .env.template              # configuration template
├── docker-compose.yml
├── nginx/
│   ├── Dockerfile
│   ├── entrypoint.sh          # substitutes .env vars into configs at startup
│   ├── nginx.conf.template    # RTMP ingestion + HLS output
│   └── conf.d/
│       └── stream.conf.template  # HTTP→HTTPS, HLS serving, chat proxy
├── chat-server/
│   ├── Dockerfile
│   ├── server.js              # WebSocket broadcast + /api/status
│   └── package.json
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js                 # player, chat, status polling
└── scripts/
    └── init-ssl.sh            # one-time SSL bootstrap
```

## Troubleshooting

**Stream shows as offline after going live in OBS**
- Check that port `1935` is open on your VPS firewall
- Verify the stream key in OBS matches `STREAM_KEY` in `.env`
- Run `docker compose logs nginx` to see RTMP connection attempts

**SSL certificate errors**
- Ensure ports `80` and `443` are open before running `init-ssl.sh`
- Confirm your domain DNS is pointing to the VPS IP (`dig yourdomain.com`)

**Chat not connecting**
- Check `docker compose logs chat` for errors
- Verify nginx is proxying `/chat` correctly via `docker compose logs nginx`

**HLS segments not appearing**
- Run `docker compose exec nginx ls /tmp/hls` while streaming to confirm segments are being written
