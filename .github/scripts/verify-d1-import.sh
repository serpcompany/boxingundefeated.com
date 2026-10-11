#!/usr/bin/env bash
# shellcheck disable=SC2016 # the single-quoted strings are jq programs
# The preflight of d1-import.yml (#63). It fails closed.
#
# 1. The inputs: the version is an artifact's SHA-256, and allow_prune is empty or a whole number
#    up to MAX_ALLOW_PRUNE. The step summary shows both, so the production approver sees them.
# 2. The branch: staging imports run from staging, production imports from main, the one branch
#    each environment admits.
# 3. No deploy of that environment is running or about to run: no unfinished ci.yml run on the
#    branch (a push, or an owner's dispatch from main) whose "Migrate, deploy and smoke-test <env>"
#    job hasn't finished, whether it runs, is queued, waits for approval or waits for its checks.
#    An import and a deploy's migration must never write one D1 at once. It reads the branch's 100
#    most recent ci.yml runs. The import jobs repeat this check right before they write
#    (--deploys-only), because a production approval can come long after the preflight.
# 4. Production only: staging imported this version with clean parity. An unexpired receipt
#    passed-d1-import-staging-<version> must come from a workflow_dispatch run of d1-import.yml on
#    staging in this repository, at a commit that staging's head is at or descends from. So only
#    reviewed code on staging can have written it, not a run from a tag or a branch that only
#    shares staging's name.
#
# Usage: verify-d1-import.sh [--deploys-only]   (--deploys-only: step 3 alone)
# Env: GH_TOKEN, GITHUB_REPOSITORY, GITHUB_REPOSITORY_ID, GITHUB_REF, ENVIRONMENT, VERSION and
# ALLOW_PRUNE; GITHUB_STEP_SUMMARY when set.
set -euo pipefail

# Five times the importer's staging cap (REMOTE_PRUNE_LIMIT, 50, in packages/data-ops). A larger
# prune drops more public URLs than one run should: it needs a change to this script, which the
# owner merges.
MAX_ALLOW_PRUNE=250

repo="$GITHUB_REPOSITORY"
case "${ENVIRONMENT:-}" in
  staging) branch=staging ;;
  production) branch=main ;;
  *)
    echo "::error::Unknown environment ${ENVIRONMENT:-(none)}: use staging or production."
    exit 1
    ;;
esac

summary() {
  if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
    echo "$1" >>"$GITHUB_STEP_SUMMARY"
  fi
}

check_inputs() {
  if ! [[ "${VERSION:-}" =~ ^[0-9a-f]{64}$ ]]; then
    echo "::error::version must be the artifact's SHA-256, 64 lowercase hex digits, as pnpm db:upload-artifact prints it."
    exit 1
  fi
  allow_prune="${ALLOW_PRUNE:-}"
  if [ -n "$allow_prune" ]; then
    if ! [[ "$allow_prune" =~ ^(0|[1-9][0-9]{0,2})$ ]] || [ "$allow_prune" -gt "$MAX_ALLOW_PRUNE" ]; then
      echo "::error::allow_prune must be empty or a whole number of boxers from 0 to $MAX_ALLOW_PRUNE, not '$allow_prune'."
      exit 1
    fi
    prune="up to $allow_prune boxers the artifact no longer has (allow_prune)"
  elif [ "$ENVIRONMENT" = "production" ]; then
    prune="none (the importer's production cap)"
  else
    prune="up to 1 % of the boxers, at most 50 (the importer's staging cap)"
  fi
  echo "Version $VERSION; this run may prune $prune."
  summary "### D1 import into $ENVIRONMENT"
  summary ""
  summary "- Version: \`$VERSION\`"
  summary "- May prune: **$prune**"
}

check_branch() {
  if [ "$GITHUB_REF" != "refs/heads/$branch" ]; then
    echo "::error::Dispatch the $ENVIRONMENT import from $branch, not $GITHUB_REF."
    exit 1
  fi
  summary "- Branch: \`$branch\`"
}

check_no_deploy() {
  export BRANCH="$branch" DEPLOY_JOB="Migrate, deploy and smoke-test $ENVIRONMENT"
  local runs run_id run_url state
  runs="$(gh api "repos/$repo/actions/workflows/ci.yml/runs?branch=$branch&per_page=100" \
    --jq '.workflow_runs[]
      | select(.status != "completed" and (.event == "push" or .event == "workflow_dispatch")
          and .head_branch == $ENV.BRANCH and .head_repository.full_name == $ENV.GITHUB_REPOSITORY)
      | "\(.id) \(.html_url)"')" || {
    echo "::error::Could not list the ci.yml runs on $branch; failing closed."
    exit 1
  }
  while read -r run_id run_url; do
    [ -n "$run_id" ] || continue
    # The deploy job of the run's latest attempt; "not started" while it waits for its checks.
    state="$(gh api "repos/$repo/actions/runs/$run_id/jobs?per_page=100" \
      --jq '[.jobs[] | select(.name == $ENV.DEPLOY_JOB) | .status] | first // "not started"')" || {
      echo "::error::Could not read the jobs of run $run_id; failing closed."
      exit 1
    }
    [ "$state" != "completed" ] || continue
    if [ "$state" = "not started" ]; then
      state="not started yet (it runs once the run's checks pass)"
    fi
    echo "::error::A deploy of $ENVIRONMENT is pending in $run_url: its job \"$DEPLOY_JOB\" is $state. An import must not run while a deploy migrates the same D1. Let that run finish, or cancel it, then dispatch the import again."
    exit 1
  done <<<"$runs"
  echo "No deploy of $ENVIRONMENT is running or pending on $branch."
}

check_staging_receipt() {
  local receipt="passed-d1-import-staging-$VERSION"
  local staging_head candidates run_id run run_sha run_url status
  staging_head="$(gh api "repos/$repo/git/ref/heads/staging" --jq .object.sha)" || {
    echo "::error::Could not read the staging branch; failing closed."
    exit 1
  }
  candidates="$(gh api "repos/$repo/actions/artifacts?name=$receipt&per_page=100" \
    --jq '.artifacts[]
      | select((.expired | not) and .workflow_run.head_branch == "staging"
          and .workflow_run.head_repository_id == ($ENV.GITHUB_REPOSITORY_ID | tonumber))
      | .workflow_run.id')" || {
    echo "::error::Could not list the staging receipts; failing closed."
    exit 1
  }
  for run_id in $candidates; do
    # Only the staging job of d1-import.yml uploads the receipt, and only after a clean import.
    run="$(gh api "repos/$repo/actions/runs/$run_id" \
      --jq 'select(.path == ".github/workflows/d1-import.yml" and .event == "workflow_dispatch"
          and .head_branch == "staging" and .head_repository.full_name == $ENV.GITHUB_REPOSITORY)
        | "\(.head_sha) \(.html_url)"')" || {
      echo "::error::Could not read run $run_id; failing closed."
      exit 1
    }
    [ -n "$run" ] || continue
    read -r run_sha run_url <<<"$run"
    if [ "$run_sha" != "$staging_head" ]; then
      status="$(gh api "repos/$repo/compare/$run_sha...$staging_head" --jq .status)" || {
        echo "::error::Could not compare $run_sha with staging; failing closed."
        exit 1
      }
      if [ "$status" != "ahead" ] && [ "$status" != "identical" ]; then
        echo "::warning::Ignoring $run_url: its commit $run_sha is not on staging ($status)."
        continue
      fi
    fi
    echo "Staging imported $VERSION with clean parity at $run_sha: $run_url"
    summary "- Staging import: $run_url"
    return 0
  done
  echo "::error::No staging import of $VERSION from staging in the last 90 days ($receipt). Dispatch this workflow from staging with environment staging and this version first."
  exit 1
}

if [ "${1:-}" = "--deploys-only" ]; then
  check_no_deploy
  exit 0
fi

check_inputs
check_branch
check_no_deploy
summary "- Deploys of $ENVIRONMENT: none running or pending"
if [ "$ENVIRONMENT" = "production" ]; then
  check_staging_receipt
fi
