import { Timestamp } from "firebase/firestore";
import { db } from "./firebase-config";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { TourPackage } from "../src/types/tours";

// ============================================================================
// MIGRATION CONFIGURATION
// ============================================================================

const MIGRATION_ID = "001-initial-tour-packages";
const COLLECTION_NAME = "tourPackages";

// ============================================================================
// MIGRATION DATA - First 4 Tour Packages
// ============================================================================

const initialTourPackages: Omit<TourPackage, "id">[] = [
  {
    name: "Siargao Island Adventure",
    slug: "siargao-island-adventure",
    url: "https://imheretravels.com/all-tours/siargao-island-adventure/",
    tourCode: "SIA",
    description:
      "Siargao adventure with wakeboarding, surfing, island hopping, yoga",
    location: "Philippines",
    duration: 6,
    travelDates: [
      {
        startDate: Timestamp.fromDate(new Date("2025-01-01")),
        endDate: Timestamp.fromDate(new Date("2025-12-31")),
        isAvailable: true,
        maxCapacity: 20,
        currentBookings: 0,
      },
    ],
    pricing: {
      original: 430,
      discounted: null,
      deposit: 150,
      currency: "USD",
    },
    details: {
      highlights: [
        "Wakeboarding",
        "Island hopping",
        "Surfing",
        "Yoga sessions",
        "Beach exploration",
      ],
      itinerary: [
        {
          day: 1,
          title: "Arrival & Welcome",
          description:
            "Arrive in Siargao, check-in to accommodation, welcome dinner and orientation",
        },
        {
          day: 2,
          title: "Wakeboarding Adventure",
          description:
            "Morning wakeboarding session, afternoon island hopping to nearby islands",
        },
        {
          day: 3,
          title: "Surfing Day",
          description:
            "Full day of surfing at Cloud 9 and other famous surf spots",
        },
        {
          day: 4,
          title: "Island Exploration",
          description:
            "Visit Naked Island, Daku Island, and Guyam Island for snorkeling and beach activities",
        },
        {
          day: 5,
          title: "Yoga & Wellness",
          description:
            "Morning yoga session, afternoon free time for relaxation or additional activities",
        },
        {
          day: 6,
          title: "Checkout & Departure",
          description: "Final breakfast, checkout, and transfer to airport",
        },
      ],
      requirements: [
        "Basic swimming ability",
        "Comfortable with water activities",
        "Travel insurance recommended",
        "Valid passport for international travel",
      ],
    },
    media: {
      coverImage: "",
      gallery: [],
    },
    status: "active",
    brochureLink: "",
    stripePaymentLink: "",
    preDeparturePack: "",
    pricingHistory: [
      {
        date: Timestamp.now(),
        price: 430,
        changedBy: "system",
      },
    ],
    metadata: {
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: "system",
      bookingsCount: 0,
    },
  },
  {
    name: "Philippine Sunrise",
    slug: "philippine-sunrise",
    url: "https://imheretravels.com/all-tours/philippine-sunrise/",
    tourCode: "PHS",
    description: "Cebu, Moalboal sardine run & canyoneering, Siargao surfing",
    location: "Philippines",
    duration: 11,
    travelDates: [
      {
        startDate: Timestamp.fromDate(new Date("2025-08-04")),
        endDate: Timestamp.fromDate(new Date("2025-08-14")),
        isAvailable: true,
        maxCapacity: 15,
        currentBookings: 0,
      },
      {
        startDate: Timestamp.fromDate(new Date("2025-09-01")),
        endDate: Timestamp.fromDate(new Date("2025-09-11")),
        isAvailable: true,
        maxCapacity: 15,
        currentBookings: 0,
      },
      {
        startDate: Timestamp.fromDate(new Date("2025-09-16")),
        endDate: Timestamp.fromDate(new Date("2025-09-26")),
        isAvailable: true,
        maxCapacity: 15,
        currentBookings: 0,
      },
      {
        startDate: Timestamp.fromDate(new Date("2025-09-29")),
        endDate: Timestamp.fromDate(new Date("2025-10-09")),
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
        "Sardine Run",
        "Canyoneering",
        "Surfing",
        "Roadtrip North",
        "Island hopping",
      ],
      itinerary: [
        {
          day: 1,
          title: "Arrival in Cebu",
          description:
            "Arrive in Cebu, transfer to Moalboal, welcome dinner and briefing",
        },
        {
          day: 2,
          title: "Sardine Run",
          description:
            "Early morning sardine run experience, afternoon free time",
        },
        {
          day: 3,
          title: "Canyoneering Adventure",
          description:
            "Full day canyoneering at Kawasan Falls, swimming and cliff jumping",
        },
        {
          day: 4,
          title: "Moalboal Exploration",
          description:
            "Island hopping around Moalboal, snorkeling and beach activities",
        },
        {
          day: 5,
          title: "Travel to Siargao",
          description: "Morning flight to Siargao, check-in and orientation",
        },
        {
          day: 6,
          title: "Surfing Day 1",
          description: "Full day of surfing at Cloud 9 and other surf spots",
        },
        {
          day: 7,
          title: "Surfing Day 2",
          description:
            "Continue surfing adventure, visit different surf breaks",
        },
        {
          day: 8,
          title: "Island Hopping",
          description: "Visit Naked Island, Daku Island, and Guyam Island",
        },
        {
          day: 9,
          title: "North Roadtrip",
          description:
            "Explore northern Siargao, visit viewpoints and hidden beaches",
        },
        {
          day: 10,
          title: "Final Surfing",
          description: "Last surfing session, farewell dinner and celebration",
        },
        {
          day: 11,
          title: "Checkout & Departure",
          description: "Final breakfast, checkout, and transfer to airport",
        },
      ],
      requirements: [
        "Intermediate swimming ability",
        "Comfortable with heights (canyoneering)",
        "Basic surfing experience helpful",
        "Travel insurance required",
      ],
    },
    media: {
      coverImage: "",
      gallery: [],
    },
    status: "active",
    brochureLink:
      "https://drive.google.com/file/d/1g6aQrfOdP14T3HfD5D9AmIzKaLz5sJ9Q/view?usp=drive_link",
    stripePaymentLink: "https://book.stripe.com/9B63cv2Bt2uB8dR8c7co032",
    preDeparturePack: "",
    pricingHistory: [
      {
        date: Timestamp.now(),
        price: 1100,
        changedBy: "system",
      },
    ],
    metadata: {
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: "system",
      bookingsCount: 0,
    },
  },
  {
    name: "Philippines Sunset",
    slug: "philippines-sunset",
    url: "https://imheretravels.com/all-tours/philippine-sunset/",
    tourCode: "PSS",
    description: "Manila + Port Barton + El Nido adventures",
    location: "Philippines",
    duration: 11,
    travelDates: [
      {
        startDate: Timestamp.fromDate(new Date("2025-05-04")),
        endDate: Timestamp.fromDate(new Date("2025-05-14")),
        isAvailable: true,
        maxCapacity: 18,
        currentBookings: 0,
      },
      {
        startDate: Timestamp.fromDate(new Date("2025-06-15")),
        endDate: Timestamp.fromDate(new Date("2025-06-25")),
        isAvailable: true,
        maxCapacity: 18,
        currentBookings: 0,
      },
      {
        startDate: Timestamp.fromDate(new Date("2025-07-20")),
        endDate: Timestamp.fromDate(new Date("2025-07-30")),
        isAvailable: true,
        maxCapacity: 18,
        currentBookings: 0,
      },
      {
        startDate: Timestamp.fromDate(new Date("2025-08-25")),
        endDate: Timestamp.fromDate(new Date("2025-09-04")),
        isAvailable: true,
        maxCapacity: 18,
        currentBookings: 0,
      },
      {
        startDate: Timestamp.fromDate(new Date("2025-09-28")),
        endDate: Timestamp.fromDate(new Date("2025-10-08")),
        isAvailable: true,
        maxCapacity: 18,
        currentBookings: 0,
      },
      {
        startDate: Timestamp.fromDate(new Date("2025-10-30")),
        endDate: Timestamp.fromDate(new Date("2025-11-09")),
        isAvailable: true,
        maxCapacity: 18,
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
        "Island hopping",
        "Isla experience",
        "Kayaking",
        "Beach exploration",
        "Cultural experiences",
      ],
      itinerary: [
        {
          day: 1,
          title: "Arrival in Manila",
          description:
            "Arrive in Manila, city tour, welcome dinner and orientation",
        },
        {
          day: 2,
          title: "Manila Exploration",
          description:
            "Visit Intramuros, Rizal Park, and other historical sites",
        },
        {
          day: 3,
          title: "Travel to Port Barton",
          description: "Flight to Puerto Princesa, transfer to Port Barton",
        },
        {
          day: 4,
          title: "Port Barton Island Hopping",
          description:
            "Visit White Beach, German Island, and other nearby islands",
        },
        {
          day: 5,
          title: "Port Barton Activities",
          description: "Kayaking, snorkeling, and beach relaxation",
        },
        {
          day: 6,
          title: "Travel to El Nido",
          description: "Transfer to El Nido, check-in and orientation",
        },
        {
          day: 7,
          title: "El Nido Island Hopping A",
          description:
            "Visit Big Lagoon, Small Lagoon, Secret Lagoon, and Shimizu Island",
        },
        {
          day: 8,
          title: "El Nido Island Hopping B",
          description: "Visit Snake Island, Cudugnon Cave, and Cathedral Cave",
        },
        {
          day: 9,
          title: "El Nido Island Hopping C",
          description:
            "Visit Hidden Beach, Secret Beach, and Helicopter Island",
        },
        {
          day: 10,
          title: "El Nido Free Day",
          description:
            "Optional activities, beach relaxation, or additional tours",
        },
        {
          day: 11,
          title: "Checkout & Departure",
          description: "Final breakfast, checkout, and transfer to airport",
        },
      ],
      requirements: [
        "Basic swimming ability",
        "Comfortable with boat travel",
        "Able to walk on uneven terrain",
        "Travel insurance recommended",
      ],
    },
    media: {
      coverImage: "",
      gallery: [],
    },
    status: "active",
    brochureLink:
      "https://drive.google.com/file/d/1g6aQrfOdP14T3HfD5D9AmIzKaLz5sJ9Q/view?usp=drive_link",
    stripePaymentLink: "https://book.stripe.com/cNi00jdg71qxdyb8c7co033",
    preDeparturePack: "",
    pricingHistory: [
      {
        date: Timestamp.now(),
        price: 1100,
        changedBy: "system",
      },
    ],
    metadata: {
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: "system",
      bookingsCount: 0,
    },
  },
  {
    name: "Maldives Bucketlist",
    slug: "maldives-bucketlist",
    url: "https://imheretravels.com/all-tours/maldives-bucketlist/",
    tourCode: "MLB",
    description: "Male City, Rasdhoo reefs, dolphin cruise",
    location: "Maldives",
    duration: 8,
    travelDates: [
      {
        startDate: Timestamp.fromDate(new Date("2025-05-03")),
        endDate: Timestamp.fromDate(new Date("2025-05-10")),
        isAvailable: true,
        maxCapacity: 12,
        currentBookings: 0,
      },
      {
        startDate: Timestamp.fromDate(new Date("2025-06-13")),
        endDate: Timestamp.fromDate(new Date("2025-06-20")),
        isAvailable: true,
        maxCapacity: 12,
        currentBookings: 0,
      },
      {
        startDate: Timestamp.fromDate(new Date("2025-07-13")),
        endDate: Timestamp.fromDate(new Date("2025-07-20")),
        isAvailable: true,
        maxCapacity: 12,
        currentBookings: 0,
      },
    ],
    pricing: {
      original: 1300,
      discounted: null,
      deposit: 200,
      currency: "USD",
    },
    details: {
      highlights: [
        "Snorkeling",
        "Floating Resorts",
        "Sunset Paddle",
        "Dolphin watching",
        "Coral reef exploration",
      ],
      itinerary: [
        {
          day: 1,
          title: "Arrival in Male",
          description:
            "Arrive in Male International Airport, transfer to hotel, welcome dinner",
        },
        {
          day: 2,
          title: "Male City Tour",
          description:
            "Explore Male city, visit fish market, Grand Friday Mosque, and local markets",
        },
        {
          day: 3,
          title: "Transfer to Rasdhoo",
          description:
            "Speedboat transfer to Rasdhoo Atoll, check-in to floating resort",
        },
        {
          day: 4,
          title: "Rasdhoo Reefs",
          description:
            "Full day snorkeling at Rasdhoo reefs, explore vibrant coral gardens",
        },
        {
          day: 5,
          title: "Dolphin Cruise",
          description:
            "Morning dolphin watching cruise, afternoon beach relaxation",
        },
        {
          day: 6,
          title: "Sunset Paddle",
          description:
            "Kayaking and paddleboarding, sunset photography session",
        },
        {
          day: 7,
          title: "Whale Shark Hunt",
          description:
            "Search for whale sharks, additional snorkeling opportunities",
        },
        {
          day: 8,
          title: "Checkout & Departure",
          description: "Final breakfast, checkout, transfer to airport",
        },
      ],
      requirements: [
        "Strong swimming ability",
        "Comfortable with boat travel",
        "Able to handle sea conditions",
        "Travel insurance required",
      ],
    },
    media: {
      coverImage: "",
      gallery: [],
    },
    status: "active",
    brochureLink: "",
    stripePaymentLink: "https://book.stripe.com/28o02bgW377n0Rq5l8",
    preDeparturePack: "",
    pricingHistory: [
      {
        date: Timestamp.now(),
        price: 1300,
        changedBy: "system",
      },
    ],
    metadata: {
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: "system",
      bookingsCount: 0,
    },
  },
];

// ============================================================================
// MIGRATION FUNCTIONS
// ============================================================================

export async function runMigration(dryRun: boolean = false): Promise<{
  success: boolean;
  message: string;
  details?: {
    created: number;
    skipped: number;
    errors: string[];
  };
}> {
  console.log(`🚀 Starting migration: ${MIGRATION_ID}`);
  console.log(`📊 Dry run mode: ${dryRun ? "ON" : "OFF"}`);

  const results = {
    created: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    // Check if tours already exist
    const existingTours = await getDocs(collection(db, COLLECTION_NAME));

    if (existingTours.size > 0) {
      console.log(
        `⚠️  Found ${existingTours.size} existing tours. Checking for conflicts...`
      );

      // Check for tour code conflicts
      for (const tour of initialTourPackages) {
        const conflictQuery = query(
          collection(db, COLLECTION_NAME),
          where("tourCode", "==", tour.tourCode)
        );
        const conflictDocs = await getDocs(conflictQuery);

        if (conflictDocs.size > 0) {
          console.log(
            `⚠️  Tour code ${tour.tourCode} already exists, skipping...`
          );
          results.skipped++;
          continue;
        }

        if (!dryRun) {
          try {
            await addDoc(collection(db, COLLECTION_NAME), tour);
            console.log(`✅ Created tour: ${tour.name} (${tour.tourCode})`);
            results.created++;
          } catch (error) {
            const errorMsg = `Failed to create tour ${tour.name}: ${
              error instanceof Error ? error.message : "Unknown error"
            }`;
            console.error(`❌ ${errorMsg}`);
            results.errors.push(errorMsg);
          }
        } else {
          console.log(
            `🔍 [DRY RUN] Would create tour: ${tour.name} (${tour.tourCode})`
          );
          results.created++;
        }
      }
    } else {
      console.log(`📝 No existing tours found. Creating all initial tours...`);

      if (!dryRun) {
        for (const tour of initialTourPackages) {
          try {
            await addDoc(collection(db, COLLECTION_NAME), tour);
            console.log(`✅ Created tour: ${tour.name} (${tour.tourCode})`);
            results.created++;
          } catch (error) {
            const errorMsg = `Failed to create tour ${tour.name}: ${
              error instanceof Error ? error.message : "Unknown error"
            }`;
            console.error(`❌ ${errorMsg}`);
            results.errors.push(errorMsg);
          }
        }
      } else {
        console.log(
          `🔍 [DRY RUN] Would create ${initialTourPackages.length} tours`
        );
        results.created = initialTourPackages.length;
      }
    }

    const success = results.errors.length === 0;
    const message = dryRun
      ? `Migration dry run completed. Would create ${results.created} tours, skip ${results.skipped}.`
      : `Migration completed successfully. Created ${results.created} tours, skipped ${results.skipped}.`;

    console.log(
      `🎯 Migration ${success ? "SUCCESS" : "COMPLETED WITH ERRORS"}`
    );
    console.log(
      `📊 Results: ${results.created} created, ${results.skipped} skipped, ${results.errors.length} errors`
    );

    return {
      success,
      message,
      details: results,
    };
  } catch (error) {
    const errorMsg = `Migration failed: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    console.error(`❌ ${errorMsg}`);
    return {
      success: false,
      message: errorMsg,
    };
  }
}

export async function rollbackMigration(): Promise<{
  success: boolean;
  message: string;
  details?: {
    deleted: number;
    errors: string[];
  };
}> {
  console.log(`🔄 Rolling back migration: ${MIGRATION_ID}`);

  const results = {
    deleted: 0,
    errors: [] as string[],
  };

  try {
    // Find and delete tours created by this migration
    const tourCodes = initialTourPackages.map((tour) => tour.tourCode);

    for (const tourCode of tourCodes) {
      const tourQuery = query(
        collection(db, COLLECTION_NAME),
        where("tourCode", "==", tourCode)
      );
      const tourDocs = await getDocs(tourQuery);

      for (const doc of tourDocs.docs) {
        try {
          await deleteDoc(doc.ref);
          console.log(`🗑️  Deleted tour: ${doc.data().name} (${tourCode})`);
          results.deleted++;
        } catch (error) {
          const errorMsg = `Failed to delete tour ${tourCode}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`;
          console.error(`❌ ${errorMsg}`);
          results.errors.push(errorMsg);
        }
      }
    }

    const success = results.errors.length === 0;
    const message = `Rollback ${
      success ? "completed successfully" : "completed with errors"
    }. Deleted ${results.deleted} tours.`;

    console.log(`🎯 Rollback ${success ? "SUCCESS" : "COMPLETED WITH ERRORS"}`);
    console.log(
      `📊 Results: ${results.deleted} deleted, ${results.errors.length} errors`
    );

    return {
      success,
      message,
      details: results,
    };
  } catch (error) {
    const errorMsg = `Rollback failed: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    console.error(`❌ ${errorMsg}`);
    return {
      success: false,
      message: errorMsg,
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  id: MIGRATION_ID,
  name: "Initial Tour Packages",
  description:
    "Populate tours collection with first 4 tour packages from master table",
  run: runMigration,
  rollback: rollbackMigration,
  data: initialTourPackages,
};
