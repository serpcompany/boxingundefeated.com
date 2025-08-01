#!/bin/bash

# Seed the remote database via API
echo "🌱 Seeding remote database..."

PREVIEW_URL="https://ca4ba078.boxingundefeated-com.pages.dev"

echo "📡 Making POST request to $PREVIEW_URL/api/admin/seed"

curl -X POST "$PREVIEW_URL/api/admin/seed" \
  -H "Content-Type: application/json" \
  -w "\n\nStatus: %{http_code}\nTime: %{time_total}s\n"

echo "✅ Seeding request completed!"
