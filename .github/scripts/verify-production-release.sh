#!/usr/bin/env bash
# shellcheck disable=SC2016 # the single-quoted strings are jq programs
# The gate ci.yml runs before a production release (jobs staging-verified and deploy-production).
# It fails closed.
#
# 1. Never a stale release: main must still point at GITHUB_SHA. Re-running an old run after main
#    moved on would deploy older code over newer migrations.
# 2. A promotion (the default): staging deployed and smoke-tested this code first. ci.yml's
#    deploy-staging job uploads the receipt passed-deploy-staging-<tree> after it migrated,
#    deployed and smoke-tested staging, and it runs only after "All checks" passed on the same
#    commit. An unexpired receipt for GITHUB_SHA's tree must exist from a push run of ci.yml on
#    staging in this repository, at GITHUB_SHA itself (a fast-forward promotion) or at a commit
#    that GITHUB_SHA descends from (a promotion merged with a merge commit).
# 3. A hotfix (an owner's workflow_dispatch with hotfix and the typed confirmation): skips 2. The
#    dispatcher and whoever re-runs it must be in RELEASE_OWNERS. The deploy job then skips the
#    migrate step, so db:check-deployable refuses a hotfix that has pending migrations.
#
# Bootstrap: before deploy-staging has deployed main's tree, or after its receipt expired (90
# days), step 2 fails. Let a push to staging with that tree deploy (for an expired receipt, any new
# commit on staging, then promote it), then re-run the failed job.
#
# Usage: verify-production-release.sh [--fresh-only]   (--fresh-only: step 1 and the hotfix owner check)
# Env: GH_TOKEN, GITHUB_REPOSITORY, GITHUB_REPOSITORY_ID, GITHUB_SHA; for a dispatch also HOTFIX,
# CONFIRMATION, GITHUB_ACTOR, GITHUB_TRIGGERING_ACTOR and RELEASE_OWNERS (space-separated logins).
set -euo pipefail

repo="$GITHUB_REPOSITORY"
sha="$GITHUB_SHA"

main_head="$(gh api "repos/$repo/git/ref/heads/main" --jq .object.sha)"
if [ "$main_head" != "$sha" ]; then
  echo "::error::main is at $main_head, not $sha: this release is stale. Production deploys only main's current head."
  exit 1
fi
echo "main still points at $sha."

# Here and in the deploy job (--fresh-only), so re-running only the deploy job of a hotfix run
# still needs an owner.
if [ "${HOTFIX:-false}" = "true" ]; then
  is_owner() { [[ " $RELEASE_OWNERS " == *" $1 "* ]]; }
  if ! is_owner "$GITHUB_ACTOR" || ! is_owner "$GITHUB_TRIGGERING_ACTOR"; then
    echo "::error::Only $RELEASE_OWNERS may release a hotfix (dispatched by $GITHUB_ACTOR, run by $GITHUB_TRIGGERING_ACTOR)."
    exit 1
  fi
fi
if [ "${1:-}" = "--fresh-only" ]; then
  exit 0
fi

if [ "${HOTFIX:-false}" = "true" ]; then
  if [ "${CONFIRMATION:-}" != "hotfix-boxingundefeated-production" ]; then
    echo "::error::Type hotfix-boxingundefeated-production as the confirmation to release a hotfix."
    exit 1
  fi
  echo "::warning title=Hotfix::Releasing $sha without a staging deploy of its code, Worker only. Merge main into staging next."
  exit 0
fi

tree="$(gh api "repos/$repo/commits/$sha" --jq .commit.tree.sha)"
receipt="passed-deploy-staging-$tree"
candidates="$(gh api "repos/$repo/actions/artifacts?name=$receipt&per_page=100" \
  --jq '.artifacts[]
    | select((.expired | not) and .workflow_run.head_branch == "staging"
        and .workflow_run.head_repository_id == ($ENV.GITHUB_REPOSITORY_ID | tonumber))
    | "\(.workflow_run.id) \(.workflow_run.head_sha)"')" || {
  echo "::error::Could not list the staging receipts; failing closed."
  exit 1
}

verified=""
while read -r run_id run_sha; do
  [ -n "$run_id" ] || continue
  # Only deploy-staging uploads the receipt, and only on a push to staging: check the run.
  run="$(gh api "repos/$repo/actions/runs/$run_id" \
    --jq 'select(.path == ".github/workflows/ci.yml" and .event == "push"
        and .head_branch == "staging" and .head_repository.full_name == $ENV.GITHUB_REPOSITORY)
      | .html_url')" || {
    echo "::error::Could not read run $run_id; failing closed."
    exit 1
  }
  [ -n "$run" ] || continue
  if [ "$run_sha" = "$sha" ]; then
    verified="$run_sha $run"
    break
  fi
  status="$(gh api "repos/$repo/compare/$run_sha...$sha" --jq .status)"
  if [ "$status" = "ahead" ] || [ "$status" = "identical" ]; then
    verified="$run_sha $run"
    break
  fi
done <<<"$candidates"

if [ -z "$verified" ]; then
  echo "::error::No staging deploy of tree $tree ($receipt) at $sha or an ancestor. Promote from staging after its deploy passes (git fetch origin && git push origin origin/staging:main)."
  exit 1
fi
read -r staging_sha staging_url <<<"$verified"
echo "Staging deployed and smoke-tested this tree at $staging_sha, after CI passed there: $staging_url"
