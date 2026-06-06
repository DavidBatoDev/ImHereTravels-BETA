/**
 * 064 — Replace the Maldives Bucketlist itinerary with the www tours data.
 *
 * WHY
 * ───
 * The Firestore `maldives-bucketlist` itinerary had drifted from the canonical
 * www tour data (different day titles/descriptions, only 8 days, and no per-day
 * "Location" detail). This migration overwrites `details.itinerary` on that one
 * tour with the 9-day itinerary from `www/web/data/maldives-bucketlist.ts`,
 * mapping each www day to the Firestore `TourItinerary` shape:
 *
 *     { day, title, description, image, details: [{ icon, label, value }] }
 *
 * The www day `details` array (Accommodation / Location / Activities / Meals) is
 * copied verbatim — both the admin tour form and www render `details[]`
 * directly, so the Location rows now show up everywhere.
 *
 * SCOPE
 * ─────
 *   • Only the tour with slug `maldives-bucketlist` is touched.
 *   • Only `details.itinerary` is replaced; all other fields are left untouched.
 *   • Day images use the www asset paths (e.g. `/tours/maldives-bucketlist/…`),
 *     which resolve against the www domain in both apps.
 *
 * Reversible: the prior itinerary is stashed in `_migration064` before the
 * overwrite; rollback restores it exactly (or removes it if there was none).
 *
 * HOW TO RUN
 * ──────────
 *   cd admin/client
 *   npx tsx migrations/migrate.ts dry-run064   # preview
 *   npx tsx migrations/migrate.ts 064           # apply
 *   npx tsx migrations/migrate.ts rollback064   # undo
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

const MIGRATION_ID = "064-maldives-itinerary-from-www";
const COLLECTION_NAME = "tourPackages";
const TARGET_SLUG = "maldives-bucketlist";
const BACKUP_FIELD = "_migration064";

type DayDetail = { icon: string; label: string; value: string };
type ItineraryDay = {
  day: number;
  title: string;
  description: string;
  image: string;
  details: DayDetail[];
};

const IMG = (n: number) => `/tours/maldives-bucketlist/maldives-day-${n}.webp`;

// Sourced verbatim from www/web/data/maldives-bucketlist.ts (itinerary.days).
const NEW_ITINERARY: ItineraryDay[] = [
  {
    day: 1,
    title: "Arrival Bliss",
    description:
      "Touch down in paradise! As soon as you land at Male International Airport, your adventure kicks off. Our awesome tour leader will greet you and whisk you away to your guesthouse on Hulhumale, just 15 minutes away. Drop your bags, throw on some flip-flops, and hit the beach or explore local cafes. The excitement starts now!",
    image: IMG(1),
    details: [
      { icon: "accommodation", label: "Accommodation", value: "Ocean Grand" },
      { icon: "location", label: "Location", value: "Hulhumale" },
      { icon: "activities", label: "Activities", value: "Welcome Dinner" },
      { icon: "meals", label: "Meals", value: "1 Dinner" },
    ],
  },
  {
    day: 2,
    title: "Discover Male's Hidden Gems",
    description:
      "Get ready to dive into the vibrant culture of Male City! With our local guide leading the way, you'll explore bustling markets, the impressive President's Palace, and the historic Friday Mosque. Expect some secret spots that tourists usually miss — this is the real Maldives!",
    image: IMG(2),
    details: [
      { icon: "accommodation", label: "Accommodation", value: "Ocean Grand" },
      { icon: "location", label: "Location", value: "Hulhumale" },
      { icon: "activities", label: "Activities", value: "Whole day Male tour" },
      { icon: "meals", label: "Meals", value: "1 Breakfast, 1 Lunch" },
    ],
  },
  {
    day: 3,
    title: "Speedboat to Rasdhoo & Coral Reefs",
    description:
      "Rise and shine, it's time for an epic speedboat ride to Rasdhoo! This island is your gateway to some of the best dive sites in the Maldives. Snorkel or dive among stunning coral reefs and get up close with incredible marine life. Adventure awaits!",
    image: IMG(3),
    details: [
      { icon: "accommodation", label: "Accommodation", value: "Tranquila Maldives" },
      { icon: "location", label: "Location", value: "Rasdhoo" },
      { icon: "activities", label: "Activities", value: "Snorkeling" },
      { icon: "meals", label: "Meals", value: "1 Breakfast, 1 Dinner" },
    ],
  },
  {
    day: 4,
    title: "Dive, Explore, Repeat",
    description:
      "Calling all divers! Start your day early with a dive at Hammerhead Point or try a Discover Scuba Dive if you're new to the underwater world. Spend the afternoon exploring Rasdhoo with your guide, meeting locals, visiting the mosque, and tasting delicious 'hedika' at a cozy cafe.",
    image: IMG(4),
    details: [
      { icon: "accommodation", label: "Accommodation", value: "Tranquila Maldives" },
      { icon: "location", label: "Location", value: "Rasdhoo" },
      { icon: "activities", label: "Activities", value: "Island Tour" },
      { icon: "meals", label: "Meals", value: "1 Breakfast, 1 Dinner" },
    ],
  },
  {
    day: 5,
    title: "Robinson Crusoe Day",
    description:
      "Escape to an uninhabited island for the ultimate castaway experience! Just a quick speedboat ride from Rasdhoo, this island paradise is perfect for sunbathing, snorkeling, and swimming in a clear blue lagoon. It's your own private slice of heaven!",
    image: IMG(5),
    details: [
      { icon: "accommodation", label: "Accommodation", value: "Tranquila Maldives" },
      { icon: "location", label: "Location", value: "Rasdhoo" },
      { icon: "activities", label: "Activities", value: "Visit to Uninhabited Island, Snorkeling" },
      { icon: "meals", label: "Meals", value: "1 Breakfast, 1 Lunch" },
    ],
  },
  {
    day: 6,
    title: "Transfer to Ukulhas & Sunset Paddle",
    description:
      "Hop over to Ukulhas, an island famous for its stunning white sand beaches and vibrant house reef. Spend your day chilling or exploring, then join us for a magical sunset kayaking or SUP tour. Keep an eye out for eagle rays and sharks gliding beneath you — pure magic!",
    image: IMG(6),
    details: [
      { icon: "accommodation", label: "Accommodation", value: "Ostrov" },
      { icon: "location", label: "Location", value: "Ukulhas" },
      { icon: "activities", label: "Activities", value: "Stand Up Paddle Boarding, Snorkeling" },
      { icon: "meals", label: "Meals", value: "1 Breakfast, 1 Dinner" },
    ],
  },
  {
    day: 7,
    title: "Sunset Cruise & Manta Rays",
    description:
      "Kick off the morning snorkeling among colorful coral reefs, with the chance to encounter majestic manta rays. Your guide will ensure a respectful and unforgettable experience. Later, set sail on a sunset cruise to hunt for dolphins. Watching them leap through the water is an absolute thrill!",
    image: IMG(7),
    details: [
      { icon: "accommodation", label: "Accommodation", value: "Ostrov" },
      { icon: "location", label: "Location", value: "Ukulhas" },
      { icon: "activities", label: "Activities", value: "Manta Ray Snorkeling Point and Sunset Cruise" },
      { icon: "meals", label: "Meals", value: "1 Breakfast, 1 Dinner" },
    ],
  },
  {
    day: 8,
    title: "Free Day or Whale Shark Hunt",
    description:
      "Today is all about choice — relax and soak up the sun or join an exhilarating tour to search for whale sharks. These gentle giants are seen year-round, and snorkeling alongside them is a bucket-list moment you'll never forget!",
    image: IMG(8),
    details: [
      { icon: "accommodation", label: "Accommodation", value: "Ostrov" },
      { icon: "location", label: "Location", value: "Ukulhas" },
      { icon: "activities", label: "Activities", value: "Snorkeling" },
      { icon: "meals", label: "Meals", value: "1 Breakfast, 1 Dinner" },
    ],
  },
  {
    day: 9,
    title: "Farewell Maldives",
    description:
      "After a hearty breakfast, it's time to head back to Male on a public speedboat. Say goodbye to your new friends and this incredible island adventure. You'll leave with amazing memories and maybe a bit of a tan!",
    image: IMG(9),
    details: [{ icon: "meals", label: "Meals", value: "1 Breakfast" }],
  },
];

function findBySlug(
  docs: { id: string; data: () => Record<string, unknown> }[],
  slug: string,
) {
  return docs.find((d) => (d.data() as Record<string, unknown>).slug === slug);
}

function titlesOf(itinerary: unknown): string[] {
  if (!Array.isArray(itinerary)) return [];
  return itinerary.map((d: any, i: number) => `${d?.day ?? i + 1}. ${d?.title ?? "(untitled)"}`);
}

export async function runMigration(dryRun = false) {
  console.log(`\n🚀 Running ${MIGRATION_ID} (dryRun=${dryRun})`);

  const snap = await getDocs(collection(db, COLLECTION_NAME));
  const target = findBySlug(snap.docs, TARGET_SLUG);

  if (!target) {
    console.error(`  ❌ Target tour not found (slug=${TARGET_SLUG})`);
    return { message: `${MIGRATION_ID} aborted`, details: { updated: 0, errors: 1 } };
  }

  const data = target.data() as Record<string, unknown>;
  const details = (data.details as Record<string, unknown> | undefined) ?? {};
  const prevItinerary = details.itinerary;
  const oldTitles = titlesOf(prevItinerary);
  const newTitles = titlesOf(NEW_ITINERARY);

  console.log(`  📋 Tour "${(data.name as string) ?? TARGET_SLUG}" (doc ${target.id})`);
  console.log(`     Days: ${oldTitles.length} → ${newTitles.length}`);
  const rows = Math.max(oldTitles.length, newTitles.length);
  for (let i = 0; i < rows; i++) {
    const before = oldTitles[i] ?? "—";
    const after = newTitles[i] ?? "—";
    const mark = before === after ? "  " : "✏️";
    console.log(`     ${mark} ${before.padEnd(48)} → ${after}`);
  }
  console.log(`     Day images set to www paths: /tours/maldives-bucketlist/maldives-day-{1..9}.webp`);
  console.log(`     Each day now includes a "Location" detail row.`);

  if (dryRun) {
    console.log(`\n🧪 DRY RUN complete — no changes written.`);
    return {
      message: `${MIGRATION_ID} dry-run`,
      details: { updated: 1, prevDays: oldTitles.length, newDays: newTitles.length, errors: 0 },
    };
  }

  const update: Record<string, unknown> = {
    "details.itinerary": NEW_ITINERARY,
    "metadata.updatedAt": Timestamp.now(),
    "metadata.migratedBy": MIGRATION_ID,
  };
  // One-time backup so rollback is exact (don't clobber an existing backup).
  if (!(BACKUP_FIELD in data)) {
    update[BACKUP_FIELD] = { prevItinerary: prevItinerary ?? null };
  } else {
    console.log(`  ℹ️  ${BACKUP_FIELD} already present — keeping the original backup.`);
  }

  try {
    await updateDoc(doc(db, COLLECTION_NAME, target.id), update);
    console.log(`\n✅ Replaced the Maldives itinerary (${newTitles.length} days).`);
    return {
      message: `${MIGRATION_ID} completed`,
      details: { updated: 1, prevDays: oldTitles.length, newDays: newTitles.length, errors: 0 },
    };
  } catch (err) {
    console.error(`  ❌ Failed to update "${TARGET_SLUG}" (${target.id}):`, err);
    return { message: `${MIGRATION_ID} failed`, details: { updated: 0, errors: 1 } };
  }
}

export async function rollbackMigration() {
  console.log(`\n↩️  Rolling back ${MIGRATION_ID}`);

  const snap = await getDocs(collection(db, COLLECTION_NAME));
  const target = findBySlug(snap.docs, TARGET_SLUG);
  if (!target) {
    console.error(`  ❌ Target tour not found (slug=${TARGET_SLUG})`);
    return { message: `${MIGRATION_ID} rollback aborted`, details: { restored: 0, errors: 1 } };
  }

  const data = target.data() as Record<string, unknown>;
  const stash = data[BACKUP_FIELD] as { prevItinerary?: unknown } | undefined;

  if (!stash) {
    console.warn(`  ⚠️  No ${BACKUP_FIELD} backup found — nothing to restore.`);
    return { message: `${MIGRATION_ID} rollback (no backup)`, details: { restored: 0, errors: 0 } };
  }

  const restore: Record<string, unknown> = {
    "details.itinerary":
      stash.prevItinerary == null ? deleteField() : stash.prevItinerary,
    [BACKUP_FIELD]: deleteField(),
    "metadata.updatedAt": Timestamp.now(),
  };

  try {
    await updateDoc(doc(db, COLLECTION_NAME, target.id), restore);
    console.log(`\n✅ Restored the previous Maldives itinerary.`);
    return { message: `${MIGRATION_ID} rolled back`, details: { restored: 1, errors: 0 } };
  } catch (err) {
    console.error(`  ❌ Failed to roll back "${TARGET_SLUG}" (${target.id}):`, err);
    return { message: `${MIGRATION_ID} rollback failed`, details: { restored: 0, errors: 1 } };
  }
}
