# Welcome to your Lovable project!!

## Project info

**URL**: https://lovable.dev/projects/c49a8c44-9196-466a-8929-d139ab77ca8e

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/c49a8c44-9196-466a-8929-d139ab77ca8e) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Set up environment variables (copy from .env.local.example)
cp .env.local.example .env.local
# Edit .env.local with your actual Supabase credentials

# Step 5: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

### 🛠 Dev Setup

This repo ships with a `.devcontainer` folder for a consistent Node.js 20 environment. The container automatically runs `npm install` on creation and is configured for Next.js development.

If Codespaces or Codex fails to start, open the Command Palette and choose **"Codespaces: Rebuild Container"**. Logs from the build will appear in the terminal if something goes wrong.

The setup also recommends installing the `dbaeumer.vscode-eslint` extension so linting works out of the box.

### Privacy & Data Retention

This project uses cart backups stored in Supabase. In Safari Private Mode or if the PWA is relaunched, `localStorage` may be unavailable or cleared. Cart backups ensure that user data is preserved across sessions.

Cart backups are cleared upon successful order placement to prevent stale carts. The data retained is limited to cart information associated with guest IDs.

### Automated console-error capture

Scrape browser console messages (errors, warnings, logs) via a headless Chromium.  Note the app now runs with Next.js (typically on port 3000):

```bash
# install Puppeteer (if you haven’t already)
npm install --save-dev puppeteer

# 1) start Next.js in one pane (defaults to port 3000)
npm run dev        # e.g. http://localhost:3000

# 2) in a second pane, capture console logs:
npm run collect-logs
```

## What technologies are used for this project?

This project is built with:

- Next.js
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Environment Variables

This project requires the following environment variables to be set:

### Required for all environments:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key

### Optional (for admin/server operations):
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (server-side only)
- `NEXT_PUBLIC_GA_TRACKING_ID`: Google Analytics tracking ID

### Setting up for Vercel:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** > **Environment Variables**
3. Add the following variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (optional, for admin features)
4. Make sure to add them for all environments (Production, Preview, Development)
5. Redeploy your application for the changes to take effect

See `.env.local.example` for reference values.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/c49a8c44-9196-466a-8929-d139ab77ca8e) and click on Share -> Publish.

**Important**: After deploying, make sure to set up the environment variables in your Vercel project settings (see Environment Variables section above).

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## Authentication Flow

This application supports both authenticated users and guest users through a dual authentication system with robust error handling and retry mechanisms.

### User Types

1. **Authenticated Users**: Users who sign up/login with email and password via Supabase Auth
2. **Guest Users**: Users who register as guests with just their name and stay information

### Authentication Logic

The authentication state is managed through the `UserContext` with the following key logic:

- `isLoggedIn`: Returns `true` if either a Supabase session exists OR a current user exists (handles both auth types)
- `authReady`: Indicates when the initial authentication state has been loaded
- `currentUser`: Contains user data for both authenticated and guest users
- `retryAuth`: Function to retry authentication initialization on failures

### Guest User Flow

1. Guest users register with name and stay information
2. Guest data is stored in the `guests` table with RLS policies
3. Multiple family members can register for the same stay_id
4. Guest sessions are maintained locally and can be converted to full user accounts

### Route Protection

The application uses several route protection components:

- **RouteGuard**: Generic route protection with configurable auth requirements
- **AuthRoute**: Protects routes that require any authenticated user (regular or guest)
- **AdminRoute**: Protects routes that require admin-level access

All route guards feature:
- Graceful loading states with spinners
- Error handling with retry functionality
- Automatic redirects for unauthorized access
- Prevention of infinite redirect loops

### Error Handling & Retry

The authentication system includes robust error handling:
- Automatic retry on authentication failures
- Clear error messages for users
- Retry buttons for manual recovery
- Graceful degradation on network issues

### Database Schema

The `guests` table supports:
- Multiple guests per stay_id (family members)
- `table_number` field for restaurant table assignment
- RLS policies that allow guest registration and data access

### Recent Improvements

- **Simplified Error Handling**: Removed complex `shouldShowRetryButton` logic in favor of always showing retry options
- **Consistent UX**: All authentication errors now show clear retry options
- **Better User Experience**: Streamlined authentication flow with better loading states
- **Robust Recovery**: Authentication failures are automatically retryable
