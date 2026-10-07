#!/usr/bin/env bash
# Picks the commit "Promote to production" will promote, and shows it at the
# top of the run page (the commit GitHub prints in the run's header is only
# the version of the workflow file that ran, not what is being promoted).
#
# Without an explicit commit, Promote copies what staging runs, because that
# is what QA Wolf tested. Staging runs a commit when the staging site and the
# staging backend both report it. Right after a merge, staging may still be
# deploying the new commit, so first wait (up to 10 minutes) for both to run
# the newest commit on the staging branch. If they never do (for example a
# deploy failed), promote what they both run, with a warning. If they run
# different commits, nothing on staging was tested as a pair, so stop.
#
# Environment:
#   SITE_VERSION_URL  where the staging site reports its commit (the body is the commit)
#   API_VERSION_URL   where the staging backend reports its commit ({"version":...})
#   REQUESTED         optional commit to promote instead (e.g. a rollback)
# Writes sha=<commit> to $GITHUB_OUTPUT and a summary to $GITHUB_STEP_SUMMARY.
set -euo pipefail

: "${SITE_VERSION_URL:?SITE_VERSION_URL must be set}"
: "${API_VERSION_URL:?API_VERSION_URL must be set}"
REQUESTED="${REQUESTED:-}"
WAIT_ATTEMPTS="${WAIT_ATTEMPTS:-40}" # x 15 seconds = 10 minutes
WAIT_SECONDS="${WAIT_SECONDS:-15}"

# The commit the staging site / backend runs right now, or nothing if it
# didn't answer
site_version() {
  local body
  body=$(curl -fsS "$SITE_VERSION_URL?check=$RANDOM" 2>/dev/null) || return 0
  printf '%s' "$body" | tr -d '[:space:]'
}
api_version() {
  local body
  body=$(curl -fsS "$API_VERSION_URL?check=$RANDOM" 2>/dev/null) || return 0
  printf '%s' "$body" | sed -n 's/.*"version" *: *"\([0-9a-f]*\)".*/\1/p'
}

head=$(git rev-parse origin/staging)
note=""

if [ -n "$REQUESTED" ]; then
  sha=$(git rev-parse --verify "$REQUESTED^{commit}")
  note="Requested by hand (e.g. a rollback)."
else
  for attempt in $(seq 1 "$WAIT_ATTEMPTS"); do
    site=$(site_version)
    api=$(api_version)
    [ "$site" = "$head" ] && [ "$api" = "$head" ] && break
    [ "$attempt" -lt "$WAIT_ATTEMPTS" ] || break
    echo "Staging site runs ${site:-nothing yet}, backend ${api:-nothing yet}; waiting for both to run the newest staging commit $head..."
    sleep "$WAIT_SECONDS"
  done
  if [ "$site" = "$head" ] && [ "$api" = "$head" ]; then
    sha=$head
    note="The newest commit on the staging branch, running on the staging site and backend."
  elif [ -n "$site" ] && [ "$site" = "$api" ]; then
    sha=$site
    note="Staging never started running the newest staging commit ${head:0:7} (its staging deploy may have failed), so this promotes what staging runs."
    echo "::warning::Staging still runs ${sha:0:7}, not the newest staging commit ${head:0:7}. Promoting ${sha:0:7}, which is what staging runs."
  elif [ -z "$site" ] && [ -z "$api" ]; then
    echo "::error::Staging did not say which commit it runs ($SITE_VERSION_URL, $API_VERSION_URL)"
    exit 1
  else
    echo "::error::The staging site runs ${site:-nothing (no answer)} but the staging backend runs ${api:-nothing (no answer)}, so no commit on staging was tested as a pair. Fix staging (e.g. re-run the staging workflow), or enter a commit by hand."
    exit 1
  fi
fi

# Only code that has been merged to staging (and so was tested there)
if ! git merge-base --is-ancestor "$sha" origin/staging; then
  echo "::error::$sha is not a commit on staging; refusing to promote it"
  exit 1
fi

# Both halves must be in the commit: true for every commit since the backend
# and the client were merged into this repository, not for older ones
for part in backend client; do
  if ! git cat-file -e "$sha:$part/package.json" 2>/dev/null; then
    echo "::error::${sha:0:7} has no $part/ folder: it is from before the backend and the client were merged into this repository, so it can't be promoted from here"
    exit 1
  fi
done

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
