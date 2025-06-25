#!/bin/bash

# Check for required environment variables
if [ -z "$NOTION_API_KEY" ] || [ -z "$NOTION_DATABASE_ID" ]; then
  echo "❌ NOTION_API_KEY or NOTION_DATABASE_ID not set."
  exit 1
fi

# Validate input
if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]; then
  echo "Usage: $0 '<timestamp>' '<files_changed>' '<preview_url>'"
  exit 1
fi

# Extract and sanitize inputs
RAW_TIMESTAMP="$1"
FILES_CHANGED="$2"
PREVIEW_LINK="$3"

# Convert timestamp to ISO 8601 format compatible with Notion (macOS style)
TIMESTAMP=$(date -u -j -f "%Y-%m-%d %H:%M:%S" "$RAW_TIMESTAMP" +"%Y-%m-%dT%H:%M:%SZ")

# Post to Notion
curl -s -X POST "https://api.notion.com/v1/pages" \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -d "{
    \"parent\": { \"database_id\": \"$NOTION_DATABASE_ID\" },
    \"properties\": {
      \"Timestamp\": {
        \"date\": {
          \"start\": \"$TIMESTAMP\"
        }
      },
      \"Files Changed\": {
        \"rich_text\": [{\"type\": \"text\", \"text\": {\"content\": \"$FILES_CHANGED\"}}]
      },
      \"Link\": {
        \"url\": \"$PREVIEW_LINK\"
      }
    }
  }" > /dev/null

echo "📬 Notion log entry created."