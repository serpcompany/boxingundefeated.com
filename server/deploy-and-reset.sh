#!/bin/bash

# Deploy and reset databases script

echo "📦 Deploying to preview environment..."
cd .. && npm run build && npx nuxthub deploy --preview

echo ""
echo "🔄 Resetting preview database..."
npx nuxi task db:reset --preview

echo ""
echo "✅ Preview deployment and reset complete!"

echo ""
echo "📦 Deploying to production environment..."
cd .. && npm run build && npx nuxthub deploy --production

echo ""
echo "🔄 Resetting production database..."
npx nuxi task db:reset --production

echo ""
echo "✅ Production deployment and reset complete!"