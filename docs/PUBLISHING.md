# Fynvo publishing guide

Fynvo is an **original** invoicing + budgeting product. It is not affiliated with Zoho Corporation or any other invoice brand. Do not use third-party trademarks, logos, screenshots, copy, or distinctive trade dress.

## What you can ship today

- Web application (Next.js)
- Installable Progressive Web App (`manifest.webmanifest`)
- Subscription plan gates (Starter / Pro / Business) ready for payment providers

## Monetization model

| Plan | Price | Entitlements |
|------|-------|--------------|
| Starter | Free | 5 invoices/mo, 10 clients, 1 personal budget |
| Pro | $9.99/mo or $99/yr | Unlimited invoices, family budgets, clean PDFs |
| Business | $24.99/mo or $249/yr | Company budgets, advanced reports |

### Web billing (recommended first)

1. Create Stripe products/prices for `pro` and `business` (monthly + yearly).
2. Add Checkout Session + Customer Portal endpoints.
3. On webhook `customer.subscription.updated`, set the org `plan` entitlement in your database.
4. Keep the local demo `setPlan()` only for development.

### Apple App Store

1. Wrap the web app with **Capacitor** or rebuild UI in **Expo**.
2. Create Auto-Renewable Subscriptions in App Store Connect with product IDs matching Fynvo plans.
3. Use StoreKit 2 + a server receipt/JWS validator.
4. Required: Privacy Policy URL, Terms of Use (EULA), support URL, account deletion path.

### Google Play

1. Same Capacitor/Expo binary family as iOS when possible.
2. Create subscriptions in Play Console.
3. Use Google Play Billing Library + real-time developer notifications to your backend.
4. Required: Data safety form, privacy policy, content rating questionnaire.

## Suggested Capacitor packaging

```bash
npm run build
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap init Fynvo com.yourcompany.fynvo --web-dir=out
# enable next static export or host remotely and use a WebView shell
npx cap add ios
npx cap add android
npx cap sync
```

For production, prefer a hosted HTTPS web origin inside Capacitor so auth, Stripe Customer Portal, and updates stay centralized — while IAP handles mobile subscriptions.

## Copyright / trademark hygiene

- Keep the brand name **Fynvo** (or another original name you own).
- Never claim “Zoho alternative clone” in store metadata.
- Write original screenshots, copy, and help docs.
- Do not copy Zoho Invoice layouts, icons, color systems, or marketing language.
- Consider a trademark search before public launch in your target countries.
- Add your own Privacy Policy and Terms before charging real money.

## Launch checklist

1. Move from localStorage to a real backend (Postgres + auth).
2. Add Stripe + webhook entitlement sync.
3. Add email sending for invoices (Resend/Postmark).
4. Host web on Vercel/Cloudflare.
5. Package iOS/Android, submit with subscription products.
6. Publish privacy policy + support email.
7. Soft-launch, then raise prices or add annual discounts.
