/**
 * 052 — Backfill `details.inclusions` on every tourPackages document.
 *
 * WHAT THIS DOES
 * ──────────────
 * Sets `details.inclusions` (Array<{ icon, label, value: string | string[] }>)
 * on each tour doc from a hardcoded map derived from the www data files
 * (whatsIncluded.items).
 *
 * HOW TO RUN
 * ──────────
 *   cd admin/client
 *   npx tsx migrations/migrate.ts dry-run052   # preview
 *   npx tsx migrations/migrate.ts 052           # apply
 *   npx tsx migrations/migrate.ts rollback052   # undo
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

const MIGRATION_ID = "052-backfill-inclusions";
const COLLECTION_NAME = "tourPackages";

type Incl = { icon: string; label: string; value: string | string[] };

// Derived from www/web/data/*.ts whatsIncluded.items arrays.
// Keys are Firestore document slugs.
const INCLUSIONS_MAP: Record<string, Incl[]> = {
  "philippine-sunrise": [
    { icon: "transport",     label: "Transport",      value: "Boat, Van, Plane" },
    { icon: "airport",       label: "Flight",         value: "Cebu to Siargao (included)" },
    { icon: "accommodation", label: "Accommodation",  value: "10 nights in Hotel" },
    { icon: "activities",    label: "Activities",     value: "City Tour, Canyoneering, Snorkeling, Sardine Run, Surf, Island Hopping, Roadtrip" },
    { icon: "meals",         label: "Meals",          value: "8 Breakfasts, 2 Lunches" },
    { icon: "team",          label: "Team",           value: "Trip Manager + Local Guides" },
    { icon: "plus",          label: "Others",         value: ["24/7 customer experience assistance", "Environmental fees & taxes", "Local tourist taxes & fees"] },
  ],
  "philippine-sunset": [
    { icon: "transport",     label: "Transport",      value: "Boat, Van, Plane" },
    { icon: "accommodation", label: "Accommodation",  value: "6 nights in Hotel, 4 nights in Beach Hut and Cottages" },
    { icon: "activities",    label: "Activities",     value: "City Tour, Island Hopping, Zipline, Beach Day, Canopy Tour, Kayaking, Village Tour, Snorkeling, Cooking, Bonfire" },
    { icon: "meals",         label: "Meals",          value: "8 Breakfasts, 3 Lunches, 2 Dinners" },
    { icon: "team",          label: "Team",           value: "Trip Manager + Local Guides" },
    { icon: "plus",          label: "Others",         value: ["24/7 customer experience assistance", "Environmental fees & taxes", "Local tourist taxes & fees", "Tour Guide", "Flight from Manila to Puerto Princesa"] },
  ],
  "philippine-sunset-with-jess": [
    { icon: "transport",     label: "Transport",      value: "Boat, Van, Plane" },
    { icon: "accommodation", label: "Accommodation",  value: "6 nights in Hotel, 4 nights in Beach Hut and Cottages" },
    { icon: "activities",    label: "Activities",     value: "City Tour, Island Hopping, Zipline, Beach Day, Canopy Tour, Kayaking, Village Tour, Snorkeling, Cooking, Bonfire" },
    { icon: "meals",         label: "Meals",          value: "8 Breakfasts, 3 Lunches, 2 Dinners" },
    { icon: "team",          label: "Team",           value: "Trip Manager + Local Guides" },
    { icon: "plus",          label: "Others",         value: ["24/7 customer experience assistance", "Environmental fees & taxes", "Local tourist taxes & fees", "Tour Guide", "Flight from Manila to Puerto Princesa"] },
  ],
  "philippine-sunset-with-roxana": [
    { icon: "transport",     label: "Transport",      value: "Boat, Van, Plane" },
    { icon: "accommodation", label: "Accommodation",  value: "6 nights in Hotel, 4 nights in Beach Hut and Cottages" },
    { icon: "activities",    label: "Activities",     value: "City Tour, Island Hopping, Zipline, Beach Day, Canopy Tour, Kayaking, Village Tour, Snorkeling, Cooking, Bonfire" },
    { icon: "meals",         label: "Meals",          value: "8 Breakfasts, 3 Lunches, 2 Dinners" },
    { icon: "team",          label: "Team",           value: "Trip Manager + Local Guides" },
    { icon: "plus",          label: "Others",         value: ["24/7 customer experience assistance", "Environmental fees & taxes", "Local tourist taxes & fees", "Tour Guide", "Flight from Manila to Puerto Princesa"] },
  ],
  "maldives-bucketlist": [
    { icon: "transport",     label: "Transport",      value: "Speedboat transfers between islands, Van" },
    { icon: "accommodation", label: "Accommodation",  value: "Hotel (8 nights)" },
    { icon: "activities",    label: "Activities",     value: "Snorkeling, Diving, Stand Up Paddle Boarding" },
    { icon: "meals",         label: "Meals",          value: "8 Breakfasts, 2 Lunches, 6 Dinners" },
    { icon: "plus",          label: "Add-on Activities", value: ["Fun Diving and Discovery Diving", "Lunch at Floating Resorts"] },
    { icon: "plus",          label: "Others",         value: ["24/7 customer experience assistance", "Airport and domestic transfer assistance", "One way transfer by scheduled public speedboat to Rasdhoo", "One way ferry transfer Rasdhoo — Ukulhas", "One way transfer by scheduled public speedboat to Male or private speedboat transfer to resort", "Tour Guide", "All Local Tax (10% service charge, 16% GST and $3 Green Tax per person per night)"] },
  ],
  "bhutan-quest": [
    { icon: "meals",         label: "Meals",          value: "6 Breakfasts, 5 Lunches, 6 Dinners" },
    { icon: "transport",     label: "Transport",      value: "Van" },
    { icon: "activities",    label: "Activities",     value: ["Sightseeing Dzongs", "Trekking", "White water rafting", "Beer Tasting"] },
    { icon: "accommodation", label: "Stay",           value: "Hotel (6 nights)" },
    { icon: "plus",          label: "Others",         value: ["24/7 customer experience assistance", "Airport and domestic transfer assistance", "Tour Guide"] },
  ],
  "nepal-horizons": [
    { icon: "transport",     label: "Transport",      value: "Private vehicle for all sightseeing transfers" },
    { icon: "accommodation", label: "Accommodation",  value: "8 nights in Hotel" },
    { icon: "activities",    label: "Activities",     value: "Visit Pashupatinath Temple, Visit Boudhanath Stupa, Bhaktapur Golden Gate, Village Walk & Sunset by Riverbank, Canoeing in Chitwan, Jeep Safari in Chitwan National Park, Hike to Ramkot Village, Boating on Phewa Lake, Visit Tal Barahi Temple, Hike to Australian Base Camp, Panoramic Annapurna & Fishtail Views" },
    { icon: "meals",         label: "Meals",          value: "8 Breakfasts, 2 Lunches, 4 Dinners" },
    { icon: "plus",          label: "Others",         value: ["24/7 customer experience assistance", "Airport and domestic transfer assistance", "Tour Guide"] },
  ],
  "india-discovery-tour": [
    { icon: "transport",     label: "Transport",      value: "Van, Train" },
    { icon: "accommodation", label: "Accommodation",  value: "12 nights in Hotel" },
    { icon: "activities",    label: "Activities",     value: "Sightseeing Old and New Delhi, Visit Mehrangarh Fort, Visit Ranakpur Jain Temples, Cruise over Lake Pichola, Visit Amer Fort, Canter Safari into Ranthambhore National Park, Visit the Taj Mahal" },
    { icon: "meals",         label: "Meals",          value: "11 Breakfasts, 2 Lunches, 2 Dinners" },
    { icon: "team",          label: "Team",           value: "Trip Manager + Local Guides" },
    { icon: "plus",          label: "Others",         value: ["24/7 customer experience assistance", "Airport and domestic transfer assistance", "Tour Guide"] },
  ],
  "india-holi-festival-tour": [
    { icon: "meals",         label: "Meals",          value: "11 Breakfasts, 2 Lunches, 2 Dinners" },
    { icon: "transport",     label: "Transport",      value: "Van, Train" },
    { icon: "activities",    label: "Activities",     value: "Sightseeing Old and New Delhi, Visit Mehrangarh Fort, Visit Ranakpur Jain Temples, Cruise over Lake Pichola, Visit Amer Fort, Canter Safari into Ranthambhore National Park, Visit the Taj Mahal" },
    { icon: "accommodation", label: "Stay",           value: "Hotel (12 nights)" },
    { icon: "plus",          label: "Others",         value: ["24/7 customer experience assistance", "Airport and domestic transfer assistance", "Tour Guide"] },
  ],
  "sri-lanka-wander-tour": [
    { icon: "transport",     label: "Transport",      value: "Van, Train, Boat, Bicycle" },
    { icon: "accommodation", label: "Accommodation",  value: "Hotel (10 nights)" },
    { icon: "activities",    label: "Activities",     value: "Dambulla Cave Temple, Pidurangala Rock, cycling tour, Sigiriya Rock Fortress, Kandy city tour, Nanu Oya to Ella train ride, Ella Rock, safari game drive, Galle city tour, surfing in Weligama" },
    { icon: "meals",         label: "Meals",          value: "10 Breakfasts" },
    { icon: "plus",          label: "Others",         value: ["24/7 Customer Support", "Airport & Domestic Transfer Assistance (Excluding Airport Drop-Off)", "Local Tour Guide"] },
  ],
  "vietnam-expedition": [
    { icon: "transport",     label: "Transport",      value: "Boat, Van" },
    { icon: "meals",         label: "Meals",          value: "8 Breakfasts, 2 Lunches, 1 Dinner" },
    { icon: "accommodation", label: "Accommodation",  value: ["8 nights in Hotel", "1 night on Cruise Boat", "1 night on Overnight Train"] },
    { icon: "activities",    label: "Activities",     value: ["Hanoi — Welcome Dinner", "Hanoi City tour & street food tasting", "Ninh Binh — Trang An boat trip", "Bai Tu Long — cruise, kayaking & beach day", "Hue — city tour by jeep", "Hoi An walking tour", "Da Nang — beach day & city tour"] },
    { icon: "plus",          label: "Add-on Activities", value: ["Hanoi — Visit Train Street", "Hoi An — Tailor Shops", "Da Nang — Marble Mountain"] },
    { icon: "team",          label: "Team",           value: "Tour Guide" },
    { icon: "plus",          label: "Others",         value: ["24/7 customer experience assistance", "Environmental fees and taxes", "Local tourist taxes and fees", "Airport pick up", "Bai Tu Long → Hanoi → Hue overnight train transfer"] },
  ],
  "china-discovery": [
    { icon: "transport",     label: "Transport",      value: "Private vehicle, All sightseeing transfers" },
    { icon: "accommodation", label: "Accommodation",  value: "9 nights in Hotel" },
    { icon: "activities",    label: "Activities",     value: ["Mutianyu Great Wall", "Beijing City Tour", "Tea Ceremony", "Bullet Train", "Shanghai Tower"] },
    { icon: "meals",         label: "Meals",          value: "9 Breakfasts" },
    { icon: "plus",          label: "Others",         value: ["24/7 customer experience assistance", "Airport and domestic transfer assistance", "Tour Guide", "Private vehicle for all transfers & sightseeing"] },
  ],
  "japan-summer-adventure": [
    { icon: "transport",     label: "Transport",      value: "Private vehicle - All sightseeing transfers" },
    { icon: "accommodation", label: "Accommodation",  value: "9 nights in Hotel" },
    { icon: "activities",    label: "Activities",     value: "Meet & Greet at Tokyo international airport, City Tour, Tea Ceremony, Bullet Train" },
    { icon: "meals",         label: "Meals",          value: "9 Breakfasts" },
    { icon: "plus",          label: "Others",         value: ["24/7 customer experience assistance", "Airport and domestic transfer assistance", "Tour Guide", "Private vehicle for all transfers & sightseeing"] },
  ],
  "japan-adventure-with-skiing": [
    { icon: "transport",     label: "Transport",      value: "Private vehicle - All sightseeing transfers" },
    { icon: "accommodation", label: "Accommodation",  value: "9 nights in Hotel" },
    { icon: "activities",    label: "Activities",     value: "Meet & Greet at Tokyo international airport, City Tour, Tea Ceremony, Bullet Train, Skiing" },
    { icon: "meals",         label: "Meals",          value: "9 Breakfasts" },
    { icon: "plus",          label: "Others",         value: ["24/7 customer experience assistance", "Airport and domestic transfer assistance", "Tour Guide", "Private vehicle for all transfers & sightseeing"] },
  ],
  "japan-adventure-winter": [
    { icon: "transport",     label: "Transport",      value: "Private vehicle - All sightseeing transfers" },
    { icon: "accommodation", label: "Accommodation",  value: "9 nights in Hotel" },
    { icon: "activities",    label: "Activities",     value: "Meet & Greet at Tokyo international airport, City Tour, Tea Ceremony, Bullet Train" },
    { icon: "meals",         label: "Meals",          value: "9 Breakfasts" },
    { icon: "plus",          label: "Others",         value: ["24/7 customer experience assistance", "Airport and domestic transfer assistance", "Tour Guide", "Private vehicle for all transfers & sightseeing"] },
  ],
  "tanzania-exploration": [
    { icon: "transport",     label: "Transport",      value: "Private tour bus, Domestic flight, Safari Land Cruiser" },
    { icon: "accommodation", label: "Accommodation",  value: "9 nights in hotel" },
    { icon: "activities",    label: "Activities",     value: ["Hot Springs, Mount Kilimanjaro Day Hike, Tarangire National Park, Safari Game Drive, Sunset Cruise", "Add on: Parasailing, Jetski, Kayaking, Stand Up Paddleboarding, Scuba Diving", "Some options for the free day: Ferry Ride to Dar and Back, Zanzibar Submarine Experience, Turtle Sanctuary, Jambiani caves"] },
    { icon: "meals",         label: "Meals",          value: "9 breakfasts, 4 lunches, 3 dinners" },
    { icon: "team",          label: "Team",           value: "Local guides" },
    { icon: "plus",          label: "Others",         value: ["24/7 customer experience assistance", "Airport and domestic transfer assistance", "Tour guide"] },
  ],
  "tanzania-exploration-danielle-erin": [
    { icon: "airport",       label: "Flights",        value: "One-way flight from Kilimanjaro to Zanzibar" },
    { icon: "meals",         label: "Meals",          value: "9 breakfasts, 4 lunches, 3 dinners" },
    { icon: "transport",     label: "Transport",      value: "Private tour bus, Safari Land Cruiser, Airport transfer (excluding the airport drop-off on the last day)" },
    { icon: "activities",    label: "Activities",     value: ["Visit to Chemka Hotsprings", "Day Tour on Mt Kilimanjaro", "Game drives in Tarangire National Park", "Game drives in Ngorongoro Crater", "Blue Lagoon Snorkeling Zanzibar", "Sunset Beach Party", "Dolphin Tour", "Swim with the Tortoise"] },
    { icon: "accommodation", label: "Stay",           value: "Hostels and Hotel" },
    { icon: "plus",          label: "Others",         value: ["24/7 customer experience assistance", "Airport and domestic transfer assistance", "Tour Guide"] },
  ],
  "new-zealand-expedition": [
    { icon: "transport",     label: "Transport",      value: "Private Coach, Ferry (Wellington → Picton), Coastal Pacific Scenic Train (Picton → Christchurch)" },
    { icon: "accommodation", label: "Accommodation",  value: "14 nights in shared hostel accommodation" },
    { icon: "activities",    label: "Activities",     value: "Optional: Whakarewarewa Living Maori Village and Traditional Hangi Lunch, Lake Tarawera Water Taxi, Guided Hike & Natural Hot Pools, Kiwi Hatchery Conservation Experience, Time Tripper Underwater Experience, Milford Sound Day Trip" },
    { icon: "meals",         label: "Meals",          value: "15 Breakfasts, 1 Lunch, 1 Dinner" },
    { icon: "team",          label: "Team",           value: "Local Guides" },
    { icon: "plus",          label: "Others",         value: ["24/7 customer experience assistance", "Interislander Ferry", "Tour Guide"] },
  ],
  "argentinas-wonders": [
    { icon: "meals",         label: "Meals",          value: ["8 breakfasts", "1 lunch"] },
    { icon: "transport",     label: "Transport",      value: ["Van", "Plane", "Bicycle"] },
    { icon: "activities",    label: "Activities",     value: ["Trekking", "Bicycling", "Wine Tasting", "Tango", "Chasing Waterfalls", "Minitrekking at Perito Moreno Glacier"] },
    { icon: "plus",          label: "Add-on Activities", value: ["Tango Lessons", "Trekking in Laguna de los 3"] },
    { icon: "accommodation", label: "Stay",           value: ["Hotel (10 nights)"] },
    { icon: "team",          label: "Others",         value: ["24/7 customer experience assistance", "Airport and domestic transfer assistance", "Transfer to El Chalten, in the way: trekking in the petrified forest", "Tour Guide"] },
  ],
  "brazils-treasures": [
    { icon: "transport",     label: "Transport",      value: "Private Van" },
    { icon: "accommodation", label: "Accommodation",  value: "Hotel (6 nights)" },
    { icon: "activities",    label: "Activities",     value: "City Tours, Beaches, Sugarloaf & Christ the Redeemer Tour, Sambadrome Carnival Experience, Rio Helicopter Ride" },
    { icon: "meals",         label: "Meals",          value: "6 Breakfasts" },
    { icon: "plus",          label: "Others",         value: ["24/7 customer experience assistance", "Airport and domestic transfer assistance", "Tour Guide", "Entrance fees to all major attractions and sites", "Private group experiences in Rio de Janeiro", "Small group size to ensure personalized experiences", "All taxes and service charges included"] },
    { icon: "info",          label: "What's NOT included", value: "International flights to/from the destination, Travel insurance, Visas (if required), Personal expenses & optional activities" },
  ],
  "siargao-island-adventure": [
    { icon: "transport",     label: "Transport",      value: "Boat, Van" },
    { icon: "accommodation", label: "Accommodation",  value: "Hotel" },
    { icon: "activities",    label: "Activities",     value: "Island Hopping, Surfing, Roadtrip" },
    { icon: "plus",          label: "Others",         value: ["24/7 customer experience assistance", "Local tourist taxes & fees", "Tour Guide"] },
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
    const inclusions = INCLUSIONS_MAP[slug];

    if (!inclusions) {
      console.warn(`  ⚠️  ${slug}: not in INCLUSIONS_MAP — skipping`);
      notMapped++;
      continue;
    }

    try {
      if (dryRun) {
        console.log(`  🧪 [dry-run] would set details.inclusions on: ${slug} (${inclusions.length} items)`);
        updated++;
        continue;
      }

      await updateDoc(doc(db, COLLECTION_NAME, docSnap.id), {
        "details.inclusions": inclusions,
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
  console.log(`\n↩️  Rolling back ${MIGRATION_ID} — removing details.inclusions field`);

  const snap = await getDocs(collection(db, COLLECTION_NAME));
  let removed = 0;
  let errors = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data() as Record<string, unknown>;
    const slug = typeof data.slug === "string" ? data.slug : docSnap.id;

    if (!INCLUSIONS_MAP[slug]) continue;

    try {
      await updateDoc(doc(db, COLLECTION_NAME, docSnap.id), {
        "details.inclusions": deleteField(),
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
