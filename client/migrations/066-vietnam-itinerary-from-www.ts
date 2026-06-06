/**
 * 066 — Replace the Vietnam Expedition itinerary with the www tours data.
 *
 * WHY
 * ───
 * Same situation as 064 (Maldives) / 065 (Tanzania): the Firestore
 * `vietnam-expedition` itinerary had drifted from the canonical www tour data.
 * This overwrites `details.itinerary` on that one tour with the 11-day itinerary
 * from `www/web/data/vietnam-expedition.ts`, mapping each www day to the
 * Firestore `TourItinerary` shape:
 *
 *     { day, title, description, image, details: [{ icon, label, value }] }
 *
 * The www day `details` array (Accommodation / Location / Meals / Activities) is
 * copied verbatim — both the admin tour form and www render `details[]`
 * directly. Activity values keep their bullet/newline formatting.
 *
 * SCOPE
 * ─────
 *   • Only the tour with slug `vietnam-expedition` is touched.
 *   • Only `details.itinerary` is replaced; all other fields are left untouched.
 *   • Day images use the www asset paths (e.g. `/tours/vietnam-expedition/…`),
 *     with the same mixed extensions the www data uses.
 *
 * Reversible: the prior itinerary is stashed in `_migration066` before the
 * overwrite; rollback restores it exactly (or removes it if there was none).
 *
 * HOW TO RUN
 * ──────────
 *   cd admin/client
 *   npx tsx migrations/migrate.ts dry-run066   # preview
 *   npx tsx migrations/migrate.ts 066           # apply
 *   npx tsx migrations/migrate.ts rollback066   # undo
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

const MIGRATION_ID = "066-vietnam-itinerary-from-www";
const COLLECTION_NAME = "tourPackages";
const TARGET_SLUG = "vietnam-expedition";
const BACKUP_FIELD = "_migration066";

type DayDetail = { icon: string; label: string; value: string };
type ItineraryDay = {
  day: number;
  title: string;
  description: string;
  image: string;
  details: DayDetail[];
};

const DIR = "/tours/vietnam-expedition";

// Sourced verbatim from www/web/data/vietnam-expedition.ts (itinerary.days).
const NEW_ITINERARY: ItineraryDay[] = [
  {
    day: 1,
    title: "Hanoi Arrival — Welcome Dinner",
    description:
      "Welcome to Hanoi, the capital of Vietnam! Get ready for the adventure of a lifetime. Our trusty driver will pick you up after your long flight and take you to our first hotel where you can freshen up and relax before our welcome dinner. Meet your fellow group members at our welcome dinner and make friends for life!",
    image: `${DIR}/vietnam-day-1.webp`,
    details: [
      { icon: "accommodation", label: "Accommodation", value: "San Premium Hotel" },
      { icon: "location", label: "Location", value: "Hanoi" },
    ],
  },
  {
    day: 2,
    title: "Hanoi City Tour — Street Food Tasting",
    description:
      "Now that we've gotten to know each other a little, the adventure begins! Start your day exploring Hanoi's cultural and historical landmarks, including the Ho Chi Minh Complex and Temple of Literature. Continue with optional visits to museums or temples such as Hoa Lo Prison or Quan Thanh Temple. In the afternoon, enjoy a cyclo/electric car ride around Hoan Kiem Lake and the Old Quarter. End the day with a guided street food tour, tasting Hanoi's iconic dishes while discovering its vibrant local food culture.",
    image: `${DIR}/vietnam-day-2.jpg`,
    details: [
      { icon: "accommodation", label: "Accommodation", value: "San Premium Hotel" },
      { icon: "location", label: "Location", value: "Hanoi" },
      { icon: "meals", label: "Meals", value: "1 Breakfast" },
      { icon: "activities", label: "Activities", value: "• Hanoi City Tour\n• Street food tasting" },
    ],
  },
  {
    day: 3,
    title: "Hanoi → Ninh Binh — Trang An Boat Trip",
    description:
      "After breakfast and hotel check-out, we travel by road to Ninh Binh. Upon arrival, you'll settle in before heading out in the afternoon to explore the stunning Trang An Grottoes, an extraordinary natural wonder featuring majestic limestone mountains rising dramatically over a vast landscape of rice fields and waterways.",
    image: `${DIR}/vietnam-day-3.png`,
    details: [
      { icon: "accommodation", label: "Accommodation", value: "Tam Coc Botique Garden" },
      { icon: "location", label: "Location", value: "Ninh Binh" },
      { icon: "meals", label: "Meals", value: "1 Breakfast" },
      { icon: "activities", label: "Activities", value: "• Trang An boat trip" },
    ],
  },
  {
    day: 4,
    title: "Ninh Binh → Bai Tu Long Bay",
    description:
      "Depart for the legendary Ha Long Bay/Bai Tu Long Bay. Upon arrival at the port, you'll be warmly welcomed on board your cruise. Settle into your cabin before a short trip briefing, then enjoy a delicious fresh seafood lunch as you sail into the breathtaking waters of Bai Tu Long Bay, surrounded by dramatic limestone formations rising from emerald-green seas.\n\nIn the afternoon, dive into adventure with kayaking around hidden corners of the bay, getting up close to its stunning natural beauty. Return to the cruise to relax and take in a magical sunset over the water.\n\nEnd the day with a delightful dinner on board, followed by an overnight stay surrounded by the peaceful beauty of the bay.",
    image: `${DIR}/vietnam-day-4.png`,
    details: [
      { icon: "accommodation", label: "Accommodation", value: "Verdure Lotus Cruise" },
      { icon: "location", label: "Location", value: "Ninh Binh → Bai Tu Long Bay" },
      { icon: "meals", label: "Meals", value: "1 Lunch & 1 Dinner" },
      { icon: "activities", label: "Activities", value: "• Cruise\n• Kayaking\n• Beach day" },
    ],
  },
  {
    day: 5,
    title: "Bai Tu Long Bay → Hanoi → Night Train to Hue",
    description:
      "Start your morning with a final breath of fresh air in the stunning Bai Tu Long Bay as you enjoy breakfast on board and cruise through its peaceful scenery. Relax as you check out of your cabin while the boat heads back to port, followed by a tasty lunch onboard.\n\nBy late morning, you'll be back on shore and heading to Hanoi. Once there, you'll have a short break to soak in the city vibe before continuing your journey with a night train to Hue.",
    image: `${DIR}/vietnam-day-5.jpg`,
    details: [
      { icon: "accommodation", label: "Accommodation", value: "Overnight Train" },
      { icon: "location", label: "Location", value: "Hanoi → Night train to Hue" },
      { icon: "meals", label: "Meals", value: "1 Breakfast & 1 Lunch" },
    ],
  },
  {
    day: 6,
    title: "Hue Arrival — Discover the City by Jeep",
    description:
      "Arrive in Hue and transfer to your hotel and settle in. Begin your Jeep adventure with a taste of traditional Vietnamese salt coffee while discovering local culture and everyday life. Explore the impressive Khai Dinh Tomb, a striking fusion of Eastern and Western architecture, then continue to the peaceful Minh Mang Tomb, beautifully set within nature. In the afternoon, step back in time at the historic Hue Citadel, the former heart of the Nguyen Dynasty, rich with imperial history and stories of Vietnam's past. After the tour, return to your hotel with unforgettable memories of Hue.",
    image: `${DIR}/vietnam-day-6.jpeg`,
    details: [
      { icon: "accommodation", label: "Accommodation", value: "Thanh Lich Hotel" },
      { icon: "location", label: "Location", value: "Hue" },
      { icon: "meals", label: "Meals", value: "1 Breakfast" },
      { icon: "activities", label: "Activities", value: "• City tour by jeep\n• Khai Dinh Tomb\n• Minh Mang Tomb\n• Hue Citadel" },
    ],
  },
  {
    day: 7,
    title: "Hue → Hoi An",
    description:
      "Enjoy breakfast at your hotel before setting off on a scenic drive to Hoi An, a UNESCO World Heritage town known for its charming ancient streets and beautifully preserved architecture.\n\nAlong the way, stop at the stunning Lang Co Beach, with its long stretch of white sand and crystal-clear waters, and continue to the breathtaking Hai Van Pass, where ocean and mountains meet in a spectacular view that has inspired countless artists.\n\nArrive in Hoi An by afternoon and check in to your hotel. The evening is yours to relax and soak in the magical atmosphere of this historic town.",
    image: `${DIR}/vietnam-day-7.webp`,
    details: [
      { icon: "accommodation", label: "Accommodation", value: "Kiman Hoi An Hotel" },
      { icon: "location", label: "Location", value: "Hoi An" },
      { icon: "meals", label: "Meals", value: "1 Breakfast" },
    ],
  },
  {
    day: 8,
    title: "Hoi An Walking Tour",
    description:
      "Our guide will pick you up from your hotel for a half-day walking tour through the enchanting Hoi An Ancient Town, a UNESCO World Cultural Heritage site.\n\nStroll through its charming old streets while discovering local flavors and rich history. Along the way, visit iconic landmarks such as the Japanese Covered Bridge, Chinese Assembly Halls, Phuoc Kien Pagoda, Sa Huynh Museum, and the bustling local market.\n\nThis experience offers a perfect blend of culture, history, and cuisine before ending your tour in the heart of Hoi An.",
    image: `${DIR}/vietnam-day-8.png`,
    details: [
      { icon: "accommodation", label: "Accommodation", value: "Kiman Hoi An Hotel" },
      { icon: "location", label: "Location", value: "Hoi An" },
      { icon: "meals", label: "Meals", value: "1 Breakfast" },
      { icon: "activities", label: "Activities", value: "• Walking tour" },
    ],
  },
  {
    day: 9,
    title: "Hoi An → Da Nang — Free Day",
    description:
      "Enjoy a comfortable transfer from your hotel to Da Nang. After checking in, the rest of the day is yours to unwind, soak up the sun, feel the sea breeze, and relax on Da Nang's beautiful sandy beaches. A perfect day to slow down and enjoy the coastal charm.",
    image: `${DIR}/vietnam-day-9.png`,
    details: [
      { icon: "accommodation", label: "Accommodation", value: "Sekong Hotel" },
      { icon: "location", label: "Location", value: "Da Nang" },
      { icon: "meals", label: "Meals", value: "1 Breakfast" },
    ],
  },
  {
    day: 10,
    title: "Da Nang City Tour",
    description:
      "Get ready for an exciting full-day adventure in Da Nang! Starting with a morning pick-up from your hotel. Discover the stunning Marble Mountains, explore the artistry of Non Nuoc Stone Carving Village, and dive into history at the Cham Sculpture Museum.\n\nIn the afternoon, head to the breathtaking Son Tra Peninsula and visit the iconic Linh Ung Pagoda, where you'll be rewarded with panoramic city views and the towering 67m Lady Buddha statue. Wrap up the day with a lively visit to Han Market before returning to your hotel, then celebrate the perfect ending with a memorable farewell dinner.",
    image: `${DIR}/vietnam-day-10.png`,
    details: [
      { icon: "accommodation", label: "Accommodation", value: "Sekong Hotel" },
      { icon: "location", label: "Location", value: "Da Nang" },
      { icon: "meals", label: "Meals", value: "1 Breakfast" },
      { icon: "activities", label: "Activities", value: "• City & historical tour\n• Marble Mountains\n• Son Tra Peninsula\n• Lady Buddha" },
    ],
  },
  {
    day: 11,
    title: "Checkout",
    description:
      "It's not goodbye, it's see you later. Exchange contact info with your new friends before our vans pick us up for the airport and onward travels. Safe journeys!",
    image: `${DIR}/vietnam-day-11.png`,
    details: [
      { icon: "location", label: "Location", value: "Da Nang" },
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
    console.log(`     ${mark} ${before.padEnd(46)} → ${after}`);
  }
  console.log(`     Day images set to www paths under ${DIR}/`);

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
    console.log(`\n✅ Replaced the Vietnam itinerary (${newTitles.length} days).`);
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
    console.log(`\n✅ Restored the previous Vietnam itinerary.`);
    return { message: `${MIGRATION_ID} rolled back`, details: { restored: 1, errors: 0 } };
  } catch (err) {
    console.error(`  ❌ Failed to roll back "${TARGET_SLUG}" (${target.id}):`, err);
    return { message: `${MIGRATION_ID} rollback failed`, details: { restored: 0, errors: 1 } };
  }
}
