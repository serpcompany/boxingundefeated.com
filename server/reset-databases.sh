#!/bin/bash

echo "🔄 Database Reset Script"
echo "======================="

# Check if production flag is set
if [ "$1" == "production" ]; then
    echo "🎯 Resetting PRODUCTION database..."
    response=$(curl -X POST https://boxingundefeated.com/api/admin/reset \
        -H "Content-Type: application/json" \
        -H "x-allow-production-reset: true" \
        -s)
    
    if [ $? -eq 0 ]; then
        echo "$response" | jq .
    else
        echo "❌ Failed to reset production database"
    fi
else
    echo "🎯 Resetting PREVIEW database..."
    # Get latest commit hash
    COMMIT=$(git log -1 --format=%h)
    
    response=$(curl -X POST https://${COMMIT}.boxingundefeated.pages.dev/api/admin/reset \
        -H "Content-Type: application/json" \
        -s)
    
    if [ $? -eq 0 ]; then
        echo "$response" | jq .
    else
        echo "❌ Failed to reset preview database"
    fi
fi

echo ""
echo "✅ Reset attempt complete!"