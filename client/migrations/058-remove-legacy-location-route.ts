/**
 * 058 — Remove legacy fields from every tourPackages document.
 *
 * WHAT THIS DOES
 * ──────────────
 * Deletes three legacy fields that are no longer read by the admin CMS or www:
 *   • `location`         (top-level) — superseded by `destinations` + `cardSubHeader`
 *   • `locationOther`    (top-level) — orphaned admin-only UI helper, never read
 *   • `details.route`    (nested)    — superseded by `details.keyFacts` + `cardSubHeader`
 *
 * `destinations` is intentionally KEPT (the reservation booking form reads it).
 * Safe to re-run: deleting an already-absent field is a no-op.
 *
 * ROLLBACK
 * ────────
 * NOT value-restoring — the old values are not retained by this migration.
 * If you need to recover them, restore from the backup export:
 *   admin/client/exports/export-dev/tourPackages-2025-11-23T15-54-42-974Z.json
 *
 * HOW TO RUN
 * ──────────
 *   cd admin/client
 *   npx tsx migrations/migrate.ts dry-run058   # preview
 *   npx tsx migrations/migrate.ts 058           # apply
 *   npx tsx migrations/migrate.ts rollback058   # (warns — not reversible)
 */

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteField,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase-config";

const MIGRATION_ID = "058-remove-legacy-location-route";
const COLLECTION_NAME = "tourPackages";

export async function runMigration(dryRun = false) {
  console.log(`\n🚀 Running ${MIGRATION_ID} (dryRun=${dryRun})`);

  const snap = await getDocs(collection(db, COLLECTION_NAME));
  console.log(`📦 Found ${snap.size} tour packages\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data() as Record<string, unknown>;
    const slug = typeof data.slug === "string" ? data.slug : docSnap.id;
    const details = (data.details ?? {}) as Record<string, unknown>;

    const hasLocation = data.location !== undefined;
    const hasLocationOther = data.locationOther !== undefined;
    const hasRoute = details.route !== undefined;

    if (!hasLocation && !hasLocationOther && !hasRoute) {
      console.log(`  ⏭️  ${slug}: no legacy fields — skipping`);
      skipped++;
      continue;
    }

    const removing = [
      hasLocation ? "location" : null,
      hasLocationOther ? "locationOther" : null,
      hasRoute ? "details.route" : null,
    ].filter(Boolean);
    console.log(`  ✏️  ${slug}: removing ${removing.join(", ")}`);

    if (dryRun) {
      updated++;
      continue;
    }

    try {
      await updateDoc(doc(db, COLLECTION_NAME, docSnap.id), {
        location: deleteField(),
        locationOther: deleteField(),
        "details.route": deleteField(),
        "metadata.updatedAt": Timestamp.now(),
        "metadata.updatedBy": "migration-script",
        "metadata.migratedBy": MIGRATION_ID,
      });
      updated++;
    } catch (err) {
      console.error(`  ❌ error updating ${slug}:`, err);
      errors++;
    }
  }

  const summary = dryRun
    ? `[DRY RUN] Would update ${updated} docs, skip ${skipped}`
    : `Updated ${updated} docs, skipped ${skipped}, errors ${errors}`;

  console.log(`\n📊 ${MIGRATION_ID}: ${summary}`);
  return { message: summary, details: { updated, skipped, errors } };
}

export async function rollbackMigration() {
  console.warn(
    `\n⚠️  ${MIGRATION_ID} is NOT reversible — old values were not retained.\n` +
      `   To recover location / locationOther / details.route, restore from the backup export:\n` +
      `   admin/client/exports/export-dev/tourPackages-2025-11-23T15-54-42-974Z.json`,
  );
  return {
    message: `${MIGRATION_ID} rollback is a no-op (not reversible)`,
    details: { removed: 0, errors: 0 },
  };
}
