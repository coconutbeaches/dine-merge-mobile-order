#!/bin/bash

# Complete Deployment Workflow for Coconut Beach App
# Combines Vercel, GitHub, and Supabase CLI tools

set -e

echo "🚀 Starting Coconut Beach Deployment Workflow..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Not in a git repository. Please run 'git init' first.${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Pre-deployment checks...${NC}"

# Check for uncommitted changes
if [[ `git status --porcelain` ]]; then
    echo -e "${YELLOW}⚠️  You have uncommitted changes. Committing them now...${NC}"
    git add .
    read -p "Enter commit message: " commit_message
    git commit -m "$commit_message"
fi

# Run tests before deployment
echo -e "${BLUE}🧪 Running pre-deployment tests...${NC}"
npm run test || {
    echo -e "${RED}❌ Tests failed. Fix issues before deploying.${NC}"
    exit 1
}

# Build the application
echo -e "${BLUE}🔨 Building application...${NC}"
npm run build || {
    echo -e "${RED}❌ Build failed. Fix issues before deploying.${NC}"
    exit 1
}

# Run Lighthouse audit on production build
echo -e "${BLUE}🔍 Running Lighthouse audit on build...${NC}"
npm run preview &
PREVIEW_PID=$!
sleep 5

lighthouse http://localhost:4173 \
    --output=html \
    --output-path="./lighthouse-production-build" \
    --chrome-flags="--headless" \
    --quiet || echo "⚠️ Lighthouse audit failed (non-blocking)"

kill $PREVIEW_PID

# Supabase deployment check
echo -e "${BLUE}🗄️  Checking Supabase status...${NC}"
if supabase status > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Supabase is connected${NC}"
    
    # Push database changes if any
    if supabase db diff --schema public | grep -q "No changes found"; then
        echo -e "${GREEN}✅ Database is up to date${NC}"
    else
        echo -e "${YELLOW}⚠️  Database changes detected. Pushing to Supabase...${NC}"
        supabase db push
    fi
else
    echo -e "${YELLOW}⚠️  Supabase not connected. Skipping database checks.${NC}"
fi

# Push to GitHub
echo -e "${BLUE}📤 Pushing to GitHub...${NC}"
git push origin main || git push origin master || {
    echo -e "${RED}❌ Failed to push to GitHub${NC}"
    exit 1
}

# Deploy to Vercel
echo -e "${BLUE}🌐 Deploying to Vercel...${NC}"
vercel --prod --yes || {
    echo -e "${RED}❌ Vercel deployment failed${NC}"
    exit 1
}

# Get deployment URL
DEPLOYMENT_URL=$(vercel ls --scope $(vercel whoami) | grep "$(basename $(pwd))" | head -1 | awk '{print $2}')

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${YELLOW}🔗 Your Coconut Beach app is live at: https://$DEPLOYMENT_URL${NC}"

# Optional: Run post-deployment tests
read -p "Run post-deployment tests on live site? (y/n): " run_tests
if [[ $run_tests == "y" || $run_tests == "Y" ]]; then
    echo -e "${BLUE}🧪 Running post-deployment tests...${NC}"
    lighthouse "https://$DEPLOYMENT_URL" \
        --output=html \
        --output-path="./lighthouse-production-live" \
        --chrome-flags="--headless" \
        --quiet
    
    echo -e "${GREEN}✅ Post-deployment tests completed${NC}"
    echo -e "${YELLOW}📊 View live site Lighthouse report: ./lighthouse-production-live.report.html${NC}"
fi

echo -e "${GREEN}🎉 Coconut Beach deployment workflow completed!${NC}"
