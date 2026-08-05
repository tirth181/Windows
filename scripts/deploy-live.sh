#!/usr/bin/env bash
# Production-mode live deploy on this host (Postgres + API + Next + Cloudflare tunnel).
# Optional: export STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET before running to wire billing.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SECRETS_DIR="${SECRETS_DIR:-$ROOT/.local-secrets}"
ARTIFACTS="${ARTIFACTS:-/opt/cursor/artifacts}"
mkdir -p "$SECRETS_DIR" "$ARTIFACTS" /tmp

export PATH="$HOME/.dotnet:$PATH:${PATH:-}"

load_or_create_secret() {
  local file="$1" gen="$2"
  if [[ -f "$file" ]]; then
    cat "$file"
  else
    local v
    v="$(eval "$gen")"
    printf '%s' "$v" >"$file"
    chmod 600 "$file"
    printf '%s' "$v"
  fi
}

JWT_KEY="$(load_or_create_secret "$SECRETS_DIR/jwt.key" "openssl rand -base64 48")"
ACCESS_CODE="$(load_or_create_secret "$SECRETS_DIR/preview-access.code" "openssl rand -base64 18 | tr -d '/+=' | head -c 24")"
PG_PASS="$(load_or_create_secret "$SECRETS_DIR/pg.pass" "openssl rand -base64 24 | tr -d '/+='")"

# Ethereal SMTP (real SMTP handshake; messages captured at ethereal.email — swap for Resend/SES in prod)
if [[ ! -f "$SECRETS_DIR/smtp.json" ]]; then
  curl -fsS 'https://api.nodemailer.com/user' \
    -H 'Content-Type: application/json' \
    -d '{"requestor":"LogiForge","version":"1.0.0"}' >"$SECRETS_DIR/smtp.json"
  chmod 600 "$SECRETS_DIR/smtp.json"
fi
SMTP_USER="$(python3 -c 'import json;print(json.load(open("'"$SECRETS_DIR"'/smtp.json"))["user"])')"
SMTP_PASS="$(python3 -c 'import json;print(json.load(open("'"$SECRETS_DIR"'/smtp.json"))["pass"])')"
SMTP_HOST="$(python3 -c 'import json;print(json.load(open("'"$SECRETS_DIR"'/smtp.json"))["smtp"]["host"])')"
SMTP_PORT="$(python3 -c 'import json;print(json.load(open("'"$SECRETS_DIR"'/smtp.json"))["smtp"]["port"])')"

# Ensure DB role/database (password may already exist — keep logiforge/logiforge if role exists)
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'logiforge') THEN
    CREATE ROLE logiforge LOGIN PASSWORD 'logiforge';
  END IF;
END
\$\$;
SELECT 'ok';
SQL
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='logiforge'" | grep -q 1 \
  || sudo -u postgres createdb -O logiforge logiforge

# Stop previous live processes
pkill -f 'LogiForge.Api' 2>/dev/null || true
pkill -f 'next start -H 127.0.0.1 -p 3000' 2>/dev/null || true
pkill -f 'next-server' 2>/dev/null || true
pkill -f 'cloudflared tunnel --url http://127.0.0.1:3000' 2>/dev/null || true
sleep 1

# Publish API (Release)
cd "$ROOT/src/backend"
dotnet publish src/LogiForge.Api/LogiForge.Api.csproj -c Release -o /tmp/logiforge-api-publish /p:UseAppHost=false

# Build web with demo fallback disabled
cd "$ROOT/src/frontend"
export NEXT_PUBLIC_ALLOW_DEMO_FALLBACK=false
export NODE_ENV=production
npm ci --prefer-offline 2>/dev/null || npm install
npm run build

PUBLIC_URL_PLACEHOLDER="https://localhost"
start_api() {
  local public_url="$1"
  pkill -f 'LogiForge.Api.dll' 2>/dev/null || true
  sleep 0.5
  cd /tmp/logiforge-api-publish
  ASPNETCORE_ENVIRONMENT=Production \
  ASPNETCORE_URLS=http://127.0.0.1:5080 \
  ConnectionStrings__DefaultConnection='Host=127.0.0.1;Port=5432;Database=logiforge;Username=logiforge;Password=logiforge' \
  Jwt__Key="$JWT_KEY" \
  Jwt__Issuer=LogiForge \
  Jwt__Audience=LogiForge \
  Cors__Origins__0="$public_url" \
  App__PublicWebBaseUrl="$public_url" \
  App__TrialDays=14 \
  App__RequireEmailVerification=false \
  App__AllowDemoLoginFallback=false \
  Smtp__Host="$SMTP_HOST" \
  Smtp__Port="$SMTP_PORT" \
  Smtp__Username="$SMTP_USER" \
  Smtp__Password="$SMTP_PASS" \
  Smtp__FromEmail="noreply@logiforge.app" \
  Smtp__FromName="LogiForge" \
  Smtp__EnableSsl=true \
  Stripe__SecretKey="${STRIPE_SECRET_KEY:-}" \
  Stripe__PublishableKey="${STRIPE_PUBLISHABLE_KEY:-}" \
  Stripe__WebhookSecret="${STRIPE_WEBHOOK_SECRET:-}" \
  Stripe__PriceStarter="${STRIPE_PRICE_STARTER:-}" \
  Stripe__PriceGrowth="${STRIPE_PRICE_GROWTH:-}" \
  Stripe__PriceScale="${STRIPE_PRICE_SCALE:-}" \
  nohup dotnet LogiForge.Api.dll > /tmp/logiforge-api.log 2>&1 &
  echo $! > /tmp/logiforge-api.pid
}

start_api "$PUBLIC_URL_PLACEHOLDER"

# Wait for API health
for i in $(seq 1 40); do
  if curl -fsS http://127.0.0.1:5080/health/live >/dev/null 2>&1; then break; fi
  sleep 0.5
done
curl -fsS http://127.0.0.1:5080/health/live >/dev/null

# Start Next
cd "$ROOT/src/frontend"
API_ORIGIN=http://127.0.0.1:5080 \
PREVIEW_ACCESS_CODE="$ACCESS_CODE" \
NEXT_PUBLIC_ALLOW_DEMO_FALLBACK=false \
NODE_ENV=production \
nohup npx next start -H 127.0.0.1 -p 3000 > /tmp/logiforge-web.log 2>&1 &
echo $! > /tmp/logiforge-web.pid

for i in $(seq 1 40); do
  if curl -fsS -o /dev/null -w '%{http_code}' -H "Cookie: lf_preview_access=${ACCESS_CODE}" http://127.0.0.1:3000/login | grep -q 200; then break; fi
  sleep 0.5
done

# Cloudflare quick tunnel
if [[ ! -x /tmp/cloudflared ]]; then
  curl -fsSL -o /tmp/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
  chmod +x /tmp/cloudflared
fi
rm -f /tmp/cf-live.log
nohup /tmp/cloudflared tunnel --url http://127.0.0.1:3000 --protocol http2 --no-autoupdate > /tmp/cf-live.log 2>&1 &
echo $! > /tmp/cloudflared-live.pid

PUBLIC_URL=""
for i in $(seq 1 60); do
  PUBLIC_URL="$(rg -o 'https://[a-z0-9-]+\.trycloudflare\.com' /tmp/cf-live.log | tail -1 || true)"
  if [[ -n "$PUBLIC_URL" ]]; then break; fi
  sleep 1
done
if [[ -z "$PUBLIC_URL" ]]; then
  echo "Failed to obtain Cloudflare tunnel URL" >&2
  tail -50 /tmp/cf-live.log >&2 || true
  exit 1
fi

# Restart API with real public URL for CORS + email links
start_api "$PUBLIC_URL"
for i in $(seq 1 40); do
  if curl -fsS http://127.0.0.1:5080/health/live >/dev/null 2>&1; then break; fi
  sleep 0.5
done

# Optional Stripe catalog provisioning
if [[ -n "${STRIPE_SECRET_KEY:-}" ]]; then
  bash "$ROOT/scripts/provision-stripe.sh" || true
  # reload API with any newly written price ids
  if [[ -f "$SECRETS_DIR/stripe-prices.env" ]]; then
    # shellcheck disable=SC1090
    source "$SECRETS_DIR/stripe-prices.env"
    export STRIPE_PRICE_STARTER STRIPE_PRICE_GROWTH
    start_api "$PUBLIC_URL"
  fi
fi

cat > "$SECRETS_DIR/live.env" <<EOF
PUBLIC_URL=$PUBLIC_URL
PREVIEW_ACCESS_CODE=$ACCESS_CODE
API_ORIGIN=http://127.0.0.1:5080
JWT_KEY_FILE=$SECRETS_DIR/jwt.key
SMTP_USER=$SMTP_USER
SMTP_HOST=$SMTP_HOST
SMTP_PORT=$SMTP_PORT
ETHEREAL_WEB=https://ethereal.email/login
STRIPE_CONFIGURED=${STRIPE_SECRET_KEY:+yes}
EOF
chmod 600 "$SECRETS_DIR/live.env"

cat > "$ARTIFACTS/LIVE_DEPLOY.md" <<EOF
# LogiForge live deploy

- **URL:** $PUBLIC_URL
- **Access code:** \`$ACCESS_CODE\`
- **Demo fallback:** disabled
- **JWT:** strong key at \`.local-secrets/jwt.key\` (not committed)
- **SMTP:** Ethereal \`$SMTP_USER\` (messages appear at https://ethereal.email — not delivered to real inboxes)
- **Stripe:** ${STRIPE_SECRET_KEY:+configured from environment}${STRIPE_SECRET_KEY:-not configured — set STRIPE_SECRET_KEY and re-run scripts/deploy-live.sh}

## Try it
1. Open $PUBLIC_URL/access and enter the access code
2. Go to /signup and create a company (14-day trial)
3. Sign in and open /billing

Seeded admin (if DB was fresh): \`admin@harborline.com\` / \`ChangeMe!Harbor12\`
EOF

cp "$ARTIFACTS/LIVE_DEPLOY.md" "$ROOT/.local-secrets/LIVE_DEPLOY.md" 2>/dev/null || true
echo "LIVE_URL=$PUBLIC_URL"
echo "ACCESS_CODE=$ACCESS_CODE"
echo "Wrote $ARTIFACTS/LIVE_DEPLOY.md"
