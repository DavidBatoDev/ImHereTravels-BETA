/**
 * 053 — Backfill `details` array on every itinerary day in tourPackages.
 *
 * WHAT THIS DOES
 * ──────────────
 * For each tour doc, reads `details.itinerary`, converts the flat
 * `accommodation` / `activities` / `meals` fields on each day into a
 * `details: [{ icon, label, value }]` array (the same shape the www already
 * uses), and writes the entire updated itinerary array back to Firestore.
 *
 * Tours whose days already have a `details` array are skipped.
 *
 * HOW TO RUN
 * ──────────
 *   cd admin/client
 *   npx tsx migrations/migrate.ts dry-run053   # preview
 *   npx tsx migrations/migrate.ts 053           # apply
 *   npx tsx migrations/migrate.ts rollback053   # undo
 */

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase-config";

const MIGRATION_ID = "053-backfill-itinerary-details";
const COLLECTION_NAME = "tourPackages";

type Detail = { icon: string; label: string; value: string };
type RawDay = Record<string, unknown>;

function deriveDetails(day: RawDay): Detail[] {
  const det: Detail[] = [];
  if (day.accommodation) det.push({ icon: "accommodation", label: "Accommodation", value: day.accommodation as string });
  if (day.activities)    det.push({ icon: "activities",    label: "Activity",       value: day.activities    as string });
  if (day.meals)         det.push({ icon: "meals",         label: "Meals",          value: day.meals         as string });
  return det;
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
    const details = data.details as Record<string, unknown> | undefined;
    const itinerary = details?.itinerary as RawDay[] | undefined;

    if (!Array.isArray(itinerary) || itinerary.length === 0) {
      console.warn(`  ⚠️  ${slug}: no itinerary array — skipping`);
      skipped++;
      continue;
    }

    // Skip if ALL days already have a details array
    const alreadyDone = itinerary.every((d) => Array.isArray(d.details));
    if (alreadyDone) {
      console.log(`  ⏭️  ${slug}: all days already have details — skipping`);
      skipped++;
      continue;
    }

    const updatedItinerary = itinerary.map((day) => {
      if (Array.isArray(day.details)) return day; // preserve existing
      return { ...day, details: deriveDetails(day) };
    });

    if (dryRun) {
      const totalDets = updatedItinerary.reduce((sum, d) => sum + ((d.details as Detail[])?.length ?? 0), 0);
      console.log(`  🧪 [dry-run] would update: ${slug} (${itinerary.length} days, ${totalDets} total detail rows)`);
      updated++;
      continue;
    }

    try {
      await updateDoc(doc(db, COLLECTION_NAME, docSnap.id), {
        "details.itinerary": updatedItinerary,
        "metadata.updatedAt": Timestamp.now(),
        "metadata.updatedBy": "migration-script",
        "metadata.migratedBy": MIGRATION_ID,
      });
      const totalDets = updatedItinerary.reduce((sum, d) => sum + ((d.details as Detail[])?.length ?? 0), 0);
      console.log(`  ✅ updated: ${slug} (${itinerary.length} days, ${totalDets} detail rows)`);
      updated++;
    } catch (err) {
      console.error(`  ❌ error updating ${slug}:`, err);
      errors++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Total packages: ${snap.size}`);
  console.log(`   Updated:        ${updated}`);
  console.log(`   Skipped:        ${skipped}`);
  console.log(`   Errors:         ${errors}`);

  if (dryRun) {
    console.log(`\n🧪 DRY RUN complete — no changes written to Firestore.`);
  } else {
    console.log(`\n✅ Migration complete!`);
  }

  return {
    message: `${MIGRATION_ID} completed`,
    details: { total: snap.size, updated, skipped, errors },
  };
}

export async function rollbackMigration() {
  console.log(`\n↩️  Rolling back ${MIGRATION_ID} — removing details from itinerary days`);

  const snap = await getDocs(collection(db, COLLECTION_NAME));
  let removed = 0;
  let errors = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data() as Record<string, unknown>;
    const slug = typeof data.slug === "string" ? data.slug : docSnap.id;
    const details = data.details as Record<string, unknown> | undefined;
    const itinerary = details?.itinerary as RawDay[] | undefined;

    if (!Array.isArray(itinerary) || itinerary.length === 0) continue;
    if (!itinerary.some((d) => Array.isArray(d.details))) continue;

    // Strip details from each day
    const reverted = itinerary.map(({ details: _det, ...rest }) => rest);

    try {
      await updateDoc(doc(db, COLLECTION_NAME, docSnap.id), {
        "details.itinerary": reverted,
      });
      console.log(`  ✅ rolled back: ${slug}`);
      removed++;
    } catch (err) {
      console.error(`  ❌ error rolling back ${slug}:`, err);
      errors++;
    }
  }

  console.log(`\n📊 Rollback summary: ${removed} rolled back, ${errors} errors`);
  return { message: `${MIGRATION_ID} rolled back`, details: { removed, errors } };
}
