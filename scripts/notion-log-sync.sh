#!/bin/bash

# Exit on error
set -e

# Ensure .env is loaded
export $(grep -v '^#' .env | xargs)

if [ -z "$NOTION_API_KEY" ] || [ -z "$NOTION_DATABASE_ID" ]; then
  echo "❌ NOTION_API_KEY or NOTION_DATABASE_ID not set."
  exit 1
fi

# Variables
BRANCH=$(git rev-parse --abbrev-ref HEAD)
FILES=$2
TIMESTAMP_UTC=$(date -u +"%Y-%m-%dT%H:%M:%S.%NZ")
TIMESTAMP_LOCAL=$(date +"%Y-%m-%d %H:%M:%S %Z")

# Save deploy info
DEPLOY_URL=$3
PROD_URL="https://dine-merge-mobile-order.vercel.app"
echo "$TIMESTAMP_UTC|$DEPLOY_URL|$PROD_URL" > vercel-last.log

# Extract GitHub issue references from filenames (e.g. #123)
ISSUE=$(echo "$FILES" | grep -oE '#[0-9]+' | head -n1)

# JSON payload for Notion
read -r -d '' PAYLOAD <<EOF
{
  "parent": { "database_id": "$NOTION_DATABASE_ID" },
  "properties": {
    "Name": {
      "title": [
        { "text": { "content": "🧠 Codex sync [$TIMESTAMP_LOCAL]" } }
      ]
    },
    "Timestamp": {
      "date": { "start": "$TIMESTAMP_UTC" }
    },
    "Files Changed": {
      "rich_text": [
        { "text": { "content": "$FILES" } }
      ]
    },
    "Branch": {
      "rich_text": [
        { "text": { "content": "$BRANCH" } }
      ]
    },
    "Type": {
      "select": { "name": "Codex Sync" }
    },
    "Status": {
      "select": { "name": "Pending" }
    },
    "Link": {
      "url": "$DEPLOY_URL"
    },
    "Notes": {
      "rich_text": [
        { "text": { "content": "Local time: $TIMESTAMP_LOCAL${ISSUE:+ | Related: $ISSUE}" } }
      ]
    }
  }
}
EOF

# Call Notion API
curl -s -X POST https://api.notion.com/v1/pages \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Notion-Version: 2022-06-28" \
  -d "$PAYLOAD"

echo "✅ Notion log created with timestamp: $TIMESTAMP_LOCAL"