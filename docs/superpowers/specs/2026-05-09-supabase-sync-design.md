# Supabase Auth and Sync Design

## Goal

Add Supabase Auth and shared-company cloud synchronization so a ViaNexo user can reinstall the app, sign in, and restore the latest operational data.

## Architecture

ViaNexo remains offline-first with the local SQLite database as the day-to-day runtime store. Supabase stores an authenticated remote mirror for one shared company. Sync is explicit in the first version, with a path to automatic sync later.

## Auth

Supabase Auth handles remote email/password login. The local ViaNexo user and permission model remains authoritative for app permissions. The app maps the Supabase user to the local user by email after sign-in.

## Remote Data Model

Supabase stores:

- `organizations`: one company workspace.
- `organization_members`: Supabase users allowed to access that workspace.
- `sync_records`: versioned entity payloads keyed by organization, entity name, and local record id.

The first implementation stores normalized sync payloads in JSON instead of duplicating the full relational schema in Postgres. This keeps the remote schema compact and preserves the current SQLite/Prisma domain model.

## Sync Rules

The app exports clients, employees, drivers, vehicles, vehicle-driver links, import templates, import jobs, routes, route vehicles, route passengers, users, and permissions. Each payload carries `entity`, `recordId`, `updatedAt`, and data. Deletes use `deleted_at` tombstones in Supabase so another install can remove local records later.

Conflict handling starts with last-write-wins using `updatedAt`, which is enough for a small single-company deployment. The restore path downloads the remote snapshot and rebuilds the local SQLite tables in dependency order.

## Security

All remote tables use Row Level Security. A user can read or write organization data only when their Supabase auth id appears in `organization_members`. The Electron app uses only the public Supabase URL and publishable/anon key, never a service-role key.

## User Experience

Settings gains cloud sync controls: sign in to Supabase, sync now, restore from cloud, and basic status. Backup/restore `.db` remains available as a manual safety net.
