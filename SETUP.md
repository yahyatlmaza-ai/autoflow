# autoflow v2.1.0 — Setup Guide

## Prerequisites
- Node.js ≥ 20, npm ≥ 10
- Supabase project (free tier works)
- Resend account (free: 3,000 emails/month)
- Render.com account (free or paid)
- Google Cloud account (for Maps API)

---

## 1. Clone & Install

```bash
git clone https://github.com/yahyatlmaza-ai/autoflow
cd autoflow
npm install
```

---

## 2. Environment Variables

Copy `.env.example` to `.env` and fill in values:

```bash
cp .env.example .env
```

### Required Variables

| Variable | Where to Get | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase → Settings → API | Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Settings → API | `anon` `public` key |
| `SUPABASE_URL` | Same as above | Server-side |
| `SUPABASE_SERVICE_KEY` | Supabase → Settings → API | **NEVER commit!** |
| `JWT_SECRET` | Generate below | 64-char hex string |
| `RESEND_API_KEY` | resend.com → API Keys | Starts with `re_` |
| `RESEND_FROM_EMAIL` | Your verified domain | e.g. `noreply@yourdomain.com` |

### Generate JWT_SECRET
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Optional Variables

| Variable | Purpose |
|---|---|
| `VITE_GOOGLE_MAPS_API_KEY` | Shipment map (see Section 5) |
| `VAPID_PUBLIC_KEY` | Web push notifications |
| `VAPID_PRIVATE_KEY` | Web push notifications |
| `VITE_VAPID_PUBLIC_KEY` | Web push (client-side) |
| `SENTRY_DSN` | Error monitoring |
| `ENABLE_DEMO_MODE` | Set `false` in production |

---

## 3. Database Setup (Supabase)

Run migrations in order in Supabase SQL Editor:

```sql
-- 1. Base schema
-- Paste content of: migrations/001_schema.sql

-- 2. Device management
-- Paste content of: migrations/002_devices.sql

-- 3. Security & improvements (NEW)
-- Paste content of: migrations/003_improvements.sql
```

### Enable pg_cron (optional — for auto-cleanup)
In Supabase Dashboard → Database → Extensions → enable `pg_cron`, then run:
```sql
SELECT cron.schedule('cleanup-reg-intents', '0 * * * *',
  $$SELECT cleanup_expired_registrations()$$);
```

---

## 4. Run Locally

```bash
# Development (frontend + backend with hot reload)
npm run dev

# Or separately:
npm run server   # backend on :3000
npm run client   # frontend on :5173
```

---

## 5. Google Maps Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Maps JavaScript API**
4. Create an API key: APIs & Services → Credentials → Create Credentials
5. Restrict the key to your domain (important for production)
6. Add to your `.env`:
   ```
   VITE_GOOGLE_MAPS_API_KEY=AIzaSy_your_key_here
   ```

The map will show a placeholder if the key is missing — no errors.

---

## 6. Web Push Notifications Setup

```bash
# Generate VAPID keys
npx web-push generate-vapid-keys
```

Copy both keys to `.env`:
```
VAPID_PUBLIC_KEY=BHxxx...
VAPID_PRIVATE_KEY=xxx...
VITE_VAPID_PUBLIC_KEY=BHxxx...  (same as public)
```

---

## 7. Email Setup (Resend)

1. Sign up at [resend.com](https://resend.com)
2. Add and verify your domain
3. Create an API key
4. Add `RESEND_API_KEY` and `RESEND_FROM_EMAIL` to `.env`

For development, you can send to any email without domain verification.

---

## 8. Deploy to Render.com

1. Push your code to GitHub
2. Create a new **Web Service** in Render
3. Build Command: `npm install && npm run build`
4. Start Command: `node dist/server/index.js`
5. Add all environment variables in Render Dashboard → Environment

### Keep Alive (Free Tier)
Add a UptimeRobot monitor pointing to `https://your-app.onrender.com/health` every 10 minutes.

---

## 9. Webhook Setup (Shopify / WooCommerce)

### Shopify
In your Shopify store: Settings → Notifications → Webhooks → Create webhook
- Event: `Order creation`
- URL: `https://your-app.onrender.com/api/webhook/{YOUR_STORE_ID}`

### WooCommerce
WooCommerce → Settings → Advanced → Webhooks → Add webhook
- Topic: `Order created`
- Delivery URL: `https://your-app.onrender.com/api/webhook/{YOUR_STORE_ID}`

---

## 10. Verify Installation

```bash
# Run E2E tests (requires Playwright)
npx playwright test

# Or test health endpoint
curl https://your-app.onrender.com/health
# Expected: {"status":"ok","version":"2.1.0"}
```

---

## Troubleshooting

| Issue | Solution |
|---|---|
| OTP not received | Check `RESEND_API_KEY` and sender domain verification |
| Map not loading | Verify `VITE_GOOGLE_MAPS_API_KEY` and Maps JavaScript API enabled |
| Auth errors after deploy | Ensure `JWT_SECRET` matches between env and deploy |
| Supabase 403 errors | Run migration 003 to fix RLS policies |
| Cold start (30-60s) | Upgrade Render to paid tier or use UptimeRobot |
