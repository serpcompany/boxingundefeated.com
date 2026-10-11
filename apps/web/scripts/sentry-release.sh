#!/usr/bin/env bash
# Sentry release steps around a Worker deploy, after serp.xxx's scripts/sentry-release.sh. The
# deploy workflows run it after `build:worker:<env>`:
#
#   apps/web/scripts/sentry-release.sh browser          before deploy: upload the browser source
#                                                       maps, then delete them from the assets
#   apps/web/scripts/sentry-release.sh worker <dir>     after deploy: upload the Worker bundle that
#                                                       `deploy --outdir <dir>` wrote
#   apps/web/scripts/sentry-release.sh deploy           after deploy: finalize the release and
#                                                       record its deploy to the environment
#
# The release and environment come from the build stamp, .open-next/build-environment.json
# (scripts/write-build-environment.ts), so they are the ones the browser and the Worker report
# with. The environment is also the `dist`: staging and production build the same commit
# separately, and their source maps differ (lib/sentry/options.ts).
#
# Needs SENTRY_AUTH_TOKEN (a GitHub environment secret), SENTRY_ORG and SENTRY_PROJECT. Without
# SENTRY_AUTH_TOKEN nothing is sent. A Sentry failure only warns, so it never blocks a deploy;
# deleting the browser source maps from the assets is the one step that must succeed.
set -euo pipefail

COMMAND="${1:?usage: sentry-release.sh <browser|worker <dir>|deploy>}"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAMP="$APP_DIR/.open-next/build-environment.json"
STATIC_DIR="$APP_DIR/.open-next/assets/_next/static"

has_token() { [ -n "${SENTRY_AUTH_TOKEN:-}" ]; }

warn() { echo "::warning::$*"; }

sentry() { # runs sentry-cli; a failure warns instead of failing the job
  if ! pnpm --dir "$APP_DIR" exec sentry-cli "$@"; then
    warn "sentry-cli $1 $2 failed; continuing without it"
  fi
}

stamp_field() {
  node -e 'const v = require(process.argv[1])[process.argv[2]]; if (v) process.stdout.write(String(v))' \
    "$STAMP" "$1"
}

require_release_env() {
  : "${SENTRY_ORG:?SENTRY_ORG is required}"
  : "${SENTRY_PROJECT:?SENTRY_PROJECT is required}"
  [ -f "$STAMP" ] || { echo "no $STAMP: run build:worker:<env> first" >&2; exit 1; }
  RELEASE="$(stamp_field release)"
  ENVIRONMENT="$(stamp_field siteEnvironment)"
  [ -n "$RELEASE" ] || { echo "the build stamp has no release (unknown commit)" >&2; exit 1; }
  [ -n "$ENVIRONMENT" ] || { echo "the build stamp has no environment" >&2; exit 1; }
}

# Next.js build output only; files from public/ are left as they are.
delete_browser_source_maps() {
  [ -d "$STATIC_DIR" ] || return 0
  find "$STATIC_DIR" -type f -name '*.map' -delete
  # Drop the references too, so browsers don't request maps that are not deployed. The `~`
  # delimiters matter: GNU find rejects any other `{}` in an `-exec ... {} +` command.
  find "$STATIC_DIR" -type f \( -name '*.js' -o -name '*.css' \) \
    -exec perl -pi -e 's~^(?://|/\*)# sourceMappingURL=\S+?(?:\s*\*/)?\s*$~~' {} +
  # -print -quit: find stops at the first match, so grep -q can't SIGPIPE it under pipefail.
  if find "$STATIC_DIR" -type f -name '*.map' -print -quit | grep -q .; then
    echo "source maps are still present in $STATIC_DIR" >&2
    exit 1
  fi
}

case "$COMMAND" in
  browser)
    if has_token && [ -d "$STATIC_DIR" ] && find "$STATIC_DIR" -type f -name '*.js.map' -print -quit | grep -q .; then
      require_release_env
      sentry releases new "$RELEASE"
      # Debug IDs tie each served chunk to its map, independent of URLs.
      sentry sourcemaps inject "$STATIC_DIR"
      sentry sourcemaps upload --release "$RELEASE" --dist "$ENVIRONMENT" "$STATIC_DIR"
    elif has_token; then
      warn "no browser source maps in $STATIC_DIR (was SENTRY_SOURCEMAPS=true set for the build?)"
    else
      echo "SENTRY_AUTH_TOKEN is not set; not uploading browser source maps"
    fi
    delete_browser_source_maps
    ;;
  worker)
    BUNDLE_DIR="${2:?usage: sentry-release.sh worker <dir>}"
    if ! has_token; then
      echo "SENTRY_AUTH_TOKEN is not set; not uploading the Worker bundle"
      exit 0
    fi
    require_release_env
    # lib/sentry/worker.ts renames Worker stack frames to app:///<file> to match these uploads.
    sentry releases new "$RELEASE"
    sentry sourcemaps upload --release "$RELEASE" --dist "$ENVIRONMENT" --url-prefix "app:///" "$BUNDLE_DIR"
    ;;
  deploy)
    if ! has_token; then
      echo "SENTRY_AUTH_TOKEN is not set; not recording the deploy"
      exit 0
    fi
    require_release_env
    sentry releases finalize "$RELEASE"
    sentry deploys new --release "$RELEASE" --env "$ENVIRONMENT"
    ;;
  *)
    echo "unknown command: $COMMAND" >&2
    exit 2
    ;;
esac
