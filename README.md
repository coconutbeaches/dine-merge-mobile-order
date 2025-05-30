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

- **Frontend**: Next.js 14+ (App Router), Tailwind CSS, Zustand/React Context (for state management), next-pwa plugin, Server-side rendering for SEO.
- **Backend**: Node.js/Express or Python/FastAPI (API routes in Next.js for now), PostgreSQL with Prisma ORM, Redis for caching, WebSocket/Server-Sent Events for real-time orders (future), Customer account merging system.
- **Infrastructure**: Thailand-optimized CDN (CloudFlare with Bangkok edge servers), Mobile-optimized image compression, Database optimization for quick menu loading, Thailand timezone support, WhatsApp Web URL integration (no API needed).

## Technical Stack

- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS
- **State Management**: Redux Toolkit (for cart and global state)
- **PWA**: `next-pwa` plugin
- **Database**: PostgreSQL (with Prisma ORM)
- **Caching**: Redis (`ioredis` client)
- **Authentication**: NextAuth.js or Auth0 (future implementation)
- **Deployment**: Vercel (frontend), Railway/Render (backend)
- **Monitoring**: Sentry (for error tracking)
- **Icons**: `lucide-react`, `react-icons`
- **Toast Notifications**: `sonner`, `react-hot-toast`

## Project Structure

```
.
├── public/
│   ├── icons/
│   └── manifest.json
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/                  # Next.js App Router pages and layouts
│   │   ├── api/              # API routes
│   │   ├── admin/
│   │   ├── cart/
│   │   ├── checkout/
│   │   ├── menu/
│   │   ├── globals.css
│   │   └── layout.tsx
│   ├── components/           # Reusable React components
│   │   ├── admin/
│   │   ├── cart/
│   │   ├── menu/
│   │   └── ui/               # Shadcn UI components (skeleton, etc.)
│   ├── lib/                  # Utility functions, API clients, DB/Redis setup
│   │   ├── api/
│   │   └── utils/
│   └── store/                # Redux store and slices
├── .env.example
├── .gitignore
├── next.config.js
├── package.json
├── postcss.config.js
├── README.md
├── tailwind.config.js
├── tsconfig.json
├── docker-compose.yml
├── Dockerfile
└── Dockerfile.dev
```

## Getting Started

### Prerequisites

- Node.js (>=18.0.0)
- npm or Yarn
- Docker (for local database/Redis setup)
- PostgreSQL database instance
- Redis instance

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/coconutbeaches/dine-merge-mobile-order.git
    cd dine-merge-mobile-order
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

### Environment Variables

Create a `.env` file in the root of the project based on `.env.example`:

```
DATABASE_URL="postgresql://user:password@host:port/database?schema=public"
REDIS_URL="redis://:password@host:port"
NEXTAUTH_SECRET="YOUR_NEXTAUTH_SECRET" # For authentication (future)
NEXTAUTH_URL="http://localhost:3000" # For authentication (future)
```

### Database Setup

1.  **Start PostgreSQL and Redis with Docker Compose (for local development):**
    ```bash
    docker-compose up -d
    ```

2.  **Run Prisma migrations to create tables:**
    ```bash
    npx prisma migrate dev --name init
    ```

3.  **Seed the database (optional, for sample data):**
    ```bash
    npx prisma db seed
    ```

### Running the Application

1.  **Start the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```
    The application will be accessible at `http://localhost:3000`.

2.  **Access the Admin Dashboard:**
    Navigate to `/admin/orders` to view the restaurant management dashboard.

## Deployment

The application is designed for deployment on Vercel (frontend) and a service like Railway or Render (backend/database).

1.  **Vercel Deployment:**
    - Connect your GitHub repository to Vercel.
    - Ensure environment variables (e.g., `DATABASE_URL`, `REDIS_URL`) are configured in Vercel.
    - Vercel will automatically detect the Next.js project and deploy it.

2.  **Database & Redis Deployment:**
    - Deploy your PostgreSQL and Redis instances to a cloud provider (e.g., Supabase, PlanetScale, Railway, Render) preferably in an Asia region for optimal performance.

## Automated Build Monitoring (GitHub Actions)

This project includes a GitHub Actions workflow (`.github/workflows/vercel-logs.yml`) to automatically monitor Vercel deployments.

-   **Triggers**: Runs on `push` to `droid/initial-setup`, `main`, or `master` branches.
-   **Functionality**:
    -   Waits for the Vercel deployment associated with the commit.
    -   Fetches Vercel build logs.
    -   If deployment fails: Creates a new GitHub Issue with the full build logs.
    -   If deployment succeeds: Posts a comment on the commit with the deployment URL.

### Setup for Automation:

To enable this workflow, you need to add the following **GitHub Repository Secrets**:

1.  **`VERCEL_TOKEN`**: Your Vercel API token.
    -   Get it from: [Vercel Dashboard → Settings → Tokens](https://vercel.com/account/tokens)
2.  **`VERCEL_PROJECT_ID`**: The ID of your Vercel project.
    -   Get it from: Vercel Dashboard → Your Project → Settings → General → Project ID (starts with `prj_`)
3.  **`VERCEL_ORG_ID`**: Your Vercel Organization/Team ID (or Account ID if personal).
    -   Get it from: Vercel Dashboard → Account Settings → General → Your ID

## Contributing

1.  Fork the repository
2.  Create a feature branch (`git checkout -b feature/amazing-feature`)
3.  Commit your changes (`git commit -m 'Add some amazing feature'`)
4.  Push to the branch (`git push origin feature/amazing-feature`)
5.  Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

<!-- Testing with new Vercel API token -->
