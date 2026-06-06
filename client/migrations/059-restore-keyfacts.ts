/**
 * 059 — Restore `details.keyFacts` on every tourPackages document.
 *
 * WHY
 * ───
 * A schema gap in the tour editor (`keyFacts` was missing from the Zod
 * `details` schema) caused every "Save Changes" to strip keyFacts, and the
 * PATCH handler's full-`details` replace then deleted them from Firestore.
 * The editor bug is now fixed (keyFacts is in the schema + the PATCH handler
 * merges `details`), so this migration re-seeds the canonical keyFacts that
 * were wiped. Identical data + behaviour to 051; provided as a fresh
 * migration so it can be applied independently.
 *
 * WHAT THIS DOES
 * ──────────────
 * Sets `details.keyFacts` (Array<{ icon, label, values[] }>) on each tour doc
 * from the hardcoded map below — Tour Dates excluded (always derived from
 * travelDates). Always overwrites, so re-running is safe.
 *
 * HOW TO RUN
 * ──────────
 *   cd admin/client
 *   npx tsx migrations/migrate.ts dry-run059   # preview
 *   npx tsx migrations/migrate.ts 059           # apply
 *   npx tsx migrations/migrate.ts rollback059   # undo (removes the field)
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

const MIGRATION_ID = "059-restore-keyfacts";
const COLLECTION_NAME = "tourPackages";

type KF = { icon: string; label: string; values: string[] };

// Canonical keyFacts per Firestore document slug — Tour Dates excluded.
const KEYFACTS_MAP: Record<string, KF[]> = {
  "philippine-sunrise": [
    { icon: "days",   label: "Duration",    values: ["11 Days / 10 Nights"] },
    { icon: "route",  label: "Destination", values: ["Cebu → Moalboal → Siargao"] },
    { icon: "people", label: "Group Size",  values: ["Maximum 22 people"] },
  ],
  "philippine-sunset": [
    { icon: "days",   label: "Duration",    values: ["11 Days and 10 Nights"] },
    { icon: "route",  label: "Destination", values: ["Manila → Port Barton → El Nido → Isla Darocotan"] },
    { icon: "people", label: "Group Size",  values: ["Maximum 22 people"] },
  ],
  "philippine-sunset-with-jess": [
    { icon: "days",   label: "Duration",    values: ["11 Days and 10 Nights"] },
    { icon: "route",  label: "Destination", values: ["Manila → Port Barton → El Nido → Isla Darocotan"] },
    { icon: "people", label: "Group Size",  values: ["Maximum 22 people"] },
  ],
  "philippine-sunset-with-roxana": [
    { icon: "days",   label: "Duration",    values: ["11 Days and 10 Nights"] },
    { icon: "route",  label: "Destination", values: ["Manila → Port Barton → El Nido → Isla Darocotan"] },
    { icon: "people", label: "Group Size",  values: ["Maximum 22 people"] },
  ],
  "maldives-bucketlist": [
    { icon: "days",   label: "Duration",    values: ["9 Days and 8 Nights"] },
    { icon: "route",  label: "Destination", values: ["Hulhumale → Rasdhoo → Ukulhas"] },
    { icon: "people", label: "Group Size",  values: ["Maximum 22 people"] },
  ],
  "bhutan-quest": [
    { icon: "days",   label: "Duration",    values: ["7 Days and 6 Nights"] },
    { icon: "route",  label: "Destination", values: ["Punakha → Gangtey → Thimphu → Paro"] },
    { icon: "people", label: "Group Size",  values: ["Maximum 20 people"] },
  ],
  "nepal-horizons": [
    { icon: "route",  label: "Destination", values: ["Kathmandu → Chitwan → Bandipur → Pokhara"] },
    { icon: "days",   label: "Days",        values: ["9 Days and 8 Nights"] },
    { icon: "people", label: "Group Size",  values: ["Maximum 20 people"] },
  ],
  "india-discovery-tour": [
    { icon: "route",  label: "Destination", values: ["New Delhi → Jodhpur → Udaipur → Jaipur → Sawai Madhopur → Agra"] },
    { icon: "days",   label: "Days",        values: ["13 Days and 12 Nights"] },
    { icon: "people", label: "Group Size",  values: ["Maximum 20 people"] },
  ],
  "india-holi-festival-tour": [
    { icon: "days",   label: "Duration",    values: ["13 Days and 12 Nights"] },
    { icon: "route",  label: "Destinations", values: ["New Delhi -> Jodhpur -> Udaipur -> Jaipur -> Sawai Madhopur -> Agra"] },
    { icon: "people", label: "Group Size",  values: ["Maximum 20 people"] },
  ],
  "sri-lanka-wander-tour": [
    { icon: "days",   label: "Duration",    values: ["11 Days and 10 Nights"] },
    { icon: "route",  label: "Destination", values: ["Negombo → Sigiriya → Kandy → Ella → Yala → Mirissa"] },
    { icon: "people", label: "Group Size",  values: ["Maximum 20 people"] },
  ],
  "vietnam-expedition": [
    { icon: "days",   label: "Duration",    values: ["11 Days and 10 Nights"] },
    { icon: "route",  label: "Destination", values: ["Hanoi → Ninh Binh → Hue → Hoi An → Da Nang"] },
    { icon: "people", label: "Group Size",  values: ["Maximum 22 people"] },
  ],
  "china-discovery": [
    { icon: "route",  label: "Destination", values: ["Beijing → Shanghai"] },
    { icon: "days",   label: "Days",        values: ["10 Days and 9 Nights"] },
    { icon: "people", label: "Group Size",  values: ["Maximum 20 people"] },
  ],
  "japan-summer-adventure": [
    { icon: "route",  label: "Destination", values: ["Tokyo → Atami → Kyoto"] },
    { icon: "days",   label: "Days",        values: ["10 Days and 9 Nights"] },
    { icon: "people", label: "Group Size",  values: ["Maximum 20 people"] },
  ],
  "japan-adventure-with-skiing": [
    { icon: "days",   label: "Duration",    values: ["10 Days and 9 Nights"] },
    { icon: "route",  label: "Location",    values: ["Japan"] },
  ],
  "japan-adventure-winter": [
    { icon: "days",   label: "Duration",    values: ["10 Days and 9 Nights"] },
    { icon: "route",  label: "Destination", values: ["Tokyo → Nagano"] },
    { icon: "people", label: "Group Size",  values: ["Maximum 20 people"] },
  ],
  "tanzania-exploration": [
    { icon: "days",   label: "Duration",    values: ["10 Days and 9 Nights"] },
    { icon: "route",  label: "Destination", values: ["Kilimanjaro → Arusha → Karatu → Zanzibar"] },
    { icon: "people", label: "Group Size",  values: ["Maximum 18 people"] },
  ],
  "tanzania-exploration-danielle-erin": [
    { icon: "days",   label: "Duration",    values: ["10 Days and 9 Nights"] },
    { icon: "route",  label: "Destination", values: ["Moshi → Arusha → Karatu → Zanzibar"] },
    { icon: "people", label: "Group Size",  values: ["Maximum 20 people"] },
  ],
  "new-zealand-expedition": [
    { icon: "route",  label: "Destination", values: [
        "North: Auckland → Raglan → Waitomo → Rotorua → Wellington",
        "South: Christchurch → Franz Josef → Queenstown → Milford Sound",
      ],
    },
    { icon: "days",   label: "Days",        values: ["15 Days and 14 Nights"] },
    { icon: "people", label: "Group Size",  values: ["Maximum 16 people"] },
  ],
  "argentinas-wonders": [
    { icon: "days",   label: "Duration",    values: ["10 Nights and 11 Days"] },
    { icon: "route",  label: "Destination", values: ["Buenos Aires → Patagonia El Chalten → Iguazu"] },
    { icon: "people", label: "Group Size",  values: ["Maximum 20 people"] },
  ],
  "brazils-treasures": [
    { icon: "route",  label: "Destination", values: ["São Paulo → Rio de Janeiro"] },
    { icon: "days",   label: "Duration",    values: ["7 days & 6 Nights"] },
    { icon: "people", label: "Group Size",  values: ["Maximum 20 people"] },
  ],
  "siargao-island-adventure": [
    { icon: "route",  label: "Destination", values: ["Siargao"] },
    { icon: "people", label: "Group Size",  values: ["Maximum 20 people"] },
  ],
};

export async function runMigration(dryRun = false) {
  console.log(`\n🚀 Running ${MIGRATION_ID} (dryRun=${dryRun})`);

  const snap = await getDocs(collection(db, COLLECTION_NAME));
  console.log(`📦 Found ${snap.size} tour packages`);

  let updated = 0;
  let notMapped = 0;
  let errors = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data() as Record<string, unknown>;
    const slug = typeof data.slug === "string" ? data.slug : docSnap.id;
    const keyFacts = KEYFACTS_MAP[slug];

    if (!keyFacts) {
      console.warn(`  ⚠️  ${slug}: not in KEYFACTS_MAP — skipping`);
      notMapped++;
      continue;
    }

    try {
      if (dryRun) {
        console.log(`  🧪 [dry-run] would set details.keyFacts on: ${slug} (${keyFacts.length} facts)`);
        updated++;
        continue;
      }

      await updateDoc(doc(db, COLLECTION_NAME, docSnap.id), {
        "details.keyFacts": keyFacts,
        "metadata.updatedAt": Timestamp.now(),
        "metadata.updatedBy": "migration-script",
        "metadata.migratedBy": MIGRATION_ID,
      });
      console.log(`  ✅ restored: ${slug} (${keyFacts.length} facts)`);
      updated++;
    } catch (err) {
      console.error(`  ❌ error updating ${slug}:`, err);
      errors++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Total packages: ${snap.size}`);
  console.log(`   Updated:        ${updated}`);
  console.log(`   Not in map:     ${notMapped}`);
  console.log(`   Errors:         ${errors}`);

  if (dryRun) {
    console.log(`\n🧪 DRY RUN complete — no changes written to Firestore.`);
  } else {
    console.log(`\n✅ Migration complete!`);
  }

  return {
    message: `${MIGRATION_ID} completed`,
    details: { total: snap.size, updated, notMapped, errors },
  };
}

export async function rollbackMigration() {
  console.log(`\n↩️  Rolling back ${MIGRATION_ID} — removing details.keyFacts field`);

  const snap = await getDocs(collection(db, COLLECTION_NAME));
  let removed = 0;
  let errors = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data() as Record<string, unknown>;
    const slug = typeof data.slug === "string" ? data.slug : docSnap.id;

    if (!KEYFACTS_MAP[slug]) continue;

    try {
      await updateDoc(doc(db, COLLECTION_NAME, docSnap.id), {
        "details.keyFacts": deleteField(),
      });
      console.log(`  ✅ removed from: ${slug}`);
      removed++;
    } catch (err) {
      console.error(`  ❌ error rolling back ${slug}:`, err);
      errors++;
    }
  }

  console.log(`\n📊 Rollback summary: ${removed} removed, ${errors} errors`);
  return { message: `${MIGRATION_ID} rolled back`, details: { removed, errors } };
}
