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

# Step 4: Start the development server with auto-reloading and an instant preview.
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

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/c49a8c44-9196-466a-8929-d139ab77ca8e) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## Authentication Flow

This application supports both authenticated users and guest users through a dual authentication system:

### User Types

1. **Authenticated Users**: Users who sign up/login with email and password via Supabase Auth
2. **Guest Users**: Users who register as guests with just their name and stay information

### Authentication Logic

The authentication state is managed through the `UserContext` with the following key logic:

- `isLoggedIn`: Returns `true` if either a Supabase session exists OR a current user exists (handles both auth types)
- `authReady`: Indicates when the initial authentication state has been loaded
- `currentUser`: Contains user data for both authenticated and guest users

### Guest User Flow

1. Guest users register with name and stay information
2. Guest data is stored in the `guests` table with RLS policies
3. Multiple family members can register for the same stay_id
4. Guest sessions are maintained locally and can be converted to full user accounts

### Database Schema

The `guests` table supports:
- Multiple guests per stay_id (family members)
- `table_number` field for restaurant table assignment
- RLS policies that allow guest registration and data access

### Recent Fixes

- **Root Cause**: Guest users weren't properly authenticated due to strict AND logic in `isLoggedIn`
- **Resolution**: Changed authentication logic to use OR instead of AND
- **Impact**: Guest users can now properly access authenticated features
- **Database**: Added migration to fix guests table schema and RLS policies
