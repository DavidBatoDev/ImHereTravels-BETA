/**
 * 050 — Backfill `destinations` (string[]) on every tourPackages document.
 *
 * WHAT THIS DOES
 * ──────────────
 * Sets the `destinations` field on each tour doc from a hardcoded map derived
 * from the www `header.tags` where `icon === "location"` in each tour data file.
 * Always overwrites the field (including if already set), so re-running is safe.
 *
 * HOW TO RUN
 * ──────────
 *   cd admin/client
 *   npx tsx migrations/migrate.ts dry-run050   # preview
 *   npx tsx migrations/migrate.ts 050           # apply
 *   npx tsx migrations/migrate.ts rollback050   # undo (removes the field)
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

const MIGRATION_ID = "050-backfill-destinations";
const COLLECTION_NAME = "tourPackages";

// Derived from www/web/data/*.ts header.tags where icon === "location".
// Keys are Firestore document slugs (which may differ from www page slugs).
const DESTINATIONS_MAP: Record<string, string[]> = {
  "philippine-sunrise":                 ["Cebu", "Moalboal", "Siargao"],
  "philippine-sunset":                  ["Manila", "Port Barton", "El Nido", "Isla Darocotan"],
  "philippine-sunset-with-jess":        ["Manila", "Port Barton", "El Nido", "Isla Darocotan"],
  "philippine-sunset-with-roxana":      ["Manila", "Port Barton", "El Nido", "Isla Darocotan"],
  "maldives-bucketlist":                ["Maldives"],
  "bhutan-quest":                       ["Bhutan", "Trekking", "Adventure", "Tiger's Nest"],
  "nepal-horizons":                     ["Kathmandu", "Chitwan", "Bandipur", "Pokhara"],
  "india-discovery-tour":               ["New Delhi", "Jodhpur", "Udaipur", "Jaipur"],
  "india-holi-festival-tour":           ["India", "Taj Mahal"],
  "sri-lanka-wander-tour":              ["Negombo", "Sigiriya", "Kandy", "Ella", "Yala", "Mirissa"],
  "vietnam-expedition":                 ["Hanoi", "Ninh Binh", "Hue", "Hoi An", "Da Nang"],
  "china-discovery":                    ["Beijing", "Shanghai", "Zhujiajiao"],
  "japan-summer-adventure":             ["Tokyo", "Atami", "Kyoto"],
  "japan-adventure-with-skiing":        ["Japan"],
  "japan-adventure-winter":             ["Tokyo", "Nagano", "Kyoto", "Osaka"],
  "tanzania-exploration":               ["Tanzania", "Safari", "Kilimanjaro", "Zanzibar"],
  "tanzania-exploration-danielle-erin": ["Tanzania", "Safari", "Kilimanjaro", "Zanzibar"],
  "new-zealand-expedition":             ["Auckland", "Wellington", "Christchurch", "Queenstown"],
  "argentinas-wonders":                 ["Argentina", "Patagonia", "Buenos Aires", "Chalten", "Calafate", "Iguazu", "Jujuy & Salta"],
  "brazils-treasures":                  ["São Paulo", "Rio de Janeiro"],
  "siargao-island-adventure":           ["Siargao", "Cebu"],
};

export async function runMigration(dryRun = false) {
  console.log(`\n🚀 Running ${MIGRATION_ID} (dryRun=${dryRun})`);

  const snap = await getDocs(collection(db, COLLECTION_NAME));
  console.log(`📦 Found ${snap.size} tour packages`);

  let updated = 0;
  let skipped = 0;
  let notMapped = 0;
  let errors = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data() as Record<string, unknown>;
    const slug = typeof data.slug === "string" ? data.slug : docSnap.id;
    const destinations = DESTINATIONS_MAP[slug];

    if (!destinations) {
      console.warn(`  ⚠️  ${slug}: not in DESTINATIONS_MAP — skipping`);
      notMapped++;
      continue;
    }

    try {
      if (dryRun) {
        console.log(`  🧪 [dry-run] would set destinations on: ${slug} → [${destinations.join(", ")}]`);
        updated++;
        continue;
      }

      await updateDoc(doc(db, COLLECTION_NAME, docSnap.id), {
        destinations,
        "metadata.updatedAt": Timestamp.now(),
        "metadata.updatedBy": "migration-script",
        "metadata.migratedBy": MIGRATION_ID,
      });
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
  console.log(`   Not in map:     ${notMapped}`);
  console.log(`   Errors:         ${errors}`);

  if (dryRun) {
    console.log(`\n🧪 DRY RUN complete — no changes written to Firestore.`);
  } else {
    console.log(`\n✅ Migration complete!`);
  }

  return {
    message: `${MIGRATION_ID} completed`,
    details: { total: snap.size, updated, skipped, notMapped, errors },
  };
}

export async function rollbackMigration() {
  console.log(`\n↩️  Rolling back ${MIGRATION_ID} — removing destinations field`);

  const snap = await getDocs(collection(db, COLLECTION_NAME));
  let removed = 0;
  let errors = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data() as Record<string, unknown>;
    const slug = typeof data.slug === "string" ? data.slug : docSnap.id;

    if (!DESTINATIONS_MAP[slug]) continue;

    try {
      await updateDoc(doc(db, COLLECTION_NAME, docSnap.id), {
        destinations: deleteField(),
      });
      console.log(`  ✅ removed destinations from: ${slug}`);
      removed++;
    } catch (err) {
      console.error(`  ❌ error rolling back ${slug}:`, err);
      errors++;
    }
  }

  console.log(`\n📊 Rollback summary: ${removed} removed, ${errors} errors`);
  return { message: `${MIGRATION_ID} rolled back`, details: { removed, errors } };
}
