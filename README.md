# PraCaL — นับแคลอาหารไทย

แอปนับแคลอรี่อาหารไทยสำหรับใช้ส่วนตัวและครอบครัว (PWA, offline-first)

## Features

### Logging
- **Online meal search** ผ่าน Claude API — เข้าใจอาหารไทย ตอบเป็นโภชนาการต่อจาน
- **Barcode scan + nutrition-label OCR** — สแกนสินค้าหรือถ่ายฉลากให้ AI อ่านค่า (Claude Sonnet)
- **375+ Thai meals + 88 branded products** preloaded — กะเพรา, ก๋วยเตี๋ยว, ส้มตำ, แกง, สเต็ก, ฟาสต์ฟู้ด, ของหวาน, เครื่องดื่ม
- **Custom meals** + **special meals** (บุฟเฟ่ / ร้านอาหาร / มื้อรวม)
- **Backdate logging** — เพิ่มอาหารและกิจกรรมย้อนหลังได้ถึง 30 วัน

### Insights
- **BMR + activity multiplier → TDEE** (Mifflin–St Jeor); แยก exercise log บนระดับกิจกรรมที่ไม่รวมไว้แล้ว
- **Goal-aware ring** — แสดง zone (lose / gain / maintain) ตามเป้าหมาย ไม่ใช่แค่ % filled
- **Streaks + freeze tokens** — บันทึกต่อเนื่อง มี token กันตกในวันพิเศษ
- **Weekly strip + reports + weight log**

### Planning
- **🍽️ มื้อต่อไปกินอะไรดี?** — real-time suggester เลือกเมนูตามงบเหลือ + tolerance + sort + favorites filter
- **📋 สร้างแผนอาหาร 1 / 3 / 7 / 14 วัน** — โหมด 1 วันบันทึกเข้าวันนี้ทันที / โหมดยาวเป็น preview
- **Swap drawer** — เปลี่ยนเมนูในแผนแบบ bottom sheet พร้อม search
- **Plan-edit mode** — ปรับ size / qty / addons ในแผนก่อน confirm

### Other
- **Multi-user** — สูงสุด 3 profile ต่อเครื่อง
- **Size multipliers** — 75% / 100% / 150% / 200% + custom
- **Add-ons** — ไข่ดาว, ไข่เจียว, ข้าวเพิ่ม, ผักเพิ่ม
- **Customizations** — เช่น ไม่ใส่หนัง / ไม่ใส่ผงชูรส (radio groups ในเมนูที่รองรับ)
- **PWA** — installable, works offline (except online search + OCR)

## Setup

### 1. Local test

```bash
# Serve locally (needs a static server)
npx serve .
# open http://localhost:3000
```

Online meal search and OCR won't work locally without `netlify dev`.

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

Uses Claude Haiku 4.5 (meal estimation) and Sonnet 4.6 (nutrition-label OCR):
- Meal search ≈ $0.001–0.002 per query (Haiku)
- Nutrition OCR ≈ $0.003–0.005 per scan (Sonnet)
- 100 actions/month ≈ $0.10–0.50

## Data

All data lives in the browser's **localStorage**. No cloud sync, no account, no server-side storage.
Clearing site data wipes the log. Use "Export" in settings to back up.

## Version

Current: **`v1.10.22`** — bump `VERSION` in [`service-worker.js`](service-worker.js) **and** [`index.html`](index.html) (both must match) when shipping updates so PWA clients auto-refresh.

## Project docs

- [`PROJECT_STATE.md`](PROJECT_STATE.md) — engineering truth: architecture, hard guardrails, current task, open questions
- [`AGENTS.md`](AGENTS.md) — operating model: roles, file ownership, approval gates
- [`TASK_BOARD.md`](TASK_BOARD.md) — live task state machine
- [`docs/decisions/`](docs/decisions) — decision records (DEC-NNN)
- [`docs/specs/`](docs/specs) — feature specs and implementation briefs

This README is a marketing-style overview. For *what's running*, *what cannot change without approval*, and *what's in flight*, read `PROJECT_STATE.md` and `TASK_BOARD.md` first.
