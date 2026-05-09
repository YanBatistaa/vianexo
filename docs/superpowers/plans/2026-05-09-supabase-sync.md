# Supabase Auth and Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Supabase Auth and shared-company synchronization to restore ViaNexo data after reinstall.

**Architecture:** Keep SQLite as the local offline database. Add a focused Supabase REST/Auth client in the Electron main process, sync payload builders/restorers around the existing Prisma schema, and IPC methods exposed to the renderer settings screen.

**Tech Stack:** Electron, TypeScript, Prisma SQLite, Supabase Auth, Supabase PostgREST, RLS policies.

---

### Task 1: Remote Schema

**Files:**
- Supabase migration: `organizations`, `organization_members`, `sync_records`

- [ ] Apply SQL migration with RLS enabled.
- [ ] Verify tables exist in Supabase.

### Task 2: Sync Payload Tests

**Files:**
- Create: `scripts/sync-payload-test.ts`
- Modify: `package.json`

- [ ] Write a failing test that seeds local data, exports sync records, clears local tables, restores from records, and asserts clients/routes/passengers return.
- [ ] Run `npm.cmd run test:sync` and confirm it fails because sync functions do not exist.
- [ ] Implement minimal sync payload functions.
- [ ] Re-run `npm.cmd run test:sync` and confirm it passes.

### Task 3: Supabase Client

**Files:**
- Create: `src/main/supabase.ts`
- Modify: `src/main/validation.ts`

- [ ] Write a failing test for missing Supabase env config and request shape.
- [ ] Implement Auth sign-in, sign-out, user lookup, and sync record upsert/fetch via `fetch`.
- [ ] Keep service-role keys out of the app.

### Task 4: IPC Contract

**Files:**
- Modify: `src/shared/contracts.ts`
- Modify: `src/shared/ipc-contracts.ts`
- Modify: `src/preload/preload.ts`
- Modify: `src/main/ipc.ts`
- Modify: `docs/ipc-contracts.md`

- [ ] Add cloud login/logout/status/sync/restore methods.
- [ ] Register protected handlers for sync and restore.
- [ ] Run `npm.cmd run test:contracts`.

### Task 5: Settings UI

**Files:**
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/styles/app.css`

- [ ] Add a compact cloud panel in Configuracoes.
- [ ] Show connection state, last sync result, and restore action.
- [ ] Keep backup UI unchanged.

### Task 6: Verification

**Files:**
- Existing test scripts

- [ ] Run `npm.cmd run lint`.
- [ ] Run `npm.cmd run test:sync`.
- [ ] Run `npm.cmd run test:contracts`.
- [ ] Run `npm.cmd run test:smoke`.
- [ ] Run `npm.cmd run build`.
