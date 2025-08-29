# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Table of Contents
- [Overview \u0026 Tech Stack](#overview--tech-stack)
- [Quick Start Commands](#quick-start-commands)
- [Architecture](#architecture)
- [Authentication Flow](#authentication-flow)
- [State Management](#state-management)
- [Testing \u0026 QA](#testing--qa)
- [Styling \u0026 UI](#styling--ui)
- [Environment Setup](#environment-setup)
- [Deployment](#deployment)
- [Debugging \u0026 Tips](#debugging--tips)
- [Contribution Guidelines](#contribution-guidelines)

## Overview \u0026 Tech Stack

This is a **restaurant mobile ordering PWA** built for the Coconut Beach resort, featuring:

**Core Technologies:**
- **Next.js 15** - App Router architecture with Server \u0026 Client Components
- **React 18** - TypeScript strict mode
- **Supabase** - Postgres database, authentication, real-time subscriptions, RLS
- **Tailwind CSS** + **shadcn-ui** - Utility-first styling with Radix UI primitives
- **React Query** - Server state management with persistence

**Key Features:**
- Dual authentication (Supabase users + guest checkout)
- Real-time order tracking via Supabase channels
- PWA capabilities with offline cart backups
- Admin dashboard for order \u0026 customer management
- Comprehensive testing suite (Unit, E2E, Performance)

## Quick Start Commands

### Development
```bash
# Start development server (runs on port 3000)
npm run dev

# Build for production
npm run build

# Start production build
npm start

# Lint code
npm run lint
```

### Testing
```bash
# Run unit tests with Vitest
npm test

# Run full testing workflow (Lighthouse + Playwright + Performance)
npm run test:workflow

# Run Playwright E2E tests only
npm run playwright:test

# Run performance analysis
npm run puppeteer:perf

# Run Lighthouse audit (requires app running on port 8080)
npm run lighthouse
```

### Debugging \u0026 Analysis
```bash
# Debug Supabase connection \u0026 auth
npm run debug:supabase

# Collect browser console logs via Puppeteer
npm run collect-logs

# Analyze bundle size
npm run analyze

# Profile Next.js build
npm run build:profile
```

**Port Configuration:**
- Development server: `http://localhost:3000`
- Playwright tests: `http://localhost:3001` 
- Lighthouse tests: `http://localhost:8080`

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client PWA    │    │    Next.js App   │    │    Supabase     │
│                 │    │     Router       │    │                 │
│ • React 18      │◄──►│                  │◄──►│ • PostgreSQL    │
│ • PWA Provider  │    │ • Server Actions │    │ • Auth          │
│ • Service Worker│    │ • API Routes     │    │ • Realtime      │
│ • Session Backup│    │ • Middleware     │    │ • RLS Policies  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ State Management│    │   Components     │    │   External      │
│                 │    │                  │    │                 │
│ • UserContext   │    │ • shadcn-ui      │    │ • Google        │
│ • CartContext   │    │ • Route Guards   │    │   Analytics     │
│ • OrderContext  │    │ • Admin Panel    │    │ • Sentry        │
│ • AppContext    │    │ • PWA Features   │    │   (optional)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Folder Structure
```
app/                 # Next.js App Router pages
├── admin/          # Admin dashboard pages
├── cart/           # Shopping cart
├── checkout/       # Checkout flow
├── menu/           # Menu browsing
└── components/     # Page-specific components

src/
├── components/     # Shared React components
│   ├── ui/         # shadcn-ui components
│   ├── auth/       # Authentication components
│   └── admin/      # Admin-specific components
├── context/        # React Context providers
├── hooks/          # Custom React hooks
├── types/          # TypeScript type definitions
└── integrations/   # External service integrations
    └── supabase/   # Supabase client \u0026 types

scripts/            # Utility scripts
tests/              # Playwright E2E tests
```

## Authentication Flow

The app supports **dual authentication**:

### 1. Supabase Users (Full accounts)
- Email/password signup \u0026 login
- Profile management
- Order history
- Admin roles

### 2. Guest Users (Temporary checkout)
- Name + stay_id registration
- Session-based authentication
- Can convert to full account
- Family member support (multiple guests per stay_id)

### Key Implementation Details

**UserContext** (`src/context/UserContext.tsx`):
```javascript
// Core auth state
isLoggedIn: !!supabaseSession || !!currentUser  // Supports both auth types
authReady: !isLoading                            // Initial load complete
retryAuth()                                      // Manual retry mechanism
```

**Route Protection:**
- `RouteGuard` - Generic protection with auth requirements
- `AuthRoute` - Requires any authenticated user (regular or guest)
- `AdminRoute` - Requires admin role

**Session Recovery:**
- Automatic retry on auth failures
- Cookie-based session persistence
- Cart backup/restore for PWA reliability

### Debugging Auth Issues
1. Check browser console for `[UserContext]` logs
2. Verify environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Use `npm run debug:supabase` to test connection
4. Check Supabase dashboard RLS policies

## State Management

**Primary Contexts:**
- **UserContext** - Authentication, user profiles, session management
- **CartContext** - Shopping cart state, local storage sync
- **OrderContext** - Order placement, history, real-time updates
- **AppContext** - Aggregated context combining all above

**Key Patterns:**
```javascript
// Access aggregated app state
const { currentUser, cart, placeOrder } = useAppContext();

// Direct context access when needed
const { isLoggedIn, authReady } = useUserContext();
const { addToCart, cartTotal } = useCartContext();
```

**Data Persistence:**
- React Query for server state caching
- localStorage for cart backups
- Supabase real-time subscriptions for live updates
- Cookie storage for authentication sessions

## Testing \u0026 QA

### Unit Tests (Vitest)
```bash
npm test                    # Run all unit tests
npm test -- --watch        # Watch mode
npm test -- --coverage     # Coverage report
```
- Config: `vitest.config.ts`
- Environment: jsdom for DOM testing
- Location: `src/**/*.{test,spec}.{ts,tsx}`

### E2E Tests (Playwright)
```bash
npm run playwright:test     # Cross-browser E2E tests
```
- Config: `playwright.config.js`
- Browsers: Chrome, Firefox, Safari, Mobile Chrome/Safari
- Test files: `tests/*.spec.{js,ts}`
- Reports: `test-results/playwright-*/index.html`

### Performance Testing
```bash
npm run test:workflow       # Full testing suite
npm run lighthouse          # Accessibility \u0026 performance audit
npm run puppeteer:perf      # Custom performance metrics
```

### Full Workflow Script
The `scripts/test-workflow.sh` runs comprehensive testing:
1. Lighthouse performance audit
2. Playwright cross-browser E2E tests
3. Puppeteer performance measurements
4. Generates timestamped reports in `test-results/`

## Styling \u0026 UI

### Tailwind Configuration
- **Config**: `tailwind.config.ts`
- **Theme**: CSS variables for consistent theming
- **Dark Mode**: Class-based (`darkMode: ["class"]`)
- **Custom Colors**: Restaurant branding in `restaurant.*` palette
- **Animations**: Custom flicker effects for loading states

### shadcn-ui Components
- **Location**: `src/components/ui/`
- **Primitives**: Built on Radix UI for accessibility
- **Customization**: Tailwind classes with CSS variable theming
- **Extensions**: Custom restaurant-specific components

### Design System Guidelines
- Utility-first approach with Tailwind
- Consistent spacing using Tailwind scale
- Custom animations for loading \u0026 transitions
- Mobile-first responsive design
- Dark mode support via CSS variables

## Environment Setup

### Prerequisites
```bash
# Node.js 20 (via nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# Install dependencies
npm install
```

### Required Environment Variables
Create `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### VS Code Setup
Recommended extensions:
- **ESLint** - Code linting
- **Tailwind CSS IntelliSense** - Tailwind autocompletion
- **TypeScript Importer** - Auto-imports

### DevContainer
The project includes `.devcontainer/devcontainer.json` for consistent Node.js 20 environment with automatic `npm install`.

## Deployment

### Lovable Platform (Primary)
1. Visit [Lovable Project](https://lovable.dev/projects/c49a8c44-9196-466a-8929-d139ab77ca8e)
2. Click **Share → Publish** for one-click deployment
3. Configure custom domain: **Project → Settings → Domains → Connect Domain**

### Manual Deployment
```bash
npm run build     # Build production bundle
npm start         # Start production server
```

### Environment Variables
- Ensure production environment has correct `NEXT_PUBLIC_SUPABASE_*` values
- Lovable automatically manages environment variable persistence

## Debugging \u0026 Tips

### Browser Console Debugging
```bash
# Scrape console logs with Puppeteer
npm run collect-logs
```

### Supabase Debugging
```bash
# Test Supabase connection \u0026 auth
npm run debug:supabase
```
You can run SQL scripts in Supabase dashboard per user configuration.

### Bundle Analysis
```bash
npm run analyze          # Analyze bundle size
npm run build:profile    # Profile Next.js build process
```

### Performance Monitoring
- **Sentry**: Available in dependencies for error tracking
- **Google Analytics**: Integrated via `components/analytics/GoogleAnalytics.tsx`
- **Lighthouse**: Regular performance audits via `npm run lighthouse`

### Common Issues
1. **Auth failures**: Check environment variables \u0026 Supabase connection
2. **PWA not loading**: Verify Service Worker registration
3. **Cart persistence**: Check localStorage availability \u0026 cart backup system
4. **Build errors**: TypeScript \u0026 ESLint are configured to ignore during builds

## Contribution Guidelines

### Development Workflow
1. Create feature branch: `feature/your-feature-name`
2. Make changes with proper TypeScript types
3. Run tests locally: `npm run test:workflow`
4. Lint code: `npm run lint`
5. Commit with descriptive messages
6. Create pull request

### Code Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Follow configured rules
- **Tailwind**: Use utility classes, avoid custom CSS
- **Components**: Prefer shadcn-ui components
- **Testing**: Unit tests for utilities, E2E for user flows

### Before Submitting PRs
```bash
npm run lint              # Fix linting issues
npm test                  # Ensure unit tests pass
npm run build             # Verify build succeeds
npm run playwright:test   # Run E2E tests
```

### Documentation
- Update this WARP.md when adding new scripts or major features
- Document complex business logic in code comments
- Update README.md for user-facing changes

---

**Note**: This project uses Supabase for data persistence and authentication. Ensure you have access to the Supabase dashboard and understand RLS (Row Level Security) policies when making database-related changes.
