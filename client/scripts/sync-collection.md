# Sync Collection — Usage Guide

This document explains how to use the `sync-collection.js` script to copy a single Firestore collection between two projects (for example, `prod` ⇄ `dev`). The script is located at `client/scripts/sync-collection.js` and an npm shortcut is available as `sync:collection` in `client/package.json`.

**Important:** The script defaults to `--dry-run=true` for safety — it will not perform any writes unless you explicitly set `--dry-run=false`.

## Requirements

- Node.js installed (used via `node` or `npm run`).
- Two Firebase service-account JSON files with suitable IAM permissions (Firestore read/write/delete as needed).
- By default the script maps aliases to these paths inside the repo:
  - `prod` -> `client/keys/prod-project-service-account.json`
  - `dev` -> `client/keys/dev-project-service-account.json`
- Alternatively provide explicit paths with `--srcKey` and `--destKey` or via environment variables `SYNC_SRC_KEY`/`SYNC_DEST_KEY`.

## CLI Options

- `--collection` (required) — name of the collection to sync, e.g. `tourPackages`.
- `--from` / `--to` — alias for source/destination project: `prod` or `dev` (maps to default key paths).
- `--srcKey` / `--destKey` — explicit filesystem path to service-account JSON for source/destination (overrides aliases).
- `--preserve-ids` — `true|false` (default: `true`) — keep same document IDs in destination.
- `--delete-extra` — `true|false` (default: `false`) — delete documents in destination that are not present in source.
- `--dry-run` — `true|false` (default: `true`) — when `true` the script logs actions but does not write/delete.

## Examples (PowerShell)

- Dry-run: preview sync `tourPackages` from prod → dev (safe):

```powershell
Set-Location -LiteralPath 'D:\Documents\GitHub\ImHereTravels-BETA\client'
npm run sync:collection -- --collection=tourPackages --from=prod --to=dev --dry-run=true
```

- Dry-run using `node` directly:

```powershell
node .\scripts\sync-collection.js --collection=tourPackages --from=prod --to=dev --dry-run=true
```

- Perform the actual sync (writes):

```powershell
npm run sync:collection -- --collection=tourPackages --from=prod --to=dev --dry-run=false
```

- Use explicit service-account files:

```powershell
node .\scripts\sync-collection.js --collection=bookings --srcKey=.\keys\prod-project-service-account.json --destKey=.\keys\dev-project-service-account.json --dry-run=false
```

- Delete extra documents in destination not present in source (destructive):

```powershell
npm run sync:collection -- --collection=tourPackages --from=prod --to=dev --dry-run=false --delete-extra=true
```

## What the script performs

- Reads all top-level documents from the source collection.
- Writes documents to the destination in Firestore batches (max 500 per batch).
- By default it upserts documents using the same document IDs (`--preserve-ids=true`).
- It does not sync subcollections — only top-level documents.
- Optionally deletes documents in destination not present in source when `--delete-extra=true`.

## Safety checklist before performing a real sync

- Run a dry-run first and inspect the output.
- Create a backup of the destination collection (use `client/scripts/export-prod-collections.js`).
- Ensure the destination service account has write/delete permissions.
- Prefer running destructive operations (like `--delete-extra=true`) on a test collection first.

## Troubleshooting

- "Service account file not found": pass explicit `--srcKey`/`--destKey` or set `SYNC_SRC_KEY`/`SYNC_DEST_KEY` env vars.
- Permission errors: grant the service account Firestore Admin or equivalent permissions.
- Large collections: script batches writes, but consider syncing subsets if you hit operational limits.

## Related scripts

- `client/scripts/export-prod-collections.js` — exports many collections to JSON files (useful for backups).
- `client/scripts/import-to-dev.js` — helper for importing data into the dev project.

---

If you'd like, I can:

- Add a `sync:prod-to-dev` script preset in `client/package.json` for convenience.
- Implement an automatic backup-export of the destination collection before destructive operations.
- Run a dry-run here for a specific collection (if service-account JSONs are present).

Tell me which you'd like next.
