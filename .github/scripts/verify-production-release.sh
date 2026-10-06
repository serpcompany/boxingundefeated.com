#!/usr/bin/env bash
# shellcheck disable=SC2016 # the single-quoted strings are jq programs
# The gate Deploy Production runs before a release (deploy-production.yml). It fails closed.
#
# 1. Never a stale release: main must still point at GITHUB_SHA. Re-running an old run after main
#    moved on would deploy older code over newer migrations.
# 2. A promotion (the default): Staging deployed and smoke-tested this code first. A successful
#    Deploy Staging run (this repository, workflow file deploy-staging.yml, event push, branch
#    staging) must have deployed GITHUB_SHA itself (a fast-forward promotion), or a commit with
#    the same tree that GITHUB_SHA descends from (a promotion merged with a merge commit). CI must
#    also have passed on that staging commit.
# 3. A hotfix (an owner's workflow_dispatch with hotfix and the typed confirmation): skips 2. The
#    dispatcher and whoever re-runs it must be in RELEASE_OWNERS. The deploy job then skips the
#    migrate step, so db:check-deployable refuses a hotfix that has pending migrations.
#
# Bootstrap: before staging exists, or before Deploy Staging has deployed main's code, step 2
# fails. Create staging from main, let Deploy Staging pass, then re-run the failed job: main's
# tree now has a verified staging deploy.
#
# Usage: verify-production-release.sh [--fresh-only]   (--fresh-only runs step 1 alone)
# Env: GH_TOKEN, GITHUB_REPOSITORY, GITHUB_SHA; for a dispatch also HOTFIX, CONFIRMATION,
# GITHUB_ACTOR, GITHUB_TRIGGERING_ACTOR and RELEASE_OWNERS (space-separated logins).
set -euo pipefail

repo="$GITHUB_REPOSITORY"
sha="$GITHUB_SHA"

main_head="$(gh api "repos/$repo/git/ref/heads/main" --jq .object.sha)"
if [ "$main_head" != "$sha" ]; then
  echo "::error::main is at $main_head, not $sha: this release is stale. Production deploys only main's current head."
  exit 1
fi
echo "main still points at $sha."
if [ "${1:-}" = "--fresh-only" ]; then
  exit 0
fi

if [ "${HOTFIX:-false}" = "true" ]; then
  is_owner() { [[ " $RELEASE_OWNERS " == *" $1 "* ]]; }
  if ! is_owner "$GITHUB_ACTOR" || ! is_owner "$GITHUB_TRIGGERING_ACTOR"; then
    echo "::error::Only $RELEASE_OWNERS may release a hotfix (dispatched by $GITHUB_ACTOR, run by $GITHUB_TRIGGERING_ACTOR)."
    exit 1
  fi
  if [ "${CONFIRMATION:-}" != "hotfix-boxingundefeated-production" ]; then
    echo "::error::Type hotfix-boxingundefeated-production as the confirmation to release a hotfix."
    exit 1
  fi
  echo "::warning title=Hotfix::Releasing $sha without a staging deploy of its code, Worker only. Merge main into staging next."
  exit 0
fi

tree="$(gh api "repos/$repo/commits/$sha" --jq .commit.tree.sha)"
candidates="$(gh api "repos/$repo/actions/workflows/deploy-staging.yml/runs?branch=staging&event=push&status=success&per_page=100" \
  --jq '.workflow_runs[]
    | select(.path == ".github/workflows/deploy-staging.yml"
        and .event == "push" and .head_branch == "staging" and .conclusion == "success"
        and .head_repository.full_name == $ENV.GITHUB_REPOSITORY)
    | "\(.head_sha) \(.head_commit.tree_id) \(.html_url)"')" || {
  echo "::error::Could not list Deploy Staging runs; failing closed."
  exit 1
}

verified=""
while read -r run_sha run_tree run_url; do
  [ -n "$run_sha" ] || continue
  if [ "$run_sha" = "$sha" ]; then
    verified="$run_sha $run_url"
    break
  fi
  if [ "$run_tree" = "$tree" ]; then
    status="$(gh api "repos/$repo/compare/$run_sha...$sha" --jq .status)"
    if [ "$status" = "ahead" ] || [ "$status" = "identical" ]; then
      verified="$run_sha $run_url"
      break
    fi
  fi
done <<<"$candidates"

if [ -z "$verified" ]; then
  echo "::error::No successful Deploy Staging run deployed $sha or an ancestor with its tree ($tree). Promote from staging after its deploy passes (git fetch origin && git push origin origin/staging:main)."
  exit 1
fi
read -r staging_sha staging_url <<<"$verified"
echo "Deploy Staging verified this code at $staging_sha: $staging_url"

ci_runs="$(gh api "repos/$repo/actions/workflows/ci.yml/runs?head_sha=$staging_sha&event=push&status=success&per_page=20" \
  --jq '[.workflow_runs[]
    | select(.path == ".github/workflows/ci.yml" and .head_branch == "staging"
        and .head_repository.full_name == $ENV.GITHUB_REPOSITORY)] | length')"
if [ "$ci_runs" = "0" ]; then
  echo "::error::CI has no successful push run on staging at $staging_sha."
  exit 1
fi
echo "CI passed on staging at $staging_sha."
