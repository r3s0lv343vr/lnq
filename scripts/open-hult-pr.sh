#!/usr/bin/env bash
# Open the formal Hult Project 2 submission PR from the participant fork.
# Requires push access to r3s0lv343vr/hult-cohort-program (personal PAT or gh auth as r3s0lv343vr).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SUBMISSION="$ROOT/submissions/r3s0lv343vr-project-2.md"
BRANCH="participants/summer26/phase-1-project-2/r3s0lv343vr"
BASE="projects/summer26/phase-1-project-2"
UPSTREAM="rogerSuperBuilderAlpha/hult-cohort-program"
FORK="r3s0lv343vr/hult-cohort-program"

if [[ ! -f "$SUBMISSION" ]]; then
  echo "Missing $SUBMISSION" >&2
  exit 1
fi

WORKDIR="$(mktemp -d)"
cleanup() { rm -rf "$WORKDIR"; }
trap cleanup EXIT

git clone --depth 1 "https://github.com/${FORK}.git" "$WORKDIR/hult"
cd "$WORKDIR/hult"
git remote add upstream "https://github.com/${UPSTREAM}.git"
git fetch upstream "$BASE"
git checkout -B "$BRANCH" "upstream/$BASE"
mkdir -p submissions
cp "$SUBMISSION" submissions/r3s0lv343vr-project-2.md
git add submissions/r3s0lv343vr-project-2.md
git commit -m "Add Project 2 submission for r3s0lv343vr (Lnq)" || true
git push -u origin "$BRANCH"

BODY="$(cat <<'EOF'
## Summary

See `submissions/r3s0lv343vr-project-2.md`.

**Lnq** — Zulip-class async cohort comms. Build repo: https://github.com/r3s0lv343vr/lnq

Do not merge unless asked.
EOF
)"

gh pr create \
  --repo "$UPSTREAM" \
  --base "$BASE" \
  --head "r3s0lv343vr:${BRANCH}" \
  --title "[Project 2] Submission — r3s0lv343vr" \
  --body "$BODY" \
  --draft
