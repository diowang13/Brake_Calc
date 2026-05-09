# Cloud DB Mount And Runtime Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Switch cloud deployment to a host-mounted SQLite data directory and stop tracking runtime-generated artifacts in git.

**Architecture:** Keep the application contract unchanged by preserving the container database path at `/data/brake_calc.db`, but replace the Compose named volume with a fixed host bind mount at `/opt/brakehub/data`. Clean the repository boundary by ignoring runtime outputs and removing already tracked generated files from the git index without deleting local copies.

**Tech Stack:** Docker Compose, git, `.gitignore`

---

### Task 1: Update Cloud Data Mount

**Files:**
- Modify: `docker-compose.yml`

**Step 1: Inspect current app volume configuration**

Confirm that `app` currently mounts a named volume at `/data` and still sets `BRAKE_CALC_DB_PATH=/data/brake_calc.db`.

**Step 2: Replace named volume with fixed host bind mount**

Change the `app` service volume mapping from `brake_calc_data:/data` to `/opt/brakehub/data:/data`.

**Step 3: Remove unused top-level named volume declaration**

Delete the now-unused `volumes:` block for `brake_calc_data`.

**Step 4: Verify resulting compose file**

Run: `Get-Content docker-compose.yml`

Expected: `app` uses `/opt/brakehub/data:/data` and there is no top-level named volume block.

### Task 2: Ignore Runtime Outputs

**Files:**
- Modify: `.gitignore`

**Step 1: Add a focused runtime output section**

Append ignore rules for generated runtime artifacts:

```gitignore
# Runtime outputs
out/
*.db
*.db.bak_*
```

**Step 2: Verify rules are present**

Run: `Get-Content .gitignore`

Expected: the runtime output section exists near the end of the file.

### Task 3: Remove Tracked Runtime Artifacts From Git Index

**Files:**
- Modify git index only: `out/brake_calc.db`, `out/brake_calc.db.bak_20260508_130556`, `out/brake_calc_test_clean.db`, `out/report.html`, `out/report.md`, `out/spec_numbered.txt`

**Step 1: Untrack generated files without deleting local copies**

Run:

```bash
git rm --cached out/brake_calc.db out/brake_calc.db.bak_20260508_130556 out/brake_calc_test_clean.db out/report.html out/report.md out/spec_numbered.txt
```

**Step 2: Verify files remain on disk but are staged as removals**

Run: `git status --short`

Expected: the `out/` files show as deleted from git, while local files still exist on disk.

### Task 4: Review Final Diff

**Files:**
- Review: `docker-compose.yml`
- Review: `.gitignore`

**Step 1: Inspect git diff summary**

Run: `git diff -- docker-compose.yml .gitignore`

Expected: only the intended mount and ignore-rule changes are present.

**Step 2: Inspect overall status**

Run: `git status --short`

Expected: Compose and `.gitignore` are modified; generated `out/` files are removed from git tracking.

**Step 3: Do not claim test coverage**

No automated tests are required for this change. Record that verification is limited to config and git-state review.
