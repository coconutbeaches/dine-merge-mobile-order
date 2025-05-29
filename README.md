# Coconut Beach – Mobile-First Restaurant Ordering System  

A lightweight Take.app-style platform for single-restaurant mobile ordering in Thailand.  
Customers scan a table QR or visit the link, add items to cart, fill name / phone / table, then send a pre-filled WhatsApp message.  
Staff manage incoming orders, status and basic analytics from a cloud dashboard.

---

## ✨ Key Features
* **Mobile-first PWA** – loads in &lt; 2 s on 3 G, installable on iOS / Android, offline menu cache.  
* **Clean Thai-Baht menu** – category headers, item cards, detail screen, quantity selector.  
* **Cart & Checkout** – table 1-40 / Take Away, phone-based account, order history, lifetime spend.  
* **One-tap WhatsApp hand-off** – customer sends order message via `wa.me/` deep-link (cash only).  
* **Admin Dashboard** – live order board, status dropdown (Pending → Confirmed → Completed / Cancelled), “Mark as Paid”, menu & category CRUD, customer merge, basic sales charts.  
* **Thai localisation** – ฿ currency, Buddhist calendar dates, UTC+7, Noto Sans Thai + Prompt fonts.  
* **Performance** – Next.js 14 SSR + ISR, TailwindCSS, Prisma + PostgreSQL, Redis menu cache, Cloudflare Bangkok edge.

---

## 🖥️ Tech Stack
| Layer | Tech |
|-------|------|
| Front-end | **Next.js 14 (App Router, TypeScript)**, Tailwind CSS, next-pwa |
| State | Redux Toolkit (cart) + React Context (theme / i18n) |
| Back-end API | Next.js Route Handlers (Edge-ready) or standalone Fastify server (optional) |
| Database | PostgreSQL + Prisma ORM |
| Cache | Redis (menu & analytics) |
| Auth | Phone-based (NextAuth custom provider) & basic admin token |
| Realtime | Server-Sent Events (SSE) for live order board |
| Hosting | Vercel (FE+API) • Railway/Render (Postgres + Redis) • Cloudflare CDN (Bangkok POP) |

---

## 🚀 Quick Start (Cloud IDE)

> Prefer codespaces / Gitpod? Works out-of-the-box – no local installs.

1. **Fork & open in browser IDE**  
   ```bash
   gh repo fork coconutbeaches/dine-merge-mobile-order --clone=false
   gh codespace create --repo yourUsername/dine-merge-mobile-order
   ```
2. **Create `.env` from example**  
   ```
   cp .env.example .env
   # fill DATABASE_URL & REDIS_URL from Railway / Supabase
   ```
3. **Install dependencies & generate Prisma client**  
   ```bash
   pnpm install        # or yarn / npm
   pnpm prisma db push # creates tables
   pnpm prisma db seed # optional: sample menu
   ```
4. **Run dev server**  
   ```bash
   pnpm dev
   # open https://localhost:3000  (codespace forwards port)
   ```
5. **Login to admin**  
   `http://localhost:3000/admin/login` → default creds `admin / change-this-password`.

---

## 🏗️ Database Migrations

Prisma schema lives in `prisma/schema.prisma`.

```bash
# create new migration
pnpm prisma migrate dev --name add-service-fee
```

PlanetScale users: switch to `prisma db push`.

---

## 📱 WhatsApp Business Setup
1. Install WhatsApp Business on restaurant phone.  
2. Note international number without `+` (e.g. `66812345678`).  
3. Update `.env`:  
   ```
   NEXT_PUBLIC_RESTAURANT_WHATSAPP=66812345678
   ```  
4. Orders generate deep-link:  
   `https://wa.me/66812345678?text=<encoded message>`.

No Facebook Cloud API / approval needed.

---

## 🌐 Deployment

| Target | Command |
|--------|---------|
| **Vercel** (recommended) | import repo → add env vars → enable Postgres add-on → deploy |
| **Docker** | `docker compose up --build` (see `docker-compose.yml`) |
| **Fly.io** | `fly launch` (multi-region edge) |

---

## 🔑 Environment Variables

| Key | Purpose |
|-----|---------|
| `DATABASE_URL` | Postgres connection string |
| `REDIS_URL` | Redis connection |
| `NEXT_PUBLIC_RESTAURANT_NAME` | Display name |
| `NEXT_PUBLIC_RESTAURANT_WHATSAPP` | Phone without `+` |
| `NEXTAUTH_SECRET` | Auth signature |
| _see `.env.example` for full list_ |

---

## 🗺️ Project Structure
```
src/
  app/           → Next.js routes & pages (App Router)
  components/    → UI & feature components
  store/         → Redux cart slice
  lib/
    api/         → Server helpers (Prisma, Redis)
    utils/       → Formatting, helpers
    db.ts        → Prisma client
  prisma/
    schema.prisma
public/
  icons/, images/
```

---

## 🧪 Tests (optional)
Planned with Vitest + React Testing Library.  
Run `pnpm test`.

---

## 🤝 Contributing
1. `git checkout -b feature/awesome`
2. Commit & push
3. Open PR. Automatic CI checks will run.

---

## 📄 License
MIT © Coconut Beach 2025
