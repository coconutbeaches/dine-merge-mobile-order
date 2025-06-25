#!/bin/bash

# Ensure required environment variables are set
if [[ -z "$NOTION_API_KEY" || -z "$NOTION_DATABASE_ID" ]]; then
  echo "❌ NOTION_API_KEY or NOTION_DATABASE_ID not set."
  exit 1
fi

TIMESTAMP="$1"
FILES_CHANGED="$2"
PREVIEW_URL="$3"
BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD)
GITHUB_REPO=$(git config --get remote.origin.url | sed -E 's/.*github.com[:\/](.*)\.git/\1/')
LATEST_COMMIT=$(git rev-parse HEAD)
PR_URL="https://github.com/$GITHUB_REPO/commit/$LATEST_COMMIT"

# Format timestamp in local Thailand time (UTC+7)
LOCAL_TIMESTAMP=$(date -d "$TIMESTAMP" --iso-8601=seconds --utc | sed 's/Z$/+07:00/')

JSON_PAYLOAD=$(jq -n \
  --arg name "Codex Sync [$LOCAL_TIMESTAMP]" \
  --arg ts "$LOCAL_TIMESTAMP" \
  --arg files "$FILES_CHANGED" \
  --arg link "$PREVIEW_URL" \
  --arg branch "$BRANCH_NAME" \
  --arg pr "$PR_URL" \
  --arg status "Shipped" \
  --arg type "Codex" \
  '{
    parent: { database_id: env.NOTION_DATABASE_ID },
    properties: {
      Name: { title: [{ text: { content: $name } }] },
      Timestamp: { date: { start: $ts } },
      "Files Changed": { rich_text: [{ text: { content: $files } }] },
      Link: { url: $link },
      Branch: { rich_text: [{ text: { content: $branch } }] },
      "Linked GitHub PR": { url: $pr },
      Status: { select: { name: $status } },
      Type: { select: { name: $type } }
    }
  }')

curl -s -X POST https://api.notion.com/v1/pages \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Notion-Version: 2022-06-28" \
  -d "$JSON_PAYLOAD"