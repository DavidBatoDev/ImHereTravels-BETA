/**
 * 055 — Backfill `cardSubHeader` on every tourPackages document.
 *
 * WHAT THIS DOES
 * ──────────────
 * Adds `cardSubHeader` to each tour doc that doesn't already have it,
 * computing the value from `details.route` if set, falling back to `location`.
 *
 * Docs that already have `cardSubHeader` are skipped.
 *
 * ROLLBACK
 * ────────
 * Removes the `cardSubHeader` field from every doc it was added to.
 *
 * HOW TO RUN
 * ──────────
 *   cd admin/client
 *   npx tsx migrations/migrate.ts dry-run055   # preview
 *   npx tsx migrations/migrate.ts 055           # apply
 *   npx tsx migrations/migrate.ts rollback055   # undo
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

const MIGRATION_ID = "055-backfill-card-sub-header";
const COLLECTION_NAME = "tourPackages";

export async function runMigration(dryRun = false) {
  console.log(`\n🚀 Running ${MIGRATION_ID} (dryRun=${dryRun})`);

  const snap = await getDocs(collection(db, COLLECTION_NAME));
  console.log(`📦 Found ${snap.size} tour packages`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data() as Record<string, unknown>;
    const slug = typeof data.slug === "string" ? data.slug : docSnap.id;

    if (data.cardSubHeader) {
      console.log(`  ⏭️  ${slug}: already has cardSubHeader — skipping`);
      skipped++;
      continue;
    }

    const details = data.details as Record<string, unknown> | undefined;
    const cardSubHeader =
      (typeof details?.route === "string" && details.route) ||
      (typeof data.location === "string" && data.location) ||
      "";

    if (dryRun) {
      console.log(`  🧪 [dry-run] would update: ${slug} → cardSubHeader: "${cardSubHeader}"`);
      updated++;
      continue;
    }

    try {
      await updateDoc(doc(db, COLLECTION_NAME, docSnap.id), {
        cardSubHeader,
        "metadata.updatedAt": Timestamp.now(),
        "metadata.updatedBy": "migration-script",
        "metadata.migratedBy": MIGRATION_ID,
      });
      console.log(`  ✅ updated: ${slug} → cardSubHeader: "${cardSubHeader}"`);
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
  console.log(`\n↩️  Rolling back ${MIGRATION_ID}`);

  const snap = await getDocs(collection(db, COLLECTION_NAME));
  let removed = 0;
  let errors = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data() as Record<string, unknown>;
    const slug = typeof data.slug === "string" ? data.slug : docSnap.id;

    if (!data.cardSubHeader) continue;

    try {
      await updateDoc(doc(db, COLLECTION_NAME, docSnap.id), {
        cardSubHeader: deleteField(),
        "metadata.updatedAt": Timestamp.now(),
        "metadata.updatedBy": "rollback-script",
        "metadata.migratedBy": `rollback-${MIGRATION_ID}`,
      });
      console.log(`  ✅ removed cardSubHeader from: ${slug}`);
      removed++;
    } catch (err) {
      console.error(`  ❌ error rolling back ${slug}:`, err);
      errors++;
    }
  }

  const summary = `Removed cardSubHeader from ${removed} docs, errors ${errors}`;
  console.log(`\n📊 Rollback ${MIGRATION_ID}: ${summary}`);
  return { message: summary, details: { removed, errors } };
}
