#!/bin/bash
set -e

# Load .env variables
export $(grep -v '^#' .env | xargs)

# Required env vars
if [ -z "$NOTION_API_KEY" ] || [ -z "$NOTION_DATABASE_ID" ]; then
  echo "❌ Missing NOTION_API_KEY or NOTION_DATABASE_ID"
  exit 1
fi

# Arguments
FILES="$1"                          # e.g., "README.md"
PREVIEW_URL="$2"                    # Optional
GITHUB_TOKEN="${GITHUB_TOKEN:-}"    # Optional

# Git info
BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Timestamps
TIMESTAMP_UTC=$(date -u +"%Y-%m-%dT%H:%M:%S.%NZ")
TIMESTAMP_LOCAL=$(date +"%Y-%m-%d %H:%M:%S %Z")

# Preview URL fallback
if [ -z "$PREVIEW_URL" ] && [ -f vercel-last.log ]; then
  IFS='|' read -r LAST_TIMESTAMP DEPLOY_URL PROD_URL < vercel-last.log
else
  DEPLOY_URL="$PREVIEW_URL"
  PROD_URL="https://dine-merge-mobile-order.vercel.app"
  echo "$TIMESTAMP_UTC|$DEPLOY_URL|$PROD_URL" > vercel-last.log
fi

# Extract issue reference
ISSUE=$(echo "$FILES" | grep -oE '#[0-9]+' | head -n1 | tr -d '#')
GITHUB_NOTE=""
STATUS_NAME="Pending"

# If PR reference and token are available
if [[ -n "$ISSUE" && -n "$GITHUB_TOKEN" ]]; then
  REPO_URL=$(git config --get remote.origin.url | sed -E 's/.*github\.com[:\/]([^/]+\/[^.]+)(\.git)?/\1/')
  PR_DATA=$(curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
    "https://api.github.com/repos/$REPO_URL/pulls/$ISSUE")

  PR_TITLE=$(echo "$PR_DATA" | jq -r .title)
  PR_MERGED=$(echo "$PR_DATA" | jq -r .merged)

  if [ "$PR_TITLE" != "null" ]; then
    GITHUB_NOTE=" | PR #$ISSUE: $PR_TITLE"
  fi

  if [ "$PR_MERGED" == "true" ]; then
    STATUS_NAME="Merged"
  fi
fi

# Build JSON payload
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
      "select": { "name": "$STATUS_NAME" }
    },
    "Link": {
      "url": "$DEPLOY_URL"
    },
    "Notes": {
      "rich_text": [
        { "text": { "content": "Local time: $TIMESTAMP_LOCAL$GITHUB_NOTE" } }
      ]
    }
  }
}
EOF

# Send to Notion
curl -v -X POST https://api.notion.com/v1/pages \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Notion-Version: 2022-06-28" \
  -d "$PAYLOAD"

echo "✅ Notion log created with timestamp: $TIMESTAMP_LOCAL"