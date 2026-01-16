Patch list for custom changes (catpaw)

Purpose
- These are the local customizations that should be reapplied after syncing upstream
  files (especially index.js) so behavior stays stable on Render.

How to reapply
- Run: scripts/reapply-custom-patches.sh
- Resolve any conflicts, then continue: git cherry-pick --continue

Commits to reapply (in order)
- 1e00bed Fix missing cat server hooks
- 5d3d54f Normalize invalid PORT env
- 3a0be06 Normalize Render port env vars
- 4f3ec44 Ignore TBe decrypt failure on startup
- bc4423b Guard livetovod config access
- 744d238 Load profile from CATPAW_PROFILE_JSON
- f724eea Ensure pan configs exist
- e8435ab Add keepalive workflow for Render
- 284ae12 Disable scheduled daily fetch

Notes
- If upstream sync overwrites index.js, reapplying these commits restores the fixes.
- If a commit is already applied but later overwritten, reapplying will reintroduce
  the changes.
