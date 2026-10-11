#!/usr/bin/env bash
# shellcheck disable=SC2016 # the single-quoted strings are jq programs
# The preflight of d1-import.yml (#63), and the reverse check ci.yml's deploy jobs run before they
# migrate (--imports-only, #104). It fails closed.
#
# 1. The inputs: the version is an artifact's SHA-256, and allow_prune is empty or a whole number
#    up to MAX_ALLOW_PRUNE. The step summary shows both, so the production approver sees them.
# 2. The branch: staging imports run from staging, production imports from main, the one branch
#    each environment admits.
# 3. No deploy of that environment is running or about to run: no unfinished ci.yml run on the
#    branch (a push, or an owner's dispatch from main) whose "Migrate, deploy and smoke-test <env>"
#    job hasn't finished, whether it runs, is queued, waits for approval or waits for its checks.
#    So an import never starts while a deploy migrates the same D1; step 6 is the reverse. It lists
#    only unfinished runs, one query per unfinished status, so finished runs never fill the page.
#    It refuses when a status has more runs than one page lists (a deploy could hide beyond them),
#    and it makes two passes, so a run that changes status once while it reads (say from
#    in_progress to waiting at an approval) is still listed. The import jobs repeat this check
#    right before their D1 steps (--deploys-only), because a production approval can come long
#    after the preflight.
# 4. Production only: staging imported this version with clean parity. An unexpired receipt
#    passed-d1-import-staging-<version>, found by that exact name, must come from a workflow_dispatch
#    run of d1-import.yml on staging in this repository, at a commit that staging's head is at or
#    descends from. So only reviewed code on staging can have written it, not a run from a tag, a
#    fork, a pull request, another workflow or a branch that only shares staging's name. It refuses
#    when there are more receipts of that name than one page lists.
# 5. The tip (--tip-only, the import jobs only): the branch is still at the commit this run checked
#    out. GITHUB_REF names only the branch, so after an approval wait or a queue it may have moved
#    on and the job would import with an older importer and parity check. The jobs run it before
#    their first Cloudflare step and again right before their D1 steps.
# 6. No import of that environment is running or about to run (--imports-only, ci.yml's deploy
#    jobs only, right before their migrate step): no unfinished d1-import.yml run, from any branch,
#    whose run-name ("D1 import, <environment>, <version>") names that environment or names none,
#    whether it runs, is queued, waits for approval or is still in its preflight. So a deploy
#    never migrates the D1 an import writes. The same two passes, one query per unfinished status,
#    and the same refusal when a status has more runs than one page lists. The deploy job then
#    checks dataset_state's importing flag too (db:check-deployable --importing-only).
#
# Usage: verify-d1-import.sh [--deploys-only | --tip-only | --imports-only]
#   --deploys-only: step 3 alone. --tip-only: step 5 alone. --imports-only: step 6 alone.
# Env: GH_TOKEN, GITHUB_REPOSITORY, GITHUB_REPOSITORY_ID, GITHUB_REF, ENVIRONMENT, VERSION and
# ALLOW_PRUNE; GITHUB_SHA for --tip-only; GITHUB_STEP_SUMMARY when set. --imports-only needs only
# GH_TOKEN, GITHUB_REPOSITORY and ENVIRONMENT.
set -euo pipefail

# Five times the importer's staging cap (REMOTE_PRUNE_LIMIT, 50, in packages/data-ops). A larger
# prune drops more public URLs than one run should: it needs a change to this script, which the
# owner merges.
MAX_ALLOW_PRUNE=250

# The page size of every list below. A list with more items than it returns can hide a deploy or a
# receipt, so the checks refuse instead of trusting it. Paging would be a change to this script.
PER_PAGE=100

# Every status of a ci.yml run that hasn't finished, as the runs API's status filter names them.
UNFINISHED_STATUSES="requested pending queued in_progress waiting"

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

is_sha() { [[ "${1:-}" =~ ^[0-9a-f]{40}$ ]]; }

# read_tip <branch>: sets TIP to the commit the remote branch is at now, from the git ref (so a tag
# of that name can't shadow it). Not a subshell: it must be able to exit.
read_tip() {
  TIP="$(gh api "repos/$repo/git/ref/heads/$1" --jq .object.sha)" || {
    echo "::error::Could not read the $1 branch; failing closed."
    exit 1
  }
  if ! is_sha "$TIP"; then
    echo "::error::The $1 branch's tip is not a commit SHA; failing closed."
    exit 1
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
      echo "::error::allow_prune must be empty or an integer from 0 to $MAX_ALLOW_PRUNE without leading zeros."
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
  local status listed runs="" kind total listed_count run_id run_url state seen=" "
  # Two passes over the statuses: a run that changes status once while they are read is listed in
  # the pass it didn't change in.
  for _ in 1 2; do
    for status in $UNFINISHED_STATUSES; do
      # The first line is "incomplete" when the list can't be proven to hold every run of that status.
      listed="$(gh api "repos/$repo/actions/workflows/ci.yml/runs?branch=$branch&status=$status&per_page=$PER_PAGE" \
        --jq '(if (.total_count | type) != "number" or .total_count > (.workflow_runs | length)
              then "incomplete \(.total_count | if type == "number" then tostring else "?" end) \(.workflow_runs | length)"
              else empty end),
          (.workflow_runs[]
            | select(.status != "completed" and (.event == "push" or .event == "workflow_dispatch")
              and .head_branch == $ENV.BRANCH and .head_repository.full_name == $ENV.GITHUB_REPOSITORY)
            | "run \(.id) \(.html_url)")')" || {
        echo "::error::Could not list the $status ci.yml runs on $branch; failing closed."
        exit 1
      }
      read -r kind total listed_count <<<"$listed"
      if [ "$kind" = "incomplete" ]; then
        [ "$total" != "?" ] || total="an unknown number of"
        echo "::error::ci.yml has $total $status runs on $branch but only $listed_count were listed, so a pending deploy of $ENVIRONMENT could be hidden; failing closed. Let them finish, or cancel them, and dispatch the import again."
        exit 1
      fi
      runs="$runs$listed"$'\n'
    done
  done
  while read -r kind run_id run_url; do
    [ -n "$kind" ] || continue
    # A run listed twice (in both passes, or under two statuses) is read once.
    case "$seen" in *" $run_id "*) continue ;; esac
    seen="$seen$run_id "
    # The deploy job of the run's latest attempt; "not started" while it waits for its checks.
    state="$(gh api "repos/$repo/actions/runs/$run_id/jobs?per_page=$PER_PAGE" \
      --jq 'if (.total_count | type) != "number" or .total_count > (.jobs | length) then "incomplete"
        else [.jobs[] | select(.name == $ENV.DEPLOY_JOB) | .status] | first // "not started" end')" || {
      echo "::error::Could not read the jobs of run $run_id; failing closed."
      exit 1
    }
    if [ "$state" = "incomplete" ]; then
      echo "::error::Run $run_id has more jobs than were listed, so its deploy job could be hidden; failing closed."
      exit 1
    fi
    [ "$state" != "completed" ] || continue
    if [ "$state" = "not started" ]; then
      state="not started yet (it runs once the run's checks pass)"
    fi
    echo "::error::A deploy of $ENVIRONMENT is pending in $run_url: its job \"$DEPLOY_JOB\" is $state. An import must not run while a deploy migrates the same D1. Let that run finish, or cancel it, then dispatch the import again."
    exit 1
  done <<<"$runs"
  echo "No deploy of $ENVIRONMENT is running or pending on $branch."
}

# ci.yml's deploy jobs run this right before their migrate step. The environment comes from the
# run-name, since the runs API lists no inputs; a run whose run-name names no environment could be
# importing into this one, so it refuses too. Its run-name is never printed: it holds the inputs.
check_no_import() {
  local status listed kind total listed_count run_env run_url run_status
  for _ in 1 2; do
    for status in $UNFINISHED_STATUSES; do
      # The first line is "incomplete" when the list can't be proven to hold every run of that status.
      listed="$(gh api "repos/$repo/actions/workflows/d1-import.yml/runs?status=$status&per_page=$PER_PAGE" \
        --jq '(if (.total_count | type) != "number" or .total_count > (.workflow_runs | length)
              then "incomplete \(.total_count | if type == "number" then tostring else "?" end) \(.workflow_runs | length)"
              else empty end),
          (.workflow_runs[]
            | select(.status != "completed")
            | (.display_title
              | if type == "string" and test("^D1 import, staging(,|$)") then "staging"
                elif type == "string" and test("^D1 import, production(,|$)") then "production"
                else "unknown" end) as $env
            | select($env == $ENV.ENVIRONMENT or $env == "unknown")
            | "\($env) \(.html_url) \(.status)")')" || {
        echo "::error::Could not list the $status d1-import.yml runs; failing closed."
        exit 1
      }
      read -r kind total listed_count <<<"$listed"
      if [ "$kind" = "incomplete" ]; then
        [ "$total" != "?" ] || total="an unknown number of"
        echo "::error::d1-import.yml has $total $status runs but only $listed_count were listed, so an import into $ENVIRONMENT could be hidden; failing closed. Let them finish, or cancel them; then the owner re-runs this deploy."
        exit 1
      fi
      [ -n "$listed" ] || continue
      read -r run_env run_url run_status <<<"$listed"
      if [ "$run_env" = "unknown" ]; then
        echo "::error::d1-import.yml run $run_url ($run_status) names no environment in its run-name, so it could be importing into $ENVIRONMENT; failing closed. A deploy must not migrate the D1 an import writes. Let that run finish, or cancel it; then the owner re-runs this deploy."
      else
        echo "::error::An import into $ENVIRONMENT is unfinished in $run_url: the run is $run_status. A deploy must not migrate the D1 an import writes, so this one stops before its migration. Let that run finish, or cancel it; then the owner re-runs this deploy."
      fi
      exit 1
    done
  done
  echo "No import into $ENVIRONMENT is running or pending."
}

# The import jobs run this before their first Cloudflare step and again before their D1 steps.
check_branch_tip() {
  if ! is_sha "${GITHUB_SHA:-}"; then
    echo "::error::GITHUB_SHA is not a commit SHA; failing closed."
    exit 1
  fi
  read_tip "$branch"
  if [ "$TIP" != "$GITHUB_SHA" ]; then
    echo "::error::$branch moved to $TIP after this run started at $GITHUB_SHA; re-dispatch from the new tip."
    exit 1
  fi
  echo "$branch is still at $GITHUB_SHA."
}

check_staging_receipt() {
  export RECEIPT="passed-d1-import-staging-$VERSION"
  local candidates run_id run run_sha run_url staging_head status
  read_tip staging
  staging_head="$TIP"
  # The receipt by its exact name, never a scan of the workflow's runs. The first line is
  # "incomplete" when the list can't be proven to hold every receipt of that name.
  candidates="$(gh api "repos/$repo/actions/artifacts?name=$RECEIPT&per_page=$PER_PAGE" \
    --jq '(if (.total_count | type) != "number" or .total_count > (.artifacts | length)
          then "incomplete" else empty end),
      (.artifacts[]
        | select(.name == $ENV.RECEIPT and (.expired | not) and .workflow_run.head_branch == "staging"
          and .workflow_run.head_repository_id == ($ENV.GITHUB_REPOSITORY_ID | tonumber))
        | .workflow_run.id)')" || {
    echo "::error::Could not list the staging receipts; failing closed."
    exit 1
  }
  for run_id in $candidates; do
    if [ "$run_id" = "incomplete" ]; then
      echo "::error::There are more than $PER_PAGE receipts named $RECEIPT, so a valid one could be missing from the list; failing closed. The check needs paging, a change to .github/scripts/verify-d1-import.sh."
      exit 1
    fi
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
    if ! is_sha "$run_sha"; then
      echo "::error::Run $run_id has no commit SHA; failing closed."
      exit 1
    fi
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
  echo "::error::No staging import of $VERSION from staging in the last 90 days ($RECEIPT). Dispatch this workflow from staging with environment staging and this version first."
  exit 1
}

case "${1:-}" in
  "") ;;
  --deploys-only)
    check_no_deploy
    exit 0
    ;;
  --tip-only)
    check_branch_tip
    exit 0
    ;;
  --imports-only)
    check_no_import
    exit 0
    ;;
  *)
    echo "::error::Unknown argument $1: use --deploys-only, --tip-only or --imports-only, or none."
    exit 1
    ;;
esac

check_inputs
check_branch
check_no_deploy
summary "- Deploys of $ENVIRONMENT: none running or pending"
if [ "$ENVIRONMENT" = "production" ]; then
  check_staging_receipt
fi
