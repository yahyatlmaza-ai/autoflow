# 🐙 auto Flow — Algeria's #1 Logistics Platform

> Production-ready logistics SaaS platform for Algerian e-commerce

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.example .env
# Fill in your Supabase URL, keys, and JWT secret

# 3. Run database migrations
# Paste migrations/001_schema.sql into your Supabase SQL Editor

# 4. Start development server
npm run dev
Visit http://localhost:3000

🔑 Demo Login
text
Email:    demo@autoflow.dz
Password: demo123
🛠 Tech Stack
Layer	Technology
Frontend	React 19 + TypeScript + Vite
Styling	TailwindCSS v4 + shadcn/ui
Animations	Framer Motion
Backend	Express.js (Node 20)
Database	Supabase PostgreSQL
Auth	JWT + Supabase Auth
Realtime	Supabase Realtime
📁 Project Structure
text
autoflow/
├── client/                 # React frontend
│   ├── src/
│   │   ├── context/        # AppContext (global state)
│   │   ├── pages/          # All pages
│   │   ├── components/     # Reusable components
│   │   └── lib/            # Utilities, API client, Supabase
├── server/                 # Express backend
│   ├── index.ts            # All API routes
│   ├── middleware.ts        # JWT auth, rate limiting, sanitization
│   ├── automation.ts       # Order automation engine
│   └── db.ts               # Supabase admin client
├── migrations/
│   └── 001_schema.sql      # Complete database schema
├── .env.example
└── package.json
☁️ Deployment
Frontend + Backend → Render
bash
# Build command
npm install && npm run build

# Start command
npm start

# Environment variables (add in Render dashboard)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
JWT_SECRET=your-secret-key
NODE_VERSION=22.x
NODE_OPTIONS=--no-node-snapshot
Database → Supabase
Create project at supabase.com

Run migrations/001_schema.sql in SQL Editor

Enable Realtime for notifications, orders, activity_logs

📋 Pricing
Plan	Price	Period
Starter	Free	10-day trial
Professional	20,000 DZD	180 days
VIP Lifetime	45,000 DZD	5.5 years
💬 Support
WhatsApp: +213 794 157 508