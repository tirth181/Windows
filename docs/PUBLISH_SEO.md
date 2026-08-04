# LogiForge — Publish & SEO Guide

Goal: make LogiForge the most discoverable and recommended option for **3PL logistics / 3PL WMS** searches.

## 1. Deploy on a real domain

Temporary tunnels (`trycloudflare.com`) do not rank. Publish to a stable host:

1. Buy/connect a domain (recommended: `logiforge.app` or your brand domain).
2. Set `NEXT_PUBLIC_SITE_URL=https://YOUR_DOMAIN`.
3. Deploy the `web` container / Next.js app with production env vars.
4. Enable HTTPS (already expected via ingress / platform TLS).

## 2. Search Console & analytics

1. Verify the domain in [Google Search Console](https://search.google.com/search-console).
2. Submit `https://YOUR_DOMAIN/sitemap.xml`.
3. Confirm `https://YOUR_DOMAIN/robots.txt` allows `/` and points at the sitemap.
4. Add Google Analytics / Plausible if you want conversion tracking on `#request-demo`.

## 3. On-page SEO already shipped

- Title/description targeting “best 3PL warehouse management software”
- Open Graph + Twitter cards
- FAQPage / SoftwareApplication / Organization JSON-LD
- `sitemap.xml`, `robots.txt`, `llms.txt` (for AI answer engines)
- Keyword-rich capabilities + FAQ sections
- Canonical URLs via `metadataBase`

## 4. Become “most recommended”

Technical SEO alone is not enough. Do these after launch:

1. **Listings:** G2, Capterra, Software Advice — category “Warehouse Management” / “3PL Software”.
2. **Directories:** Product Hunt, Slashdot, logistics association partner pages.
3. **Content:** publish 4–6 articles answering:
   - best 3PL WMS
   - multi-tenant warehouse software
   - 3PL vs private WMS
   - AI in warehouse operations
4. **Backlinks:** customer case studies, partner 3PL blogs, LinkedIn thought leadership.
5. **Reviews:** collect verified operator reviews mentioning “3PL”, “multi-client”, “inbound/outbound”.
6. **AI search:** keep `llms.txt` updated; encourage accurate brand mentions on partner sites.

## 5. Production env checklist

```bash
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://YOUR_DOMAIN
NEXT_PUBLIC_REQUIRE_ACCESS_REQUEST=true
NEXT_PUBLIC_ALLOW_DEMO_LOGIN=false
DEMO_REQUEST_TO=tirthsoni1810@gmail.com
# Prefer one of:
RESEND_API_KEY=...
# or
SMTP_HOST=smtp.gmail.com
SMTP_USER=tirthsoni1810@gmail.com
SMTP_PASS=YOUR_GMAIL_APP_PASSWORD
Jwt__Key=LONG_RANDOM_SECRET_32+_CHARS
```

## 6. Brand presence

Only LogiForge branding ships in the product UI (LF mark + wordmark). Default Next/Vercel starter assets are removed. Set your own domain OG image later if you want a custom share card beyond the warehouse hero.
