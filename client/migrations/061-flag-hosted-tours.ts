/**
 * 061 — Flag hosted tours on the tourPackages collection.
 *
 * WHY
 * ───
 * "Hosted" is a property of the tour itself, not of resident-host attachment:
 * a tour can be hosted without any resident host (e.g. Tanzania Exploration
 * with Danielle & Erin → slug `danielleerintanzania`). The www now classifies
 * hosted tours from a per-tour `isHosted` flag. This migration seeds that flag
 * to `true` on the tours that were previously hosted, preserving the existing
 * /hosted-tours behavior. Note: the Danielle & Erin Tanzania tour's live
 * Firestore slug is `tanzania-exploration-danielle-erin` (the old static route
 * `danielleerintanzania` is not the doc slug); the plain `tanzania-exploration`
 * stays non-hosted.
 *
 * WHAT THIS DOES
 * ──────────────
 * Sets `isHosted: true` on each tourPackages doc whose slug is in HOSTED_SLUGS.
 * Other tours are left untouched (absent flag is treated as false by the www).
 *
 * HOW TO RUN
 * ──────────
 *   cd admin/client
 *   npx tsx migrations/migrate.ts dry-run061   # preview
 *   npx tsx migrations/migrate.ts 061           # apply
 *   npx tsx migrations/migrate.ts rollback061   # undo (removes the field)
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

const MIGRATION_ID = "061-flag-hosted-tours";
const COLLECTION_NAME = "tourPackages";

// Authoritative prior hosted set, using the live tourPackages doc slugs.
const HOSTED_SLUGS = [
  "india-holi-festival-tour",
  "tanzania-exploration-danielle-erin",
  "philippine-sunset-with-jess",
  "philippine-sunset-with-roxana",
];

export async function runMigration(dryRun = false) {
  console.log(`\n🚀 Running ${MIGRATION_ID} (dryRun=${dryRun})`);

  const snap = await getDocs(collection(db, COLLECTION_NAME));
  console.log(`📦 Found ${snap.size} tour packages`);

  const bySlug = new Map<string, { id: string; slug: string }>();
  snap.docs.forEach((d) => {
    const slug = (d.data() as Record<string, unknown>).slug;
    if (typeof slug === "string") bySlug.set(slug, { id: d.id, slug });
  });

  let updated = 0;
  let notFound = 0;
  let errors = 0;

  for (const slug of HOSTED_SLUGS) {
    const match = bySlug.get(slug);
    if (!match) {
      console.warn(`  ⚠️  ${slug}: no tourPackages doc with this slug — skipping`);
      notFound++;
      continue;
    }

    try {
      if (dryRun) {
        console.log(`  🧪 [dry-run] would set isHosted=true on: ${slug}`);
        updated++;
        continue;
      }

      await updateDoc(doc(db, COLLECTION_NAME, match.id), {
        isHosted: true,
        "metadata.updatedAt": Timestamp.now(),
        "metadata.migratedBy": MIGRATION_ID,
      });
      console.log(`  ✅ flagged hosted: ${slug}`);
      updated++;
    } catch (err) {
      console.error(`  ❌ error updating ${slug}:`, err);
      errors++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Hosted slugs:   ${HOSTED_SLUGS.length}`);
  console.log(`   Updated:        ${updated}`);
  console.log(`   Not found:      ${notFound}`);
  console.log(`   Errors:         ${errors}`);

  if (dryRun) {
    console.log(`\n🧪 DRY RUN complete — no changes written to Firestore.`);
  } else {
    console.log(`\n✅ Migration complete!`);
  }

  return {
    message: `${MIGRATION_ID} completed`,
    details: { total: HOSTED_SLUGS.length, updated, notFound, errors },
  };
}

export async function rollbackMigration() {
  console.log(`\n↩️  Rolling back ${MIGRATION_ID} — removing isHosted field`);

  const snap = await getDocs(collection(db, COLLECTION_NAME));
  let removed = 0;
  let errors = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data() as Record<string, unknown>;
    const slug = typeof data.slug === "string" ? data.slug : docSnap.id;

    if (!HOSTED_SLUGS.includes(slug)) continue;

    try {
      await updateDoc(doc(db, COLLECTION_NAME, docSnap.id), {
        isHosted: deleteField(),
      });
      console.log(`  ✅ removed isHosted from: ${slug}`);
      removed++;
    } catch (err) {
      console.error(`  ❌ error rolling back ${slug}:`, err);
      errors++;
    }
  }

  console.log(`\n📊 Rollback summary: ${removed} removed, ${errors} errors`);
  return { message: `${MIGRATION_ID} rolled back`, details: { removed, errors } };
}
