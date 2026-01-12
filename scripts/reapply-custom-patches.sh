#!/usr/bin/env bash
set -euo pipefail

COMMITS=(
  1e00bed
  5d3d54f
  3a0be06
  4f3ec44
  bc4423b
  744d238
  f724eea
  e8435ab
  284ae12
)

echo "Reapplying custom patches..."
for commit in "${COMMITS[@]}"; do
  echo "- cherry-pick ${commit}"
  git cherry-pick -x --allow-empty "${commit}"
done

echo "Done. If conflicts happened, resolve and run: git cherry-pick --continue"
