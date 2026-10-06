#!/usr/bin/env bash
# Waits until <origin> is served by the Worker built from <commit>: the Worker names its build's
# commit in x-boxingundefeated-build on requests with the smoke-test header
# (apps/web/lib/worker/handle-request.ts). Deploy jobs run it before the smoke test, so the test
# never passes against the version that was live before the deploy.
#
# Usage: .github/scripts/wait-for-build.sh <origin> <commit> [attempts, default 30, 5 s apart]
set -euo pipefail

origin="${1:?origin}"
commit="${2:?commit}"
attempts="${3:-30}"

served=""
for attempt in $(seq 1 "$attempts"); do
  served="$(curl -sS --connect-timeout 5 --max-time 15 -o /dev/null -D - -H 'x-boxingundefeated-smoke-test: 1' "$origin/" 2>/dev/null |
    tr -d '\r' | awk -F': ' 'tolower($1) == "x-boxingundefeated-build" { print $2 }' || true)"
  if [ "$served" = "$commit" ]; then
    echo "$origin serves build $commit (attempt $attempt)."
    exit 0
  fi
  echo "Attempt $attempt: $origin serves build '${served:-none}', waiting for $commit."
  sleep 5
done

echo "::error::$origin still serves build '${served:-none}', not $commit."
exit 1
