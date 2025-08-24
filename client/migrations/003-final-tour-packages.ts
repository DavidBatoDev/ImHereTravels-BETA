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

// Final tour packages data (rows 9-12 from the table)
const finalTourPackages = [
  {
    name: "India Discovery Tour",
    url: "https://imheretravels.com/all-tours/india/",
    brochureLink:
      "https://drive.google.com/file/d/1zHm8bpYGOR4wJEZy4_M5tGLrmyHmu2ug/view?usp=drive_link",
    destinations: ["Delhi", "Jaipur", "Agra", "Ranthambhore", "Udaipur"],
    tourCode: "IDD",
    duration: 13,
    travelDates: [
      {
        startDate: Timestamp.fromDate(new Date("2025-08-21")),
        endDate: Timestamp.fromDate(new Date("2025-09-02")),
        isAvailable: true,
        maxCapacity: 15,
        currentBookings: 0,
      },
      {
        startDate: Timestamp.fromDate(new Date("2025-09-11")),
        endDate: Timestamp.fromDate(new Date("2025-09-23")),
        isAvailable: true,
        maxCapacity: 15,
        currentBookings: 0,
      },
      {
        startDate: Timestamp.fromDate(new Date("2025-10-02")),
        endDate: Timestamp.fromDate(new Date("2025-10-14")),
        isAvailable: true,
        maxCapacity: 15,
        currentBookings: 0,
      },
      {
        startDate: Timestamp.fromDate(new Date("2025-10-23")),
        endDate: Timestamp.fromDate(new Date("2025-11-04")),
        isAvailable: true,
        maxCapacity: 15,
        currentBookings: 0,
      },
      {
        startDate: Timestamp.fromDate(new Date("2025-11-13")),
        endDate: Timestamp.fromDate(new Date("2025-11-25")),
        isAvailable: true,
        maxCapacity: 15,
        currentBookings: 0,
      },
      {
        startDate: Timestamp.fromDate(new Date("2025-11-27")),
        endDate: Timestamp.fromDate(new Date("2025-12-09")),
        isAvailable: true,
        maxCapacity: 15,
        currentBookings: 0,
      },
    ],
    pricing: {
      original: 999,
      discounted: 899,
      deposit: 150,
      currency: "USD",
    },
    details: {
      highlights: [
        "Ranthambhore Safari",
        "Lake Pichola",
        "Taj Mahal",
        "Jaipur Palace",
        "Delhi Heritage",
        "Cultural experiences",
      ],
      itinerary: [
        {
          day: 1,
          title: "Arrival in Delhi",
          description: "Arrive in Delhi, check-in, welcome dinner and briefing",
        },
        {
          day: 2,
          title: "Delhi City Tour",
          description: "Visit Red Fort, Qutub Minar, Humayun's Tomb",
        },
        {
          day: 3,
          title: "Delhi to Jaipur",
          description: "Transfer to Jaipur, visit City Palace and Hawa Mahal",
        },
        {
          day: 4,
          title: "Jaipur Exploration",
          description: "Amber Fort, Jantar Mantar, local markets",
        },
        {
          day: 5,
          title: "Travel to Ranthambhore",
          description: "Transfer to Ranthambhore, evening safari",
        },
        {
          day: 6,
          title: "Ranthambhore Safari",
          description: "Morning and evening safaris in search of tigers",
        },
        {
          day: 7,
          title: "Ranthambhore to Agra",
          description: "Travel to Agra, visit Agra Fort",
        },
        {
          day: 8,
          title: "Taj Mahal Day",
          description: "Sunrise at Taj Mahal, Fatehpur Sikri",
        },
        {
          day: 9,
          title: "Travel to Udaipur",
          description: "Transfer to Udaipur, check-in and orientation",
        },
        {
          day: 10,
          title: "Udaipur City Tour",
          description: "City Palace, Lake Pichola boat ride",
        },
        {
          day: 11,
          title: "Udaipur Exploration",
          description: "Jagdish Temple, Saheliyon ki Bari gardens",
        },
        {
          day: 12,
          title: "Return to Delhi",
          description: "Flight back to Delhi, final shopping",
        },
        {
          day: 13,
          title: "Final Day & Departure",
          description: "Final breakfast, farewell dinner, transfer to airport",
        },
      ],
      requirements: [
        "Comfortable with hot weather",
        "Good fitness level for walking tours",
        "Respect for local customs and dress codes",
        "Travel insurance required",
        "Valid passport and visa",
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
    location: "India",
    description: "Classic India cultural + safari + Taj Mahal",
    highlights: ["Ranthambhore Safari", "Lake Pichola", "Taj Mahal"],
    itinerarySummary: "Day 1–13 (Delhi → Jaipur → Agra → Checkout)",
    stripePaymentLink: "https://book.stripe.com/eVacOX5dlezP6bK4if",
    preDeparturePack: "",
  },
  {
    name: "India Holi Festival Tour",
    url: "https://imheretravels.com/all-tours/india-holi-festival-tour/",
    brochureLink:
      "https://drive.google.com/file/d/1zHm8bpYGOR4wJEZy4_M5tGLrmyHmu2ug/view?usp=drive_link",
    destinations: ["Delhi", "Jaipur", "Agra", "Ranthambhore"],
    tourCode: "IHF",
    duration: 13,
    travelDates: [
      {
        startDate: Timestamp.fromDate(new Date("2026-03-01")),
        endDate: Timestamp.fromDate(new Date("2026-03-13")),
        isAvailable: true,
        maxCapacity: 15,
        currentBookings: 0,
      },
    ],
    pricing: {
      original: 999,
      discounted: null,
      deposit: 150,
      currency: "USD",
    },
    details: {
      highlights: [
        "Holi Festival Celebration",
        "Ranthambhore Safari",
        "Lake Pichola",
        "Taj Mahal",
        "Jaipur Palace",
        "Delhi Heritage",
      ],
      itinerary: [
        {
          day: 1,
          title: "Arrival in Delhi",
          description: "Arrive in Delhi, check-in, welcome dinner and briefing",
        },
        {
          day: 2,
          title: "Delhi City Tour",
          description: "Visit Red Fort, Qutub Minar, Humayun's Tomb",
        },
        {
          day: 3,
          title: "Delhi to Jaipur",
          description: "Transfer to Jaipur, visit City Palace and Hawa Mahal",
        },
        {
          day: 4,
          title: "Jaipur Exploration",
          description: "Amber Fort, Jantar Mantar, local markets",
        },
        {
          day: 5,
          title: "Travel to Ranthambhore",
          description: "Transfer to Ranthambhore, evening safari",
        },
        {
          day: 6,
          title: "Ranthambhore Safari",
          description: "Morning and evening safaris in search of tigers",
        },
        {
          day: 7,
          title: "Ranthambhore to Agra",
          description: "Travel to Agra, visit Agra Fort",
        },
        {
          day: 8,
          title: "Taj Mahal Day",
          description: "Sunrise at Taj Mahal, Fatehpur Sikri",
        },
        {
          day: 9,
          title: "Travel to Udaipur",
          description: "Transfer to Udaipur, check-in and orientation",
        },
        {
          day: 10,
          title: "Udaipur City Tour",
          description: "City Palace, Lake Pichola boat ride",
        },
        {
          day: 11,
          title: "Holi Festival Celebration",
          description: "Participate in Holi festival celebrations",
        },
        {
          day: 12,
          title: "Return to Delhi",
          description: "Flight back to Delhi, final shopping",
        },
        {
          day: 13,
          title: "Final Day & Departure",
          description: "Final breakfast, farewell dinner, transfer to airport",
        },
      ],
      requirements: [
        "Comfortable with hot weather",
        "Good fitness level for walking tours",
        "Respect for local customs and dress codes",
        "Travel insurance required",
        "Valid passport and visa",
        "Willing to participate in Holi festival",
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
    location: "India",
    description: "Festival of Colors + Taj Mahal + Safari",
    highlights: ["Holi Festival", "Ranthambhore Safari", "Taj Mahal"],
    itinerarySummary: "Day 1–13 (Delhi → Jaipur → Agra → Checkout)",
    stripePaymentLink: "https://book.stripe.com/fZu9AT8ZR4CJ51FgIDco036",
    preDeparturePack: "",
  },
  {
    name: "Tanzania Exploration",
    url: "https://imheretravels.com/all-tours/tanzania-exploration/",
    brochureLink: "",
    destinations: ["Arusha", "Serengeti", "Ngorongoro", "Zanzibar"],
    tourCode: "TXP",
    duration: 10,
    travelDates: [
      {
        startDate: Timestamp.fromDate(new Date("2025-08-23")),
        endDate: Timestamp.fromDate(new Date("2025-09-01")),
        isAvailable: true,
        maxCapacity: 12,
        currentBookings: 0,
      },
    ],
    pricing: {
      original: 1899,
      discounted: null,
      deposit: 150,
      currency: "USD",
    },
    details: {
      highlights: [
        "Game Drives",
        "Safari Blue",
        "Mini Trek",
        "Serengeti Wildlife",
        "Ngorongoro Crater",
        "Zanzibar Beaches",
      ],
      itinerary: [
        {
          day: 1,
          title: "Arrival in Arusha",
          description:
            "Arrive in Arusha, check-in, welcome dinner and briefing",
        },
        {
          day: 2,
          title: "Arusha to Serengeti",
          description: "Transfer to Serengeti, afternoon game drive",
        },
        {
          day: 3,
          title: "Serengeti Game Drives",
          description: "Full day game drives in search of the Big Five",
        },
        {
          day: 4,
          title: "Serengeti to Ngorongoro",
          description: "Morning game drive, transfer to Ngorongoro",
        },
        {
          day: 5,
          title: "Ngorongoro Crater",
          description: "Full day exploring the crater floor",
        },
        {
          day: 6,
          title: "Travel to Zanzibar",
          description: "Flight to Zanzibar, check-in and beach time",
        },
        {
          day: 7,
          title: "Zanzibar Exploration",
          description: "Stone Town tour, spice plantation visit",
        },
        {
          day: 8,
          title: "Safari Blue Adventure",
          description: "Full day boat trip, snorkeling, and beach activities",
        },
        {
          day: 9,
          title: "Zanzibar Free Day",
          description: "Relax on the beach or optional activities",
        },
        {
          day: 10,
          title: "Final Day & Departure",
          description: "Final breakfast, transfer to airport",
        },
      ],
      requirements: [
        "Good fitness level for walking and trekking",
        "Comfortable with long game drives",
        "Travel insurance required",
        "Valid passport and visa",
        "Yellow fever vaccination",
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
    location: "Tanzania",
    description: "Kilimanjaro trek + safari + Zanzibar",
    highlights: ["Game Drives", "Safari Blue", "Mini Trek"],
    itinerarySummary: "Day 1–10 (Arrival → Checkout)",
    stripePaymentLink: "https://book.stripe.com/5kAdT10X54ZfcA87uK",
    preDeparturePack: "",
  },
  {
    name: "New Zealand Expedition",
    url: "https://imheretravels.com/all-tours/new-zealand-expedition/",
    brochureLink: "",
    destinations: ["Auckland", "Rotorua", "Queenstown", "Milford Sound"],
    tourCode: "NZE",
    duration: 15,
    travelDates: [
      {
        startDate: Timestamp.fromDate(new Date("2025-11-11")),
        endDate: Timestamp.fromDate(new Date("2025-11-25")),
        isAvailable: true,
        maxCapacity: 15,
        currentBookings: 0,
      },
    ],
    pricing: {
      original: 1799,
      discounted: null,
      deposit: 200,
      currency: "USD",
    },
    details: {
      highlights: [
        "Kiwi Hatchery",
        "Milford Sound",
        "Māori Village",
        "Rotorua Geothermal",
        "Queenstown Adventures",
        "Auckland Sky Tower",
      ],
      itinerary: [
        {
          day: 1,
          title: "Arrival in Auckland",
          description:
            "Arrive in Auckland, check-in, welcome dinner and briefing",
        },
        {
          day: 2,
          title: "Auckland City Tour",
          description: "Sky Tower, Auckland Museum, waterfront",
        },
        {
          day: 3,
          title: "Auckland to Rotorua",
          description: "Transfer to Rotorua, visit Te Puia geothermal area",
        },
        {
          day: 4,
          title: "Rotorua Exploration",
          description: "Māori cultural performance, geothermal parks",
        },
        {
          day: 5,
          title: "Rotorua Adventures",
          description: "Zorbing, luge, or hot springs",
        },
        {
          day: 6,
          title: "Travel to Taupo",
          description: "Visit Huka Falls, Lake Taupo",
        },
        {
          day: 7,
          title: "Taupo to Wellington",
          description: "Travel to Wellington, visit Te Papa Museum",
        },
        {
          day: 8,
          title: "Wellington to South Island",
          description: "Ferry to South Island, travel to Nelson",
        },
        {
          day: 9,
          title: "Nelson to Westport",
          description: "Visit Abel Tasman National Park",
        },
        {
          day: 10,
          title: "Westport to Franz Josef",
          description: "Travel along West Coast, visit glaciers",
        },
        {
          day: 11,
          title: "Franz Josef to Queenstown",
          description: "Travel to Queenstown, check-in",
        },
        {
          day: 12,
          title: "Queenstown Adventures",
          description: "Optional bungee jumping, jet boating",
        },
        {
          day: 13,
          title: "Milford Sound Day Trip",
          description: "Full day trip to Milford Sound, cruise",
        },
        {
          day: 14,
          title: "Queenstown Free Day",
          description: "Relax or choose from adventure activities",
        },
        {
          day: 15,
          title: "Final Day & Departure",
          description: "Final breakfast, transfer to airport",
        },
      ],
      requirements: [
        "Good fitness level for walking and hiking",
        "Comfortable with adventure activities",
        "Travel insurance required",
        "Valid passport",
        "Comfortable with changing weather conditions",
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
    location: "New Zealand",
    description: "15-day full NZ tour (Auckland → Queenstown)",
    highlights: ["Kiwi Hatchery", "Milford Sound", "Māori Village"],
    itinerarySummary: "Day 1–15 (Auckland → Queenstown → Checkout)",
    stripePaymentLink: "https://book.stripe.com/8wM5mv35dfDTas02aV",
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
  console.log("🚀 Starting migration: 003-final-tour-packages");
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

    for (const tourData of finalTourPackages) {
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
  console.log("🔄 Starting rollback for migration: 003-final-tour-packages");

  const results = {
    deleted: 0,
    errors: 0,
    errorDetails: [] as string[],
  };

  try {
    for (const tourData of finalTourPackages) {
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
