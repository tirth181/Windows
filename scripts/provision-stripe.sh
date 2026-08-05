#!/usr/bin/env bash
# Create Starter/Growth products+prices in Stripe and write price IDs for the API.
# Requires: STRIPE_SECRET_KEY (sk_test_… or sk_live_…)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SECRETS_DIR="${SECRETS_DIR:-$ROOT/.local-secrets}"
mkdir -p "$SECRETS_DIR"

if [[ -z "${STRIPE_SECRET_KEY:-}" ]]; then
  echo "STRIPE_SECRET_KEY is required" >&2
  exit 1
fi

auth=(-u "${STRIPE_SECRET_KEY}:")

create_price() {
  local name="$1" amount="$2" nickname="$3"
  local product
  product="$(curl -fsS https://api.stripe.com/v1/products \
    "${auth[@]}" \
    -d "name=LogiForge ${name}" \
    -d "description=LogiForge ${name} plan" \
    | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')"
  curl -fsS https://api.stripe.com/v1/prices \
    "${auth[@]}" \
    -d "product=${product}" \
    -d "unit_amount=${amount}" \
    -d "currency=usd" \
    -d "recurring[interval]=month" \
    -d "nickname=${nickname}" \
    | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])'
}

STARTER="$(create_price "Starter" 29900 "starter")"
GROWTH="$(create_price "Growth" 79900 "growth")"

cat > "$SECRETS_DIR/stripe-prices.env" <<EOF
STRIPE_PRICE_STARTER=$STARTER
STRIPE_PRICE_GROWTH=$GROWTH
EOF
chmod 600 "$SECRETS_DIR/stripe-prices.env"
echo "Wrote $SECRETS_DIR/stripe-prices.env"
echo "Starter=$STARTER Growth=$GROWTH"
echo "Configure webhook in Stripe Dashboard → ${PUBLIC_URL:-https://YOUR_HOST}/api/v1/billing/webhook"
echo "Events: checkout.session.completed, customer.subscription.*, invoice.payment_failed"
