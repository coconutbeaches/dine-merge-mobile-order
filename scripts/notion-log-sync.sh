#!/bin/bash

# Exit on any error
set -e

# Load env vars
export $(grep -v '^#' .env | xargs)

# Arguments from codexsync
RAW_TIMESTAMP="$1"
FILES_CHANGED="$2"
DEPLOY_URL="$3"

# Ensure Vercel log exists
if [ ! -f vercel-last.log ]; then
  echo "⚠️ Warning: vercel-last.log not found. Skipping preview/production URLs."
  DEPLOY_URL=""
  PROD_URL=""
else
  DEPLOY_URL=$(grep -Eo 'https://[^ ]+\.vercel\.app' vercel-last.log | tail -n1 || true)
  PROD_URL=$(grep -Eo 'https://dine-merge-mobile-order\.vercel\.app' vercel-last.log || true)
fi

# Extract current branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Derive short commit hash for name
COMMIT_HASH=$(git rev-parse --short HEAD)
NAME="Codex Sync – $COMMIT_HASH"

# Extract GitHub PR number from last commit (if any)
PR_URL=$(git log -1 --pretty=%B | grep -Eo 'https://github.com/[^ ]+/pull/[0-9]+' || true)

# Optional: Extract issue notes
ISSUE_URL=$(git log -1 --pretty=%B | grep -Eo 'https://github.com/[^ ]+/issues/[0-9]+' || true)
NOTES=""
if [ -n "$ISSUE_URL" ]; then
  NOTES="Related to GitHub issue: $ISSUE_URL"
fi

# Format date string
TIMESTAMP=$(date -u -j -f "%Y-%m-%d %H:%M:%S" "$RAW_TIMESTAMP" +"%Y-%m-%dT%H:%M:%SZ")

# Post to Notion
curl -s -X POST "https://api.notion.com/v1/pages" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -d @- <<EOF
{
  "parent": { "database_id": "$NOTION_DATABASE_ID" },
  "properties": {
    "Name": { "title": [{ "text": { "content": "$NAME" }}]},
    "Timestamp": { "date": { "start": "$TIMESTAMP" }},
    "Files Changed": { "rich_text": [{ "text": { "content": "$FILES_CHANGED" }}]},
    "Link": { "url": "$DEPLOY_URL" },
    "Production URL": { "url": "$PROD_URL" },
    "Branch": { "rich_text": [{ "text": { "content": "$BRANCH" }}]},
    "Linked GitHub PR": { "url": "${PR_URL:-null}" },
    "Notes": { "rich_text": [{ "text": { "content": "$NOTES" }}]},
    "Type": { "select": { "name": "Codex Sync" }},
    "Status": { "select": { "name": "Deployed" }}
  }
}
EOF