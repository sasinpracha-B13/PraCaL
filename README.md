# PraCaL — นับแคลอาหารไทย

แอปนับแคลอรี่อาหารไทยสำหรับใช้ส่วนตัวและครอบครัว (PWA, offline-first)

## Features

- **BMR-only calculation** — no fake activity levels, you add activity yourself
- **Online meal search** via Claude API (Thai food understanding)
- **85+ preloaded Thai meals** — กะเพรา, ก๋วยเตี๋ยว, ส้มตำ, แกง, ของหวาน, น้ำ
- **Multi-user** — up to 3 profiles on one device
- **Size multipliers** — 75% / 100% / 150% / 200% + custom
- **Add-ons** — ไข่ดาว, ไข่เจียว, ข้าวเพิ่ม, ผักเพิ่ม
- **PWA** — installable, works offline (except online search)

## Setup

### 1. Local test

```bash
# Serve locally (needs a static server)
npx serve .
# open http://localhost:3000
```

Online meal search won't work locally without `netlify dev`.

### 2. Deploy to Netlify

1. Push this folder to a GitHub repo named **PraCaL**
2. Go to https://app.netlify.com → New site from Git → pick the repo
3. Build command: (leave empty)
4. Publish directory: `.`
5. Functions directory: `netlify/functions` (auto-detected from netlify.toml)

### 3. Add your Anthropic API key

1. Get key from https://console.anthropic.com
2. In Netlify dashboard: **Site settings → Environment variables**
3. Add:
   - **Key:** `ANTHROPIC_API_KEY`
   - **Value:** `sk-ant-...` (your key)
4. Redeploy site (Deploys → Trigger deploy → Clear cache and deploy)

### 4. Install on phone

- Open Netlify URL in phone browser
- Chrome/Safari → "Add to Home Screen"
- Launch from home icon — runs fullscreen like a native app

## Cost

Claude Haiku is cheap. Each meal search ≈ $0.001–0.002
- 100 searches/month ≈ $0.10–0.20
- 1000 searches/month ≈ $1–2

## Data

All data lives in the browser's **localStorage**. No cloud sync, no account.
Clearing site data wipes the log. Use "Export" in settings to back up.

## Version

`v1.0.0` — bump `VERSION` in [service-worker.js](service-worker.js) when shipping updates so clients auto-refresh.
