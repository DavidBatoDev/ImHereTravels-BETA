/**
 * 054 — Backfill `cardHeaderTitle` on every tourPackages document.
 *
 * WHAT THIS DOES
 * ──────────────
 * Adds `cardHeaderTitle` to each tour doc that doesn't already have it,
 * computing the value from the existing `duration` string
 * ("11 days" → "11 Day Tour").
 *
 * Docs that already have `cardHeaderTitle` are skipped.
 *
 * ROLLBACK
 * ────────
 * Removes the `cardHeaderTitle` field from every doc it was added to.
 *
 * HOW TO RUN
 * ──────────
 *   cd admin/client
 *   npx tsx migrations/migrate.ts dry-run054   # preview
 *   npx tsx migrations/migrate.ts 054           # apply
 *   npx tsx migrations/migrate.ts rollback054   # undo
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

const MIGRATION_ID = "054-backfill-card-header-title";
const COLLECTION_NAME = "tourPackages";

function buildCardHeaderTitle(duration: string): string {
  const converted = duration.replace(/\b(\d+)\s+days?\b/gi, "$1 Day Tour");
  return converted !== duration ? converted : duration;
}

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

    if (data.cardHeaderTitle) {
      console.log(`  ⏭️  ${slug}: already has cardHeaderTitle — skipping`);
      skipped++;
      continue;
    }

    const duration = typeof data.duration === "string" ? data.duration : "";
    const cardHeaderTitle = duration ? buildCardHeaderTitle(duration) : "Tour";

    if (dryRun) {
      console.log(`  🧪 [dry-run] would update: ${slug} → cardHeaderTitle: "${cardHeaderTitle}"`);
      updated++;
      continue;
    }

    try {
      await updateDoc(doc(db, COLLECTION_NAME, docSnap.id), {
        cardHeaderTitle,
        "metadata.updatedAt": Timestamp.now(),
        "metadata.updatedBy": "migration-script",
        "metadata.migratedBy": MIGRATION_ID,
      });
      console.log(`  ✅ updated: ${slug} → cardHeaderTitle: "${cardHeaderTitle}"`);
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
  return {
    message: summary,
    details: { updated, skipped, errors },
  };
}

export async function rollbackMigration() {
  console.log(`\n↩️  Rolling back ${MIGRATION_ID}`);

  const snap = await getDocs(collection(db, COLLECTION_NAME));
  let removed = 0;
  let errors = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data() as Record<string, unknown>;
    const slug = typeof data.slug === "string" ? data.slug : docSnap.id;

    if (!data.cardHeaderTitle) {
      continue;
    }

    try {
      await updateDoc(doc(db, COLLECTION_NAME, docSnap.id), {
        cardHeaderTitle: deleteField(),
        "metadata.updatedAt": Timestamp.now(),
        "metadata.updatedBy": "rollback-script",
        "metadata.migratedBy": `rollback-${MIGRATION_ID}`,
      });
      console.log(`  ✅ removed cardHeaderTitle from: ${slug}`);
      removed++;
    } catch (err) {
      console.error(`  ❌ error rolling back ${slug}:`, err);
      errors++;
    }
  }

  const summary = `Removed cardHeaderTitle from ${removed} docs, errors ${errors}`;
  console.log(`\n📊 Rollback ${MIGRATION_ID}: ${summary}`);
  return { message: summary, details: { removed, errors } };
}
