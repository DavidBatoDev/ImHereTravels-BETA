/**
 * 049 — Backfill gallery thumbnails and upgrade tags to { label, icon }[] objects.
 *
 * WHAT THIS DOES
 * ──────────────
 * 1. Sets `media.gallery` (thumbnail URL array) on each tour doc from the
 *    companion JSON, but ONLY when the existing gallery is empty/missing.
 *    Tours that already have admin-uploaded gallery images are left untouched.
 *
 * 2. Converts `details.tags` from the old `string[]` format to the new
 *    `{ label: string; icon: string }[]` format.  If a tag entry is already
 *    an object it is preserved as-is.
 *
 * HOW TO RUN
 * ──────────
 * 1. Generate the companion JSON (one-time, from www/web):
 *      npx tsx data/scripts/extract-enrichment-for-migration.ts \
 *        > ../../admin/client/migrations/049-gallery-tags-data.json
 *
 *    NOTE: This overwrites any existing 048 data file — use a new path.
 *    Alternatively, copy only the gallery/tags portions by hand.
 *
 * 2. Dry-run first:
 *      cd admin/client && npx tsx migrations/migrate.ts dry-run049
 *
 * 3. Apply:
 *      cd admin/client && npx tsx migrations/migrate.ts 049
 */

import fs from "fs";
import path from "path";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase-config";

const MIGRATION_ID = "049-backfill-gallery-and-tags";
const COLLECTION_NAME = "tourPackages";

const DATA_JSON_PATH = path.join(__dirname, "049-gallery-tags-data.json");

// Known mismatches between Firestore slug and www static file slug.
const SLUG_ALIASES: Record<string, string> = {
  "tanzania-exploration-danielle-erin": "danielleerintanzania",
  "japan-summer-adventure": "japan-adventure",
  "sri-lanka-wander-tour": "sri-langka-wander-tour",
};

interface TourData {
  gallery?: { thumbnails?: string[] };
  details?: {
    tags?: Array<string | { label: string; icon: string }>;
  };
}

function loadData(): Record<string, TourData> {
  if (!fs.existsSync(DATA_JSON_PATH)) {
    console.warn(`\n⚠️  Companion JSON not found at:\n   ${DATA_JSON_PATH}`);
    console.warn(
      `   Run the extraction script from www/web first (see file header).`,
    );
    return {};
  }
  return JSON.parse(fs.readFileSync(DATA_JSON_PATH, "utf-8"));
}

function normalizeTag(
  tag: string | { label: string; icon: string },
): { label: string; icon: string } {
  if (typeof tag === "string") return { label: tag, icon: "location" };
  return { label: tag.label ?? "", icon: tag.icon ?? "location" };
}

export async function runMigration(dryRun = false) {
  console.log(`\n🚀 Running ${MIGRATION_ID} (dryRun=${dryRun})`);

  const sourceData = loadData();
  const sourceSlugs = Object.keys(sourceData);
  console.log(`📋 Source data loaded for ${sourceSlugs.length} tours`);

  const snap = await getDocs(collection(db, COLLECTION_NAME));
  console.log(`📦 Found ${snap.size} tour packages`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data() as Record<string, unknown>;
    const slug = typeof data.slug === "string" ? data.slug : docSnap.id;
    const lookupSlug = SLUG_ALIASES[slug] ?? slug;
    const source = sourceData[lookupSlug];

    try {
      const updatePayload: Record<string, unknown> = {
        "metadata.updatedAt": Timestamp.now(),
        "metadata.updatedBy": "migration-script",
        "metadata.migratedBy": MIGRATION_ID,
      };

      let hasChanges = false;

      // ── 1. Gallery thumbnails ─────────────────────────────────────────────
      const existingGallery = (data.media as Record<string, unknown>)?.gallery;
      const galleryIsEmpty =
        !existingGallery ||
        (Array.isArray(existingGallery) && existingGallery.length === 0);

      if (galleryIsEmpty && source?.gallery?.thumbnails?.length) {
        updatePayload["media.gallery"] = source.gallery.thumbnails;
        hasChanges = true;
        console.log(
          `  📷 ${slug}: will set media.gallery (${source.gallery.thumbnails.length} images)`,
        );
      }

      // ── 2. Tags → { label, icon }[] ────────────────────────────────────────
      const existingTags = (data.details as Record<string, unknown>)?.tags;
      if (Array.isArray(existingTags) && existingTags.length) {
        const alreadyObjects = existingTags.every(
          (t) => typeof t === "object" && t !== null,
        );
        if (!alreadyObjects) {
          updatePayload["details.tags"] = existingTags.map(normalizeTag);
          hasChanges = true;
          console.log(`  🏷️  ${slug}: will convert details.tags to objects`);
        }
      }

      if (!hasChanges) {
        skipped++;
        if (dryRun) {
          console.log(`  ⏭️  [dry-run] skip: ${slug} (nothing to update)`);
        }
        continue;
      }

      if (dryRun) {
        console.log(`  🧪 [dry-run] would update: ${slug}`);
        updated++;
        continue;
      }

      await updateDoc(doc(db, COLLECTION_NAME, docSnap.id), updatePayload);
      console.log(`  ✅ updated: ${slug}`);
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
  console.log(`\n↩️  Rolling back ${MIGRATION_ID}`);
  console.log(
    `   Tags rollback: would require restoring original string[] format.`,
  );
  console.log(
    `   Gallery rollback: would require clearing media.gallery arrays.`,
  );
  console.log(
    `   Both are low-risk to do manually in Firestore console if needed.`,
  );
}
