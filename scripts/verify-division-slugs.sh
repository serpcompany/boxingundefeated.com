#!/bin/bash

echo "Verifying division slugs after fix..."

# Test the API to get all divisions
echo "Fetching divisions from production..."
curl -s https://boxingundefeated.com/api/divisions | jq '.divisions[] | {id: .id, slug: .slug, name: .name}' | head -20

echo -e "\n\nChecking specific division pages..."
# Test specific division pages that should work with hyphenated slugs
for slug in "super-lightweight" "light-heavyweight" "super-middleweight" "super-welterweight"; do
  echo -n "Testing /divisions/$slug: "
  status=$(curl -s -o /dev/null -w "%{http_code}" "https://boxingundefeated.com/divisions/$slug")
  if [ "$status" = "200" ]; then
    echo "✓ OK ($status)"
  else
    echo "✗ FAILED ($status)"
  fi
done

echo -e "\n\nDone!"