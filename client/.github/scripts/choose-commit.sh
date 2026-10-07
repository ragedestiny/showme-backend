#!/usr/bin/env bash
# Picks the commit "Promote to production" will promote, and shows it at the
# top of the run page (the commit GitHub prints in the run's header is only
# the version of the workflow file that ran, not what is being promoted).
#
# Without an explicit commit, Promote copies what the staging site/server is
# running, because that is what QA Wolf tested. Right after a merge, staging
# may still be deploying the new commit, so first wait (up to 10 minutes) for
# staging to run the newest commit on the staging branch. If it never does
# (for example its deploy failed), promote what staging runs, with a warning.
#
# Environment:
#   VERSION_URL     where staging reports the commit it runs
#   VERSION_FORMAT  "text" (the body is the commit) or "json" ({"version":...})
#   REQUESTED       optional commit to promote instead (e.g. a rollback)
# Writes sha=<commit> to $GITHUB_OUTPUT and a summary to $GITHUB_STEP_SUMMARY.
set -euo pipefail

: "${VERSION_URL:?VERSION_URL must be set}"
VERSION_FORMAT="${VERSION_FORMAT:-text}"
REQUESTED="${REQUESTED:-}"
WAIT_ATTEMPTS="${WAIT_ATTEMPTS:-40}" # x 15 seconds = 10 minutes
WAIT_SECONDS="${WAIT_SECONDS:-15}"

# The commit staging runs right now, or nothing if staging didn't answer
staging_version() {
  local body
  body=$(curl -fsS "$VERSION_URL?check=$RANDOM" 2>/dev/null) || return 0
  if [ "$VERSION_FORMAT" = "json" ]; then
    printf '%s' "$body" | sed -n 's/.*"version" *: *"\([0-9a-f]*\)".*/\1/p'
  else
    printf '%s' "$body" | tr -d '[:space:]'
  fi
}

head=$(git rev-parse origin/staging)
note=""

if [ -n "$REQUESTED" ]; then
  sha=$(git rev-parse --verify "$REQUESTED^{commit}")
  note="Requested by hand (e.g. a rollback)."
else
  for attempt in $(seq 1 "$WAIT_ATTEMPTS"); do
    sha=$(staging_version)
    [ "$sha" = "$head" ] && break
    [ "$attempt" -lt "$WAIT_ATTEMPTS" ] || break
    echo "Staging runs ${sha:-nothing yet}; waiting for it to run the newest staging commit $head..."
    sleep "$WAIT_SECONDS"
  done
  if [ "$sha" = "$head" ]; then
    note="The newest commit on the staging branch, running on staging."
  elif [ -n "$sha" ]; then
    note="Staging never started running the newest staging commit ${head:0:7} (its staging deploy may have failed), so this promotes what staging runs."
    echo "::warning::Staging still runs ${sha:0:7}, not the newest staging commit ${head:0:7}. Promoting ${sha:0:7}, which is what staging runs."
  else
    echo "::error::Staging did not say which commit it runs ($VERSION_URL)"
    exit 1
  fi
fi

# Only code that has been merged to staging (and so was tested there)
if ! git merge-base --is-ancestor "$sha" origin/staging; then
  echo "::error::$sha is not a commit on staging; refusing to promote it"
  exit 1
fi

subject=$(git log -1 --format=%s "$sha")
echo "sha=$sha" >> "$GITHUB_OUTPUT"
echo "Promoting $sha: $subject"
{
  echo "## Promoting \`${sha:0:7}\` to production"
  echo ""
  echo "**$subject**"
  echo ""
  echo "- Commit: [\`$sha\`](https://github.com/$GITHUB_REPOSITORY/commit/$sha)"
  echo "- $note"
} >> "$GITHUB_STEP_SUMMARY"
