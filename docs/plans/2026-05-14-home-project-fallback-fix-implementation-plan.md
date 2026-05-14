# Home Project Fallback Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prevent the home page from showing hard-coded mock projects when refreshing the real project list fails.

**Architecture:** Keep the last successfully loaded project list in memory and stop using production fallback rows that look like real data. The bugfix is limited to the React app shell and home page rendering, with a regression test proving that returning home after a failed refresh does not swap real projects for mock ones.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

---

### Task 1: Add Regression Test For Failed Home Refresh

**Files:**
- Modify: `frontend/src/App.test.tsx`

**Step 1: Write the failing test**

Add a test that:
- renders the app with a successful initial `listProjects()` response
- opens an existing project
- forces the next `listProjects()` call to reject
- navigates back home
- expects the previously loaded real projects to remain visible
- expects the mock fallback project names to stay hidden

**Step 2: Run test to verify it fails**

Run: `npm test -- src/App.test.tsx`

Expected: FAIL because the current implementation clears `projects` on refresh failure and the home page falls back to mock rows.

### Task 2: Implement Minimal Fix

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/pages/HomePage.tsx`

**Step 1: Preserve prior project list on refresh failure**

Change the `refreshProjects()` error path so it does not replace existing projects with an empty array.

**Step 2: Remove misleading mock fallback rows**

Update `HomePage` so an empty `projects` list renders a neutral empty/error state instead of fake project cards.

**Step 3: Keep behavior minimal**

Do not add persistence, retries, or new API calls. Only change failure behavior and fallback rendering.

### Task 3: Verify Green

**Files:**
- Verify: `frontend/src/App.test.tsx`

**Step 1: Re-run targeted test**

Run: `npm test -- src/App.test.tsx`

Expected: PASS with the new regression covered.

**Step 2: Report verification scope**

State clearly that verification is limited to the targeted frontend test unless broader frontend tests are also run.
