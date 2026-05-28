# Changelog — autoflow

All notable changes documented here. Format: [Unreleased] / [Version] YYYY-MM-DD

---

## [2.1.0] — 2025-05-21 🚀 Major Security & Feature Release

### 🔴 Security Fixes (Critical)
- **REMOVED** hardcoded `SUPABASE_SERVICE_ROLE_KEY` from `server/db.ts` — now loaded from `SUPABASE_SERVICE_KEY` env var
- **FIXED** plain-text password storage in `registration_intents` — now uses `bcrypt.hash(password, 12)`
- **FIXED** OTP generation from `Math.random()` to `crypto.randomInt()` (cryptographically secure)
- **DOWNGRADED** Demo account from `role: 'admin'` to `role: 'viewer'`
- **ADDED** `helmet.js` for 11 security HTTP headers (CSP, HSTS, XSS-Protection, etc.)
- **ADDED** global `express-rate-limit` covering all API endpoints (was auth-only)
- **ADDED** `AdminRoute` component — server-level role check before rendering `/admin`
- **ADDED** RLS migrations for `registration_intents`, `plans`, `platform_settings`

### 📧 Email Service (New)
- **ADDED** `server/email.ts` — Resend integration with branded Arabic templates
- OTP verification emails sent on signup (no more plain-text OTP in response)
- Order status change notifications (delivered, shipped, cancelled, returned)
- Password reset email with secure link
- Beautiful dark-themed HTML email templates

### 🗺️ Google Maps Integration (New)
- **ADDED** `client/src/components/maps/ShipmentMap.tsx`
- Interactive dark-themed map with wilaya coordinates for all 58 wilayas
- Warehouse → Delivery polyline with animated arrow
- InfoWindow popup: order number, customer, status, carrier, tracking
- "Get Directions" button (opens Google Maps directions)
- Graceful placeholder if `VITE_GOOGLE_MAPS_API_KEY` not set
- Lazy-loaded — zero impact on initial bundle size

### 🤖 Automation Engine (Enhanced)
- **ADDED** `automation_rules` table with full CRUD API (`/api/automation-rules`)
- **ADDED** `AutomationRules.tsx` — visual rule builder with preview
- All 58 Algerian wilayas mapped to correct carriers (was ~20)
- Rules now loaded from DB per tenant (was hardcoded array)
- `bcrypt` password handling in signup flow
- Added `runStatusChangeRules()` for DB-driven custom rules

### 🗄️ Database (Migration 003)
- `orders.deleted_at` — soft delete instead of permanent deletion
- `UNIQUE INDEX` on `(tenant_id, order_number)` — prevents duplicates
- New indexes: `order_number`, `customer_phone`, `total`, `tenants.plan`
- `automation_rules` table with RLS
- `stores.last_sync`, `stores.webhook_secret` columns
- `get_tenant_analytics()` RPC function for aggregate stats
- `notifications.group_key/count` for notification grouping
- RLS enabled on `registration_intents` (no public access)
- RLS enabled on `plans` (public read, no write)
- RLS enabled on `platform_settings` (public read, no write)

### 🪝 Webhook Receiver (New)
- **ADDED** `POST /api/webhook/:storeId`
- HMAC-SHA256 signature verification for Shopify/WooCommerce
- Automatic order creation from webhook payload
- Updates `stores.orders_count` and `last_sync` on each webhook

### 📱 PWA & Performance
- **ADDED** `vite-plugin-pwa` with Service Worker and offline caching
- `public/sw.js` with push notification support
- `public/manifest.json` with shortcuts
- Manual code splitting: react, supabase, recharts, lucide, maps, three.js
- Removed `wouter` dependency (unused, ~10KB savings)
- `vite.config.ts` updated with Terser minification

### 🔔 Web Push Notifications
- **ADDED** `client/src/lib/pushNotifications.ts`
- VAPID key support (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`)
- Service Worker handles push events and notification clicks
- `isPushSupported()` utility for capability detection

### 🧩 New UI Components
- `PasswordStrength.tsx` — visual password strength indicator (Weak/Fair/Good/Strong)
- `Toast.tsx` — global toast notification system with slide-in animation
- `ConfirmModal.tsx` — deletion/action confirmation dialog
- `SkeletonTable.tsx` — animated loading skeleton for tables
- `EmptyState.tsx` — empty list states with action CTA
- `AdminPanel.tsx` — full admin dashboard (stats, users, devices, logs)
- `AdminRoute.tsx` — secure route guard for `/admin`
- `OrderDetailModal.tsx` — full order details with integrated map
- `AnalyticsFilters.tsx` — date range presets (Today, 7d, 30d, Month)
- `AutomationRules.tsx` — visual drag-and-drop rule builder

### 📊 API Improvements
- `GET /api/orders` — pagination (`page`, `limit`), date range filter (`from`, `to`), carrier/wilaya filter
- `GET /api/orders/export` — CSV with BOM (Arabic-safe in Excel), all filters applied
- `DELETE /api/orders` — soft delete (sets `deleted_at`) instead of hard delete
- `POST /api/orders` — plan limit enforcement (`orders_limit` from `plans` table)
- `GET /api/analytics` — optimized (only needed fields), 30-day charts, carrier/wilaya breakdown
- `POST /api/admin/action` — new actions: `ban_device`, `extend_trial`, `set_plan`, `activate_offer`
- `GET /api/admin/devices` — list all device sessions
- `POST /api/automation-rules`, `PUT /api/automation-rules/:id`, `DELETE /api/automation-rules/:id`

### 🧪 Tests
- **ADDED** Playwright E2E test suite (`tests/e2e.spec.ts`)
- `playwright.config.ts` — Desktop Chrome + Mobile (iPhone 14)
- Tests: auth flow, dashboard load, order list, admin route protection, API auth, performance

### 📄 Documentation
- `CHANGELOG.md` — this file
- `SETUP.md` — updated with all new env vars, Google Maps setup, VAPID generation
- `TEST_REPORT.md` — test results summary
- `.env.example` — fully documented with all 13 variables

---

## [2.0.0] — Previous Version
- Initial release of autoflow platform
- Basic order management, analytics, Supabase integration
- Demo mode, trial system, carrier assignment

---

## [2.1.2] — 2025-05-24 🔴 إصلاح حرج: إنشاء الحساب + OTP

### إصلاحات حرجة
- **[حرج] كلمة المرور لا تعمل بعد إنشاء الحساب**: الكود القديم كان يحفظ `bcrypt.hash(password)` (تشفير أحادي غير عكسي) ويرسله لـ Supabase Auth. النتيجة: الحساب يُنشأ لكن لا يمكن تسجيل الدخول أبداً. **الحل**: استخدام **AES-256-CBC** (قابل للعكس) → نفك التشفير عند verify_otp → نرسل كلمة المرور الأصلية لـ Supabase.
- **[حرج] "No pending registration found"**: الاستعلام `intentQuery.eq(...) as typeof intentQuery` يفشل في runtime. **الحل**: البحث مباشرة بالـ email بدون TypeScript casting.
- **[عالي] verify_otp لا يرسل email**: في بعض الحالات يضيع `registrationId` من state. **الحل**: email مرسَل دائماً عبر `AUTH.verifyOtp(registrationId, code, email)`.
- **[متوسط] carriers.ts أخطاء TypeScript**: `.catch()` غير موجودة على Supabase PostgrestFilterBuilder. **الحل**: استبدال بـ `try/catch`.
- **[متوسط] build script ناقص**: لم يكن يشمل `carriers.ts`. **الحل**: تحديث `package.json` scripts.

### التغييرات التقنية
- `server/index.ts`: دالتا `encryptPassword()` + `decryptPassword()` بـ AES-256-CBC
- `server/index.ts`: verify_otp يستخدم `.eq('email').maybeSingle()` بدلاً من query chaining
- `server/carriers.ts`: استبدال `.catch()` بـ `try/catch`
- `package.json`: build script يشمل جميع ملفات server

---

## [2.2.0] — 2025-05-25 🚀 Major Feature Release

### 🎨 Logo & UI
- **شعار جديد احترافي** — SVG مع شاحنة + gradient بنفسجي، يظهر في جميع الصفحات
- **حُذف قسم Brandings** من الإعدادات (غير ضروري)
- **حُذف قسم Integrations** واستُبدل بـ Carriers فقط

### 🚚 Carriers (حقيقية)
- 7 شركات شحن: Yalidine, ZR Express, Noest, Amana, EMS, DHL, FedEx
- كل شركة: شعار + مفتاح API + اختبار الاتصال الحقيقي
- حفظ في `carrier_configs` table

### 🔔 Push Notifications
- VAPID Web Push حقيقي — يعمل حتى مع إغلاق المتصفح
- `POST /api/push/subscribe` — تسجيل subscription
- `POST /api/push/test` — اختبار فوري
- Service Worker لاستقبال الإشعارات offline
- حفظ في `push_subscriptions` table

### 🔒 Security (حقيقية)
- **تغيير كلمة المرور** — التحقق من الكلمة الحالية أولاً + Supabase Auth update
- **2FA/TOTP** — Google Authenticator, Authy — QR code حقيقي
- **إدارة الجلسات** — عرض وإلغاء كل device session
- **`POST /api/auth/change-password`** — server-side verification

### 🤖 AI Routing
- تحليل 90 يوم من بيانات التوصيل per wilaya
- معادلة: 60% success rate + 40% speed score
- Fallback تلقائي للـ rule-based إذا البيانات غير كافية
- تسجيل كل قرار في `ai_routing_log`
- `POST /api/ai/assign-carrier`

### 📧 SMS Notifications
- دعم Twilio + Custom HTTP API + dev mode
- إرسال تلقائي عند الشحن/التوصيل
- `POST /api/sms/test` — اختبار الإرسال
- إعدادات مخزنة في `platform_settings`

### ⚙️ Automation (حقيقية)
- **Auto-retry failed** — إعادة جدولة بعد 24 ساعة تلقائياً
- **Auto-send SMS** — يُرسل فعلياً عبر provider المُهيأ
- **AI routing toggle** — يؤثر على assignCarrier الفعلي
- كل الإعدادات محفوظة في DB ومؤثرة على السلوك

### 💳 Billing
- بطاقات الخطط مطابقة لـ Landing page
- عرض الاستخدام الفعلي (طلبات الشهر)
- Progress bar لتتبع الحد

### 🗄️ Migrations
- `migration 008` — push_subscriptions, ai_routing_log, carrier_configs, 2FA columns

### 🌐 API جديد
- `GET/DELETE /api/push/subscribe`
- `POST /api/push/test`
- `GET /api/push/vapid-key`
- `GET/POST /api/2fa/setup`, `POST /api/2fa/verify`, `DELETE /api/2fa`
- `POST /api/ai/assign-carrier`, `GET /api/ai/routing-log`
- `PUT /api/carrier-configs`, `POST /api/carrier-configs/test`
- `PUT /api/settings/automation`
- `POST /api/auth/change-password`
- `PUT /api/profiles/language`
- `GET /api/analytics/range`
- `POST /api/sms/test`

---

## [2.3.0] — 2025-05-28 🔧 Critical Bug Fixes + UX

### 🔴 إصلاحات حرجة
- **[FIXED] إنشاء الطلب**: `handleAdd` الآن يستخدم `ORDERS.create()` الصحيح مع `await fetchAll()` فوري
- **[FIXED] كلمة مرور Demo**: `AutoflowDemo2025!` (متوافق للخلف مع `demo123`)
- **[FIXED] Demo password breach warning**: كلمة مرور قوية تمنع تحذير Chrome

### 🗺️ ولايات
- **58 ولاية كاملة** في WILAYAS constant + migration 009
- `WilayaSelect` — قائمة منسدلة قابلة للبحث مع تجميع حسب المنطقة
- تعيين carrier تلقائي عند اختيار الولاية
- `carrierRules.ts` — منطق واضح ومركزي

### 📐 تصميم
- WhatsApp button: `#25D366` رسمي + animation نبضي + hover effect
- زر أكبر (44px) وأوضح في الـ header

### 🗄️ Migration
- `009_wilayas.sql` — 58 ولاية مع code + اسم عربي + فرنسي + إنجليزي + ناقل
