# Take.app Mobile Restaurant Ordering System

This project is a mobile-first restaurant ordering platform for a single restaurant in Thailand, inspired by Take.app/coconut. It prioritizes speed, simplicity, and mobile optimization with cash-only payments. The system focuses on customer account management, order history tracking, and the ability to merge duplicate customer accounts.

## Table of Contents

- [Features](#features)
- [Technical Stack](#technical-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
  - [Running the Application](#running-the-application)
- [Deployment](#deployment)
- [Automated Build Monitoring (GitHub Actions)](#automated-build-monitoring-github-actions)
- [Contributing](#contributing)
- [License](#license)

## Features

### Customer-Facing Mobile Website

- Clean, minimalist menu display with item names and prices in Thai Baht (฿)
- Mobile-first responsive design for Thai mobile users
- Fast loading times (under 2 seconds)
- Simple ordering interface with cash payment only
- Customer account system with order history
- Total lifetime spending display for customers
- English language support
- Instagram integration link
- Progressive Web App (PWA) capabilities for offline menu viewing and native app-like experience
- Touch-optimized interface and clean typography
- Minimal JavaScript for speed

### Restaurant Management Dashboard

- Menu management (add/edit/delete items, prices in Thai Baht without decimals, descriptions, options)
- Order management and notifications
- Customer account management with merge functionality
- Customer analytics (order history, spending totals)
- Basic sales analytics (popular items, daily/weekly revenue)
- Order status management (Received, Preparing, Ready for Pickup)

### Core Architecture

- **Frontend**: Next.js 14+ (App Router), Tailwind CSS, Redux Toolkit for cart state, next-pwa plugin, Server-side rendering for SEO
- **Backend**: Node.js/Express (API routes in Next.js for now), PostgreSQL with Prisma ORM, Redis for caching, WebSocket/Server-Sent Events for real-time orders (future), Customer account merging
- **Infrastructure**: Thailand-optimized CDN (Cloudflare with Bangkok edge), Mobile-optimized image compression, Database optimization for quick menu loading, Thailand timezone support, WhatsApp Web URL integration

## Technical Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 14+ (App Router) |
| **Styling** | Tailwind CSS |
| **State Management** | Redux Toolkit |
| **PWA** | `next-pwa` |
| **Database** | PostgreSQL (Prisma ORM) |
| **Caching** | Redis (`ioredis`) |
| **Authentication** | (Future) NextAuth.js or Auth0 |
| **Deployment** | Vercel (frontend) · Railway/Render (backend) |
| **Monitoring** | Sentry |
| **Icons** | `lucide-react`, `react-icons` |
| **Notifications** | `sonner`, `react-hot-toast` |

## Project Structure

```
.
├── public/
│   ├── icons/
│   └── manifest.json
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── api/              # API routes
│   │   ├── admin/            # Admin dashboard pages
│   │   ├── cart/
│   │   ├── checkout/
│   │   ├── menu/
│   │   ├── globals.css
│   │   └── layout.tsx
│   ├── components/           # Reusable components
│   │   ├── admin/
│   │   ├── cart/
│   │   ├── menu/
│   │   └── ui/               # Utility UI (skeleton etc.)
│   ├── lib/                  # Utils, db, redis
│   └── store/                # Redux store & slices
├── .env.example
├── next.config.js
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## Getting Started

### Prerequisites
- Node.js ≥ 18
- npm or Yarn
- Docker (for local DB/Redis)
- PostgreSQL instance
- Redis instance

### Installation
```bash
git clone https://github.com/coconutbeaches/dine-merge-mobile-order.git
cd dine-merge-mobile-order
npm install   # or yarn install
```

### Environment Variables
Copy `.env.example` to `.env` and fill in:
```
DATABASE_URL="postgresql://user:password@host:port/database?schema=public"
REDIS_URL="redis://:password@host:port"
NEXTAUTH_SECRET="your_nextauth_secret"
NEXTAUTH_URL="http://localhost:3000"
```

### Database Setup
```bash
docker-compose up -d      # optional local pg/redis
npx prisma migrate dev --name init
npx prisma db seed        # optional sample data
```

### Running the Application
```bash
npm run dev   # or yarn dev
# Visit http://localhost:3000
```
Admin dashboard: `/admin/orders`

## Deployment

1. **Frontend**: Deploy to Vercel  
2. **Database / Redis**: Use Supabase, PlanetScale, Railway, or Render (Asia region)

### Environment on Vercel
Add `DATABASE_URL`, `REDIS_URL`, etc., in project settings.

## Automated Build Monitoring (GitHub Actions)

This repo includes `.github/workflows/vercel-logs.yml` which:
- Waits for Vercel deployment
- Fetches build logs
- Opens GitHub issue on failure
- Comments deployment URL on success

Secrets required:
| Name | Purpose |
|------|---------|
| `VERCEL_TOKEN` | Vercel API token |
| `VERCEL_PROJECT_ID` | Project ID (`prj_...`) |
| `VERCEL_ORG_ID` | Org/Team ID |

## Contributing
Pull requests welcome!  
1. Fork repo → create feature branch → commit → open PR.  
2. Follow conventional commit messages.  
3. Ensure `npm run lint` and `npm run build` pass.

## License
MIT © 2025 Coconut Beaches

<!-- Triggering build after manual UI component cleanup -->
