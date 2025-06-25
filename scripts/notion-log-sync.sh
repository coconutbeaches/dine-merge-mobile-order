#!/bin/bash

# Load environment variables from .env
export $(grep -v '^#' .env | xargs)

# Get latest commit info
COMMIT_MSG=$(git log -1 --pretty=%B)
COMMIT_URL="https://github.com/coconutbeaches/dine-merge-mobile-order/commit/$(git rev-parse HEAD)"

# Format for Notion
curl -X POST "https://api.notion.com/v1/pages" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -d '{
    "parent": { "database_id": "'"$NOTION_DATABASE_ID"'" },
    "properties": {
      "Name": {
        "title": [{ "text": { "content": "'"$COMMIT_MSG"'" } }]
      },
      "Type": {
        "select": { "name": "Codex Sync" }
      },
      "Link": {
        "url": "'"$COMMIT_URL"'"
      },
      "Timestamp": {
        "date": { "start": "'"$(date -Iseconds)"'" }
      }
    }
  }'