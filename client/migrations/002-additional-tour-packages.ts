import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { Timestamp } from "firebase/firestore";
import { db } from "./firebase-config";

const COLLECTION_NAME = "tourPackages";

// Additional tour packages data (rows 5-8 from the table)
const additionalTourPackages = [
  {
    name: "Sri Lanka Wander Tour",
    url: "https://imheretravels.com/all-tours/sri-lanka-wander-tour/",
    brochureLink:
      "https://drive.google.com/file/d/1JLgKdGk_x5z-zaXtyb99MKlD9UzU7xQt/view?usp=drive_link",
    destinations: ["Colombo", "Arugam Bay", "Ella", "Negombo"],
    tourCode: "SLW",
    duration: 12,
    travelDates: [
      {
        startDate: Timestamp.fromDate(new Date("2025-06-23")),
        endDate: Timestamp.fromDate(new Date("2025-07-04")),
        isAvailable: true,
        maxCapacity: 15,
        currentBookings: 0,
      },
      {
        startDate: Timestamp.fromDate(new Date("2025-07-14")),
        endDate: Timestamp.fromDate(new Date("2025-07-25")),
        isAvailable: true,
        maxCapacity: 15,
        currentBookings: 0,
      },
      {
        startDate: Timestamp.fromDate(new Date("2025-08-04")),
        endDate: Timestamp.fromDate(new Date("2025-08-15")),
        isAvailable: true,
        maxCapacity: 15,
        currentBookings: 0,
      },
      {
        startDate: Timestamp.fromDate(new Date("2025-09-15")),
        endDate: Timestamp.fromDate(new Date("2025-09-26")),
        isAvailable: true,
        maxCapacity: 15,
        currentBookings: 0,
      },
      {
        startDate: Timestamp.fromDate(new Date("2025-09-22")),
        endDate: Timestamp.fromDate(new Date("2025-10-03")),
        isAvailable: true,
        maxCapacity: 15,
        currentBookings: 0,
      },
    ],
    pricing: {
      original: 1100,
      discounted: null,
      deposit: 150,
      currency: "USD",
    },
    details: {
      highlights: [
        "Cycling",
        "Scenic Train",
        "Colombo City Tour",
        "Historical sites",
        "Spice gardens",
        "Hiking",
        "Safaris",
      ],
      itinerary: [
        {
          day: 1,
          title: "Arrival in Negombo",
          description:
            "Arrive in Negombo, transfer to hotel, welcome dinner and briefing",
        },
        {
          day: 2,
          title: "Negombo to Colombo",
          description:
            "Morning transfer to Colombo, city tour and cultural sites",
        },
        {
          day: 3,
          title: "Colombo Exploration",
          description: "Visit temples, markets, and colonial architecture",
        },
        {
          day: 4,
          title: "Travel to Arugam Bay",
          description: "Scenic train journey to Arugam Bay, beach orientation",
        },
        {
          day: 5,
          title: "Arugam Bay Adventures",
          description: "Surfing, beach activities, and local village visit",
        },
        {
          day: 6,
          title: "Wildlife Safari",
          description:
            "Morning safari at nearby national park, afternoon relaxation",
        },
        {
          day: 7,
          title: "Travel to Ella",
          description: "Scenic train journey through tea plantations to Ella",
        },
        {
          day: 8,
          title: "Ella Hiking",
          description: "Hike to Little Adam's Peak, visit tea factory",
        },
        {
          day: 9,
          title: "Ella to Kandy",
          description: "Train journey to Kandy, visit Temple of the Tooth",
        },
        {
          day: 10,
          title: "Kandy Cultural Tour",
          description: "Cultural dance performance, spice garden visit",
        },
        {
          day: 11,
          title: "Return to Colombo",
          description:
            "Travel back to Colombo, final shopping and farewell dinner",
        },
        {
          day: 12,
          title: "Checkout & Departure",
          description: "Final breakfast, checkout, and transfer to airport",
        },
      ],
      requirements: [
        "Moderate fitness level",
        "Comfortable with long train journeys",
        "Respect for local customs",
        "Travel insurance required",
      ],
    },
    media: {
      coverImage: "",
      gallery: [],
    },
    metadata: {
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: "migration-script",
      status: "active",
      featured: false,
      bookingsCount: 0,
      rating: 0,
      reviewCount: 0,
    },
    status: "active",
    location: "Sri Lanka",
    description: "Historical sites, spice gardens, hiking, safaris",
    highlights: ["Cycling", "Scenic Train", "Colombo City Tour"],
    itinerarySummary: "Day 1–12 (Negombo → Checkout)",
    stripePaymentLink: "https://buy.stripe.com/00g02b9tB0IZbw47t6",
    preDeparturePack: "",
  },
  {
    name: "Argentina's Wonders",
    url: "https://imheretravels.com/all-tours/argentinas-wonders/",
    brochureLink:
      "https://drive.google.com/file/d/1OjUzbqC2MZL8igo9wUunjP3hS5xVmF5b/view?usp=drive_link",
    destinations: ["Buenos Aires", "Patagonia", "Iguazu"],
    tourCode: "ARW",
    duration: 11,
    travelDates: [
      {
        startDate: Timestamp.fromDate(new Date("2026-01-23")),
        endDate: Timestamp.fromDate(new Date("2026-02-02")),
        isAvailable: true,
        maxCapacity: 12,
        currentBookings: 0,
      },
    ],
    pricing: {
      original: 2399,
      discounted: null,
      deposit: 250,
      currency: "USD",
    },
    details: {
      highlights: [
        "Iguazu Waterfalls",
        "Tango",
        "Perito Moreno Trek",
        "Buenos Aires culture",
        "Patagonia landscapes",
      ],
      itinerary: [
        {
          day: 1,
          title: "Arrival in Buenos Aires",
          description:
            "Arrive in Buenos Aires, check-in, welcome dinner and tango show",
        },
        {
          day: 2,
          title: "Buenos Aires City Tour",
          description: "Visit La Boca, Recoleta Cemetery, Plaza de Mayo",
        },
        {
          day: 3,
          title: "Tango Experience",
          description: "Tango lesson, visit San Telmo market, evening milonga",
        },
        {
          day: 4,
          title: "Travel to Iguazu",
          description: "Flight to Iguazu, check-in and orientation",
        },
        {
          day: 5,
          title: "Iguazu Falls - Argentina Side",
          description: "Full day exploring the Argentine side of Iguazu Falls",
        },
        {
          day: 6,
          title: "Iguazu Falls - Brazil Side",
          description:
            "Cross to Brazil side for different perspectives of the falls",
        },
        {
          day: 7,
          title: "Return to Buenos Aires",
          description: "Flight back to Buenos Aires, evening at leisure",
        },
        {
          day: 8,
          title: "Travel to Patagonia",
          description: "Flight to El Calafate, transfer to hotel",
        },
        {
          day: 9,
          title: "Perito Moreno Glacier",
          description:
            "Full day at Perito Moreno Glacier, trekking and boat tour",
        },
        {
          day: 10,
          title: "Patagonia Exploration",
          description: "Visit nearby viewpoints and hiking trails",
        },
        {
          day: 11,
          title: "Return to Buenos Aires & Departure",
          description:
            "Flight back to Buenos Aires, final dinner, transfer to airport",
        },
      ],
      requirements: [
        "Good fitness level for trekking",
        "Comfortable with cold weather",
        "Travel insurance required",
        "Valid passport",
      ],
    },
    media: {
      coverImage: "",
      gallery: [],
    },
    metadata: {
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: "migration-script",
      status: "active",
      featured: false,
      bookingsCount: 0,
      rating: 0,
      reviewCount: 0,
    },
    status: "active",
    location: "Argentina",
    description: "Tango, Patagonia trekking, Iguazu Falls",
    highlights: ["Iguazu Waterfalls", "Tango", "Perito Moreno Trek"],
    itinerarySummary: "Day 1–11 (Buenos Aires → Iguazú → Checkout)",
    stripePaymentLink: "https://book.stripe.com/9B63cvb7Z0mtdyb2RNco031",
    preDeparturePack: "",
  },
  {
    name: "Brazil's Treasures",
    url: "https://imheretravels.com/all-tours/brazils-treasure/",
    brochureLink:
      "https://drive.google.com/file/d/1BsdO0lR_b7K28B-q3PQ-M8tmNqlAXhl8/view?usp=drive_link",
    destinations: ["Manaus", "Amazon", "Paraty", "Rio"],
    tourCode: "BZT",
    duration: 12,
    travelDates: [
      {
        startDate: Timestamp.fromDate(new Date("2026-02-03")),
        endDate: Timestamp.fromDate(new Date("2026-02-14")),
        isAvailable: true,
        maxCapacity: 15,
        currentBookings: 0,
      },
    ],
    pricing: {
      original: 1700,
      discounted: null,
      deposit: 200,
      currency: "USD",
    },
    details: {
      highlights: [
        "Amazon Cruise",
        "Sambadrome",
        "Rio City Icons",
        "Paraty colonial town",
        "Carnival experience",
      ],
      itinerary: [
        {
          day: 1,
          title: "Arrival in Manaus",
          description:
            "Arrive in Manaus, check-in, welcome dinner and briefing",
        },
        {
          day: 2,
          title: "Manaus City Tour",
          description: "Visit Opera House, floating port, and local markets",
        },
        {
          day: 3,
          title: "Amazon River Cruise",
          description:
            "Board riverboat, start Amazon adventure, wildlife spotting",
        },
        {
          day: 4,
          title: "Amazon Exploration",
          description: "Jungle trekking, piranha fishing, night safari",
        },
        {
          day: 5,
          title: "Amazon Indigenous Village",
          description: "Visit local community, learn about traditions",
        },
        {
          day: 6,
          title: "Return to Manaus",
          description: "Return to Manaus, evening at leisure",
        },
        {
          day: 7,
          title: "Travel to Paraty",
          description: "Flight to Rio, transfer to Paraty, check-in",
        },
        {
          day: 8,
          title: "Paraty Exploration",
          description: "Colonial town tour, boat trip to nearby islands",
        },
        {
          day: 9,
          title: "Travel to Rio",
          description: "Transfer to Rio de Janeiro, check-in and orientation",
        },
        {
          day: 10,
          title: "Rio Iconic Sites",
          description: "Christ the Redeemer, Sugarloaf Mountain, Copacabana",
        },
        {
          day: 11,
          title: "Carnival Experience",
          description:
            "Visit Sambadrome, samba school rehearsal, carnival parade",
        },
        {
          day: 12,
          title: "Final Day & Departure",
          description: "Final shopping, farewell dinner, transfer to airport",
        },
      ],
      requirements: [
        "Comfortable with humidity and heat",
        "Good fitness level for walking tours",
        "Travel insurance required",
        "Valid passport",
      ],
    },
    media: {
      coverImage: "",
      gallery: [],
    },
    metadata: {
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: "migration-script",
      status: "active",
      featured: false,
      bookingsCount: 0,
      rating: 0,
      reviewCount: 0,
    },
    status: "active",
    location: "Brazil",
    description: "Amazon cruise, Paraty, Rio Carnival",
    highlights: ["Amazon Cruise", "Sambadrome", "Rio City Icons"],
    itinerarySummary: "Day 1–12 (Manaus → Rio → Checkout)",
    stripePaymentLink: "https://book.stripe.com/fZu8wP2Btd9f51F63Zco02Z",
    preDeparturePack: "",
  },
  {
    name: "Vietnam Expedition",
    url: "https://imheretravels.com/all-tours/vietnam/",
    brochureLink: "",
    destinations: ["Hanoi", "Hoi An", "Ho Chi Minh"],
    tourCode: "VNE",
    duration: 11,
    travelDates: [
      {
        startDate: Timestamp.fromDate(new Date("2025-04-03")),
        endDate: Timestamp.fromDate(new Date("2025-04-13")),
        isAvailable: true,
        maxCapacity: 15,
        currentBookings: 0,
      },
      {
        startDate: Timestamp.fromDate(new Date("2025-05-15")),
        endDate: Timestamp.fromDate(new Date("2025-05-25")),
        isAvailable: true,
        maxCapacity: 15,
        currentBookings: 0,
      },
      {
        startDate: Timestamp.fromDate(new Date("2025-06-20")),
        endDate: Timestamp.fromDate(new Date("2025-06-30")),
        isAvailable: true,
        maxCapacity: 15,
        currentBookings: 0,
      },
      {
        startDate: Timestamp.fromDate(new Date("2025-07-25")),
        endDate: Timestamp.fromDate(new Date("2025-08-04")),
        isAvailable: true,
        maxCapacity: 15,
        currentBookings: 0,
      },
      {
        startDate: Timestamp.fromDate(new Date("2025-08-29")),
        endDate: Timestamp.fromDate(new Date("2025-09-08")),
        isAvailable: true,
        maxCapacity: 15,
        currentBookings: 0,
      },
      {
        startDate: Timestamp.fromDate(new Date("2025-09-22")),
        endDate: Timestamp.fromDate(new Date("2025-10-02")),
        isAvailable: true,
        maxCapacity: 15,
        currentBookings: 0,
      },
      {
        startDate: Timestamp.fromDate(new Date("2025-10-03")),
        endDate: Timestamp.fromDate(new Date("2025-10-13")),
        isAvailable: true,
        maxCapacity: 15,
        currentBookings: 0,
      },
    ],
    pricing: {
      original: 1100,
      discounted: null,
      deposit: 150,
      currency: "USD",
    },
    details: {
      highlights: [
        "Cooking Class",
        "Cu Chi Tunnels",
        "Hoi An",
        "Hanoi Old Quarter",
        "Mekong Delta",
        "Cultural experiences",
      ],
      itinerary: [
        {
          day: 1,
          title: "Arrival in Hanoi",
          description: "Arrive in Hanoi, check-in, welcome dinner and briefing",
        },
        {
          day: 2,
          title: "Hanoi City Tour",
          description:
            "Visit Hoan Kiem Lake, Temple of Literature, Old Quarter",
        },
        {
          day: 3,
          title: "Hanoi to Halong Bay",
          description: "Transfer to Halong Bay, overnight cruise",
        },
        {
          day: 4,
          title: "Halong Bay Exploration",
          description: "Kayaking, cave exploration, swimming, return to Hanoi",
        },
        {
          day: 5,
          title: "Travel to Hoi An",
          description: "Flight to Da Nang, transfer to Hoi An, check-in",
        },
        {
          day: 6,
          title: "Hoi An Ancient Town",
          description:
            "Walking tour of UNESCO World Heritage site, lantern making",
        },
        {
          day: 7,
          title: "Hoi An Cooking Class",
          description:
            "Morning market visit, cooking class, afternoon free time",
        },
        {
          day: 8,
          title: "Travel to Ho Chi Minh City",
          description: "Flight to Ho Chi Minh City, check-in and orientation",
        },
        {
          day: 9,
          title: "Ho Chi Minh City Tour",
          description: "Visit Cu Chi Tunnels, War Remnants Museum",
        },
        {
          day: 10,
          title: "Mekong Delta Day Trip",
          description:
            "Boat trip to Mekong Delta, floating markets, local villages",
        },
        {
          day: 11,
          title: "Final Day & Departure",
          description: "Final shopping, farewell dinner, transfer to airport",
        },
      ],
      requirements: [
        "Comfortable with hot and humid weather",
        "Good fitness level for walking tours",
        "Travel insurance required",
        "Valid passport",
      ],
    },
    media: {
      coverImage: "",
      gallery: [],
    },
    metadata: {
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: "migration-script",
      status: "active",
      featured: false,
      bookingsCount: 0,
      rating: 0,
      reviewCount: 0,
    },
    status: "active",
    location: "Vietnam",
    description: "North–South Vietnam cultural and adventure tour",
    highlights: ["Cooking Class", "Cu Chi Tunnels", "Hoi An"],
    itinerarySummary: "Day 1–11 (Hanoi → Hoi An → HCM → Checkout)",
    stripePaymentLink: "https://book.stripe.com/cN29CL5dldvLbw46pv",
    preDeparturePack: "",
  },
];

export async function runMigration(dryRun: boolean = false): Promise<{
  success: boolean;
  message: string;
  details: {
    created: number;
    skipped: number;
    errors: number;
    errorDetails?: string[];
  };
}> {
  console.log("🚀 Starting migration: 002-additional-tour-packages");
  console.log(`📊 Dry run mode: ${dryRun ? "ON" : "OFF"}`);

  const results = {
    created: 0,
    skipped: 0,
    errors: 0,
    errorDetails: [] as string[],
  };

  try {
    // Check if tours already exist
    const existingTours = await getDocs(collection(db, COLLECTION_NAME));

    if (existingTours.size > 0) {
      console.log(
        `⚠️  Found ${existingTours.size} existing tours. Checking for conflicts...`
      );
    }

    for (const tourData of additionalTourPackages) {
      try {
        // Check if tour with this code already exists
        const existingTourQuery = query(
          collection(db, COLLECTION_NAME),
          where("tourCode", "==", tourData.tourCode)
        );
        const existingTourDocs = await getDocs(existingTourQuery);

        if (!existingTourDocs.empty) {
          console.log(
            `⚠️  Tour code ${tourData.tourCode} already exists, skipping...`
          );
          results.skipped++;
          continue;
        }

        if (dryRun) {
          console.log(
            `🔍 [DRY RUN] Would create tour: ${tourData.name} (${tourData.tourCode})`
          );
          results.created++;
        } else {
          await addDoc(collection(db, COLLECTION_NAME), tourData);
          console.log(
            `✅ Created tour: ${tourData.name} (${tourData.tourCode})`
          );
          results.created++;
        }
      } catch (error) {
        const errorMsg = `Failed to create tour ${tourData.tourCode}: ${error}`;
        console.error(`❌ ${errorMsg}`);
        results.errors++;
        results.errorDetails!.push(errorMsg);
      }
    }

    if (results.errors > 0) {
      const message = `Migration completed with ${results.errors} errors. Created ${results.created} tours, skipped ${results.skipped}.`;
      console.log(`❌ Migration completed with errors`);
      console.log(
        `📊 Results: ${results.created} created, ${results.skipped} skipped, ${results.errors} errors`
      );
      return {
        success: false,
        message,
        details: results,
      };
    }

    const message = `Migration completed successfully. Created ${results.created} tours, skipped ${results.skipped}.`;
    console.log(`🎯 Migration SUCCESS`);
    console.log(
      `📊 Results: ${results.created} created, ${results.skipped} skipped, ${results.errors} errors`
    );
    console.log(`\n🎯 ${message}`);
    console.log(
      `📊 Details: ${results.created} created, ${results.skipped} skipped, ${results.errors} errors`
    );

    return {
      success: true,
      message,
      details: results,
    };
  } catch (error) {
    const errorMsg = `Migration failed: ${error}`;
    console.error(`❌ ${errorMsg}`);
    return {
      success: false,
      message: errorMsg,
      details: {
        created: results.created,
        skipped: results.skipped,
        errors: results.errors + 1,
        errorDetails: [...(results.errorDetails || []), errorMsg],
      },
    };
  }
}

export async function rollbackMigration(): Promise<{
  success: boolean;
  message: string;
  details: {
    deleted: number;
    errors: number;
    errorDetails?: string[];
  };
}> {
  console.log(
    "🔄 Starting rollback for migration: 002-additional-tour-packages"
  );

  const results = {
    deleted: 0,
    errors: 0,
    errorDetails: [] as string[],
  };

  try {
    for (const tourData of additionalTourPackages) {
      try {
        // Find and delete tour by tourCode
        const tourQuery = query(
          collection(db, COLLECTION_NAME),
          where("tourCode", "==", tourData.tourCode)
        );
        const tourDocs = await getDocs(tourQuery);

        if (!tourDocs.empty) {
          for (const doc of tourDocs.docs) {
            await deleteDoc(doc.ref);
            console.log(
              `🗑️  Deleted tour: ${tourData.name} (${tourData.tourCode})`
            );
            results.deleted++;
          }
        } else {
          console.log(
            `⚠️  Tour ${tourData.tourCode} not found, skipping deletion`
          );
        }
      } catch (error) {
        const errorMsg = `Failed to delete tour ${tourData.tourCode}: ${error}`;
        console.error(`❌ ${errorMsg}`);
        results.errors++;
        results.errorDetails!.push(errorMsg);
      }
    }

    const message = `Rollback completed. Deleted ${results.deleted} tours.`;
    console.log(`✅ Rollback completed successfully`);
    console.log(
      `📊 Results: ${results.deleted} deleted, ${results.errors} errors`
    );

    return {
      success: true,
      message,
      details: results,
    };
  } catch (error) {
    const errorMsg = `Rollback failed: ${error}`;
    console.error(`❌ ${errorMsg}`);
    return {
      success: false,
      message: errorMsg,
      details: {
        deleted: results.deleted,
        errors: results.errors + 1,
        errorDetails: [...(results.errorDetails || []), errorMsg],
      },
    };
  }
}
