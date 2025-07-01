#!/bin/bash

# Comprehensive Testing Workflow for Coconut Beach App
# Combines Lighthouse, Playwright, and Puppeteer

set -e

echo "🥥 Starting Coconut Beach App Testing Workflow..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
APP_URL="http://localhost:8080"
RESULTS_DIR="./test-results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create results directory
mkdir -p "$RESULTS_DIR"

echo -e "${BLUE}📋 Checking if app is running...${NC}"
if ! curl -s "$APP_URL" > /dev/null; then
    echo -e "${RED}❌ App not running on $APP_URL. Please start with 'npm run dev'${NC}"
    exit 1
fi
echo -e "${GREEN}✅ App is running on $APP_URL${NC}"

echo -e "${BLUE}🔍 Running Lighthouse Performance Audit...${NC}"
lighthouse "$APP_URL" \
    --output=html \
    --output=json \
    --output-path="$RESULTS_DIR/lighthouse-$TIMESTAMP" \
    --chrome-flags="--headless" \
    --quiet

echo -e "${BLUE}🎭 Running Playwright E2E Tests...${NC}"
npx playwright test --reporter=html --output="$RESULTS_DIR/playwright-$TIMESTAMP"

echo -e "${BLUE}🎯 Running Puppeteer Performance Tests...${NC}"
node scripts/puppeteer-performance.js

echo -e "${GREEN}✅ All tests completed!${NC}"
echo -e "${YELLOW}📊 Results saved to: $RESULTS_DIR${NC}"
echo -e "${YELLOW}🔗 View Lighthouse report: $RESULTS_DIR/lighthouse-$TIMESTAMP.report.html${NC}"
echo -e "${YELLOW}🔗 View Playwright report: $RESULTS_DIR/playwright-$TIMESTAMP/index.html${NC}"
