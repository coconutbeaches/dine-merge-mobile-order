#!/bin/bash

# Load environment variables from .env file
set -a
[ -f .env ] && source .env
set +a

# Required inputs
TIMESTAMP="$1"
FILES="$2"
LINK="$3"

# Use loaded variables
NOTION_TOKEN="${NOTION_API_KEY:?Missing NOTION_API_KEY}"
NOTION_DATABASE_ID="${NOTION_DATABASE_ID:?Missing NOTION_DATABASE_ID}"

# Send to Notion
curl -s -X POST "https://api.notion.com/v1/pages" \
  -H "Authorization: Bearer $NOTION_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Notion-Version: 2022-06-28" \
  -d '{
    "parent": { "database_id": "'"$NOTION_DATABASE_ID"'" },
    "properties": {
      "Timestamp": {
        "date": {
          "start": "'"$TIMESTAMP"'"
        }
      },
      "Files Changed": {
        "rich_text": [{
          "text": { "content": "'"${FILES//$'\n'/\\n}"'" }
        }]
      },
      "Link": {
        "url": "'"$LINK"'"
      }
    }
  }'