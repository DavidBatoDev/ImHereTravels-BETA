/**
 * 065 — Replace the Tanzania Exploration itinerary with the www tours data.
 *
 * WHY
 * ───
 * Same situation as 064 (Maldives): the Firestore `tanzania-exploration`
 * itinerary had drifted from the canonical www tour data (a different,
 * Serengeti-based set of days). This overwrites `details.itinerary` on that one
 * tour with the 10-day itinerary from `www/web/data/tanzania-exploration.ts`,
 * mapping each www day to the Firestore `TourItinerary` shape:
 *
 *     { day, title, description, image, details: [{ icon, label, value }] }
 *
 * SCOPE
 * ─────
 *   • Only the tour with slug `tanzania-exploration` is touched.
 *   • Only `details.itinerary` is replaced; all other fields are left untouched.
 *   • Day images use the www asset paths (e.g. `/tours/tanzania-exploration/…`).
 *
 * Reversible: the prior itinerary is stashed in `_migration065` before the
 * overwrite; rollback restores it exactly (or removes it if there was none).
 *
 * HOW TO RUN
 * ──────────
 *   cd admin/client
 *   npx tsx migrations/migrate.ts dry-run065   # preview
 *   npx tsx migrations/migrate.ts 065           # apply
 *   npx tsx migrations/migrate.ts rollback065   # undo
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

const MIGRATION_ID = "065-tanzania-itinerary-from-www";
const COLLECTION_NAME = "tourPackages";
const TARGET_SLUG = "tanzania-exploration";
const BACKUP_FIELD = "_migration065";

type DayDetail = { icon: string; label: string; value: string };
type ItineraryDay = {
  day: number;
  title: string;
  description: string;
  image: string;
  details: DayDetail[];
};

const IMG = (n: number) => `/tours/tanzania-exploration/tanzania-day-${n}.webp`;

// Sourced verbatim from www/web/data/tanzania-exploration.ts (itinerary.days).
const NEW_ITINERARY: ItineraryDay[] = [
  {
    day: 1,
    title: "Meet & Greet Dinner",
    description:
      "Today is the day that your dreams finally become a reality - you have arrived in this once in a lifetime destination Tanzania. You will be collected at the airport by one of our representatives and transported to our first accommodation to rest up before dinner.",
    image: IMG(1),
    details: [
      { icon: "accommodation", label: "Accommodation", value: "Moshi" },
      { icon: "activities", label: "Activities", value: "Meet and Greet" },
      { icon: "meals", label: "Meals", value: "Welcome Dinner" },
    ],
  },
  {
    day: 2,
    title: "The Chemka Hot Springs",
    description:
      "Relax and recover from long flights during the day and in the afternoon visit the beautiful mineral spring originating from Kilimanjaro ground waters.",
    image: IMG(2),
    details: [
      { icon: "accommodation", label: "Accommodation", value: "Kilimanjaro Crane Hotel" },
      { icon: "activities", label: "Activities", value: "Visit Hot Springs" },
      { icon: "meals", label: "Meals", value: "1 Breakfast, 1 Lunch & 1 Dinner" },
    ],
  },
  {
    day: 3,
    title: "Kilimanjaro Day Hike",
    description:
      "Begin with a pickup in Moshi and drive to Marangu Gate (1860m). Hike 3-4 hours through lush rainforest to Mandara Hut (2700m), spotting monkeys and vibrant birds. After lunch, visit Maundi Crater for stunning views, then return to the gate and drive back to your hotel at sunset.",
    image: IMG(3),
    details: [
      { icon: "accommodation", label: "Accommodation", value: "Njiro Legacy" },
      { icon: "activities", label: "Activities", value: "Minitrekking" },
      { icon: "meals", label: "Meals", value: "1 Breakfast & 1 Lunch" },
    ],
  },
  {
    day: 4,
    title: "Visit Tarangire National Park",
    description:
      "In the morning once everyone's gotten breakfast we will make our journey to Karatu via Tarangire National Park. In the Tarangire National Park we will experience a guided game drive where we will see elephants, baobabs and there's even the possibility of sighting lions, giraffes, hippo to name a few. From here we make our way to our accommodation in Karatu to check in and relax.",
    image: IMG(4),
    details: [
      { icon: "accommodation", label: "Accommodation", value: "Omega View Hotel" },
      { icon: "activities", label: "Activities", value: "Guided Game Drive" },
      { icon: "meals", label: "Meals", value: "1 Breakfast, 1 Lunch & 1 Dinner" },
    ],
  },
  {
    day: 5,
    title: "Early Morning Game Drive (Safari)",
    description:
      "Dress warmly for an early game drive in Ngorongoro Crater, where wildlife and stunning landscapes offer incredible photo opportunities. After capturing the perfect shots, enjoy lunch before heading to Arusha.",
    image: IMG(5),
    details: [
      { icon: "accommodation", label: "Accommodation", value: "Njiro Legacy" },
      { icon: "activities", label: "Activities", value: "Early Game Drive (Safari)" },
      { icon: "meals", label: "Meals", value: "1 Breakfast & 1 Lunch" },
    ],
  },
  {
    day: 6,
    title: "Travel to Zanzibar",
    description:
      "After breakfast today, we'll head to the airport for our flight to the magnificent Zanzibar. Upon arrival, we'll be transferred to our new accommodation, where you'll have time to relax, rest, or head out for some afternoon exploring before dinner, the choice is yours!",
    image: IMG(6),
    details: [
      { icon: "accommodation", label: "Accommodation", value: "Demani Lodge" },
      { icon: "activities", label: "Activities", value: "Flight to Zanzibar" },
      { icon: "meals", label: "Meals", value: "1 Breakfast" },
    ],
  },
  {
    day: 7,
    title: "Relax and Chill Day",
    description:
      "Enjoy some downtime relaxing in Paje. It's a chance to charge your batteries, organise your photos and enjoy replenishing your energy levels.",
    image: IMG(7),
    details: [
      { icon: "accommodation", label: "Accommodation", value: "Demani Lodge" },
      { icon: "activities", label: "Activities", value: "Relax and Chill" },
      { icon: "meals", label: "Meals", value: "1 Breakfast" },
    ],
  },
  {
    day: 8,
    title: "Blue Lagoon Zanzibar and Sunset Cruise",
    description:
      "The Blue Lagoon Snorkeling Tour in Zanzibar offers a refreshing escape into the island's vibrant marine world. Departing in the late afternoon, you will board a traditional wooden dhow-beautifully crafted and guided by experienced local sailors. As the boat gently sails along the Indian Ocean, you'll be treated to panoramic views of the sun setting over the horizon, painting the sky in hues of orange, pink, and gold.",
    image: IMG(8),
    details: [
      { icon: "accommodation", label: "Accommodation", value: "Demani Lodge" },
      { icon: "activities", label: "Activities", value: "Blue Lagoon Zanzibar and Sunset Cruise" },
      { icon: "meals", label: "Meals", value: "1 Breakfast" },
    ],
  },
  {
    day: 9,
    title: "Mnemba & Changuu Islands",
    description:
      "During the day, you will visit Mnemba Island for an unforgettable marine adventure, especially known for the chance to swim with wild dolphins in their natural habitat. In the afternoon we will visit Changuu (Prison) Island to see some giant Aldabra tortoises and also enjoy a mix of history, sea wildlife and leisure.",
    image: IMG(9),
    details: [
      { icon: "accommodation", label: "Accommodation", value: "Demani Lodge" },
      { icon: "activities", label: "Activities", value: "Mnemba and Changuu Island" },
      { icon: "meals", label: "Meals", value: "1 Breakfast" },
    ],
  },
  {
    day: 10,
    title: "Checkout",
    description:
      "It's not goodbye, it's see you later. Time to exchange insta handles if you haven't already with your new friends before our transport picks us up for the airport and onward travels. Safe journeys!",
    image: IMG(10),
    details: [
      { icon: "activities", label: "Activities", value: "Checkout" },
      { icon: "meals", label: "Meals", value: "1 Breakfast" },
    ],
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
    console.log(`     ${mark} ${before.padEnd(44)} → ${after}`);
  }
  console.log(`     Day images set to www paths: /tours/tanzania-exploration/tanzania-day-{1..10}.webp`);

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
    console.log(`\n✅ Replaced the Tanzania itinerary (${newTitles.length} days).`);
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
    console.log(`\n✅ Restored the previous Tanzania itinerary.`);
    return { message: `${MIGRATION_ID} rolled back`, details: { restored: 1, errors: 0 } };
  } catch (err) {
    console.error(`  ❌ Failed to roll back "${TARGET_SLUG}" (${target.id}):`, err);
    return { message: `${MIGRATION_ID} rollback failed`, details: { restored: 0, errors: 1 } };
  }
}
