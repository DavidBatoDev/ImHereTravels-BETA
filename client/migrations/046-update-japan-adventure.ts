import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  Timestamp,
  where,
  arrayUnion,
} from "firebase/firestore";
import { db } from "./firebase-config";

const MIGRATION_ID = "046-update-japan-adventure";
const COLLECTION_NAME = "tourPackages";
const JAPAN_SLUG = "japan-adventure";

const BASE_IMG = "https://imheretravels.com/wp-content/uploads/2025/10";

const updatedData = {
  duration: "10 Days and 9 Nights",
  destinations: ["Tokyo", "Atami", "Kyoto"],
  itinerarySummary: "Day 1–10 (Tokyo → Atami → Kyoto → Checkout)",
  pricing: {
    original: 1899,
    discounted: 0,
    deposit: 300,
    currency: "GBP",
  },
  highlights: ["Tokyo City Tour", "Famous Bullet Train", "Tea Ceremony in Kyoto"],
  details: {
    highlights: [
      {
        text: "Tokyo City Tour",
        image: `${BASE_IMG}/japan-trip-highlight-1.webp`,
      },
      {
        text: "Famous Bullet Train",
        image: `${BASE_IMG}/japan-trip-highlight-2.webp`,
      },
      {
        text: "Tea Ceremony in Kyoto",
        image: `${BASE_IMG}/japan-day-6.webp`,
      },
    ],
    itinerary: [
      {
        day: 1,
        title: "Welcome to Tokyo",
        description:
          "A driver will wait for you upon arrival at the airport and transfer you and your fellow travelers to your accommodation in downtown Tokyo. Use the rest of your day for your own first exploration of the city.",
      },
      {
        day: 2,
        title: "Tokyo City Tour",
        description:
          "Explore Japan's dynamic capital like a local! Hop on Tokyo's world-renowned public transport system and visit must-see neighborhoods and landmarks. Recommended stops: Akihabara (anime, gaming, tech), Ueno, Asakusa with its famous Sensoji Temple and Nakamise Shopping Street, Shibuya and the famous scramble crossing, Harajuku's fashion district and the nearby Meiji-jingu shrine, and Shinjuku — where we recommend getting a bird's-eye view of the city from the Tokyo Metropolitan Government Building's observation deck. Finish the day with a meal in a typical Japanese izakaya and try some local specialties.",
      },
      {
        day: 3,
        title: "Tokyo Free Day",
        description:
          "Explore other areas of Tokyo and the surrounding area at your own pace or relax at the hotel — the day is yours. Recommended day trips include Kamakura and Enoshima by the coast, or for something more traditional, Kawagoe in nearby Saitama prefecture. Otherwise, indulge in fun activities such as a visit to the teamLab's digital art museum or go shopping in one of the countless malls.",
      },
      {
        day: 4,
        title: "Tokyo > Kamakura/Enoshima > Atami",
        description:
          'Start your journey in Tokyo and travel to the scenic shores of Enoshima and the historic charm of Kamakura. Capture the iconic "Slam Dunk" photo spot and enjoy the relaxed coastal atmosphere before exploring Kamakura\'s cultural highlights, including Tsurugaoka Hachimangu Shrine and the impressive Great Buddha at Kotoku-in. This well-paced day blends seaside views with timeless heritage, offering a perfect balance of relaxation and discovery.',
      },
      {
        day: 5,
        title: "Izu Day Tour",
        description:
          "After a quick breakfast, set off from the hotel to explore the natural beauty and cultural charm of Izu. Visit the peaceful Moroguchi Shrine, wander through the historic streets of Shuzenji Onsen Town, and take in the dramatic coastal views along the Jogasaki Coast. This relaxing yet scenic journey blends tradition and nature, offering a refreshing escape from the city.",
      },
      {
        day: 6,
        title: "Atami Free Day",
        description:
          "Enjoy a relaxing free day in Atami at your pace. Unwind in soothing hot springs, stroll along the scenic coastline, or explore charming local streets and cafés. Whether you choose to relax or discover hidden gems, the day is yours to enjoy.",
      },
      {
        day: 7,
        title: "Atami to Kyoto",
        description:
          "Today after breakfast we will hop aboard the famous bullet train (shinkansen). Before check-in, we will immerse ourselves in Japan's rich culture by participating in a traditional Japanese tea ceremony and learning to make tea sweets under the guidance of a local teacher. The rest of the day is yours at leisure.",
      },
      {
        day: 8,
        title: "Kyoto City Tour",
        description:
          "Step into Japan's ancient capital and immerse yourself in serene temples, historical streets, and unforgettable scenic beauty — all in comfort with a chartered bus for the day. Stops include Kinkakuji, Arashiyama with its bamboo grove and picturesque river, Nishiki Market (Kyoto's Kitchen — ideal for lunch), Kiyomizudera, and Gion. Afterwards rest up and prepare for dinner and possibly a few drinks.",
      },
      {
        day: 9,
        title: "Kyoto Free Day",
        description:
          "Enjoy a free day in Kyoto to explore the city at your pace. Wander through historic streets, visit iconic temples and shrines, or relax in traditional tea houses and gardens. From cultural landmarks to hidden corners, Kyoto offers endless discoveries. Make the day your own and experience the timeless beauty of Japan's ancient capital.",
      },
      {
        day: 10,
        title: "Check Out, Until Next Time!",
        description:
          "Enjoy your last breakfast with a view before heading to the airport. You're leaving Japan but trust us, part of your heart will stay behind.",
      },
    ],
    requirements: [
      "Valid passport",
      "Travel insurance required",
      "Pack warm clothing for February weather: windproof coat, sweaters, thermal layers, scarf, gloves, and hat",
      "Comfortable waterproof walking shoes or boots",
      "Layers recommended as indoor spaces are well-heated",
      "Respect for local customs and dress codes (especially at temples and shrines)",
      "Aged 18–45 (tour is designed for adventurous travellers, most guests 21–35)",
    ],
  },
  media: {
    coverImage: `${BASE_IMG}/japan-header-6.webp`,
    gallery: [
      `${BASE_IMG}/japan-header-1.webp`,
      `${BASE_IMG}/japan-header-2.webp`,
      `${BASE_IMG}/japan-header-3.webp`,
      `${BASE_IMG}/japan-header-4.webp`,
      `${BASE_IMG}/japan-header-5.webp`,
      `${BASE_IMG}/japan-header-7.webp`,
    ],
  },
};

export async function runMigration(dryRun = false) {
  console.log(`\n🚀 Running ${MIGRATION_ID}`);
  console.log(`📋 Updates Japan Adventure (Standard) with full itinerary, pricing, highlights, and gallery`);

  const q = query(
    collection(db, COLLECTION_NAME),
    where("slug", "==", JAPAN_SLUG)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    throw new Error(`Japan Adventure package not found (slug: ${JAPAN_SLUG})`);
  }

  const docSnap = snapshot.docs[0];
  const docId = docSnap.id;
  console.log(`🎯 Found Japan Adventure: ${docId}`);

  if (dryRun) {
    console.log(`\n🧪 DRY RUN — no changes made`);
    console.log(`Would update: ${docId}`);
    console.log(`  pricing: £${updatedData.pricing.original} / £${updatedData.pricing.deposit} deposit`);
    console.log(`  duration: ${updatedData.duration}`);
    console.log(`  itinerary: ${updatedData.details.itinerary.length} days`);
    console.log(`  gallery: ${updatedData.media.gallery.length} images`);
    return {
      message: `Dry-run complete for ${MIGRATION_ID}`,
      details: { docId, dryRun: true },
    };
  }

  const pricingHistoryEntry = {
    date: Timestamp.now(),
    price: updatedData.pricing.original,
    changedBy: "migration-script",
  };

  await updateDoc(doc(db, COLLECTION_NAME, docId), {
    ...updatedData,
    pricingHistory: arrayUnion(pricingHistoryEntry),
    "metadata.updatedAt": Timestamp.now(),
    "metadata.updatedBy": "migration-script",
    "metadata.migratedBy": MIGRATION_ID,
  });

  console.log(`\n✅ Migration complete!`);
  console.log(`   Updated: ${docId} (Japan Adventure Standard)`);

  return {
    message: `✅ ${MIGRATION_ID} completed: Japan Adventure updated`,
    details: { docId, updated: 1, errors: 0 },
  };
}

export async function rollbackMigration() {
  console.log(`\n↩️ Rolling back ${MIGRATION_ID}`);
  console.log(
    `⚠️ Rollback not implemented — restore from export-dev backup or manually revert pricing to £2050 / £250 deposit`
  );
}
