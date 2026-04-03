#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: .env file not found at $ENV_FILE"
  echo "Copy .env.template to .env and fill in your values first."
  exit 1
fi

# shellcheck source=/dev/null
source "$ENV_FILE"

: "${DOMAIN:?DOMAIN is not set in .env}"
: "${CERTBOT_EMAIL:?CERTBOT_EMAIL is not set in .env}"

cd "$SCRIPT_DIR/.."

echo ">>> Starting nginx (HTTP only) for ACME challenge..."
docker compose up -d nginx

echo ">>> Waiting for nginx to be ready..."
sleep 3

echo ">>> Requesting Let's Encrypt certificate for $DOMAIN..."
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  --email "$CERTBOT_EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN"

echo ">>> Restarting nginx to load HTTPS config..."
docker compose restart nginx

echo ""
echo "SSL certificate obtained successfully!"
echo "Add this to your crontab for automatic renewal:"
echo "  0 3 * * * cd $(pwd) && docker compose run --rm certbot renew && docker compose exec nginx nginx -s reload"
