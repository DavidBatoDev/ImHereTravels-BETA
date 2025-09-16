#!/usr/bin/env tsx

/**
 * Script to fetch all tour packages and export tour names and codes as JSON
 *
 * This script will:
 * - Fetch all tour packages from Firestore
 * - Export only tour name and tour code to: exports/tour-packages-{timestamp}.json
 * - Display field completeness analysis
 *
 * Usage:
 *   npx tsx src/scripts/get-all-tour-packages.ts
 */

import { config } from "dotenv";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { TourPackage, TravelDate } from "../types/tours";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

// Load environment variables
config({ path: ".env.local" });

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const TOURS_COLLECTION = "tourPackages";

async function getAllTourPackages(): Promise<void> {
  try {
    console.log("🏖️ Fetching all tour packages...");

    const querySnapshot = await getDocs(collection(db, TOURS_COLLECTION));
    const tours: TourPackage[] = [];

    querySnapshot.forEach((doc) => {
      const tourData = { id: doc.id, ...doc.data() } as TourPackage;
      tours.push(tourData);
    });

    console.log(`📊 Found ${tours.length} tour packages`);
    console.log("=".repeat(60));

    // Create simple export data with name, tour code, and duration
    const simpleToursData = tours.map((tour) => ({
      name: tour.name,
      tourCode: tour.tourCode,
      duration: tour.duration,
    }));

    // Save to JSON file
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `tour-packages-${timestamp}.json`;
    const outputDir = join(process.cwd(), "exports");

    // Create exports directory if it doesn't exist
    try {
      mkdirSync(outputDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, ignore error
    }

    const filepath = join(outputDir, filename);

    // Write the JSON file
    writeFileSync(filepath, JSON.stringify(simpleToursData, null, 2), "utf8");

    console.log("=".repeat(60));
    console.log("✅ Tour packages exported successfully!");
    console.log(`📁 File saved: ${filepath}`);
    console.log(`📊 Total tours exported: ${tours.length}`);
    console.log(
      `💾 File size: ${(JSON.stringify(simpleToursData).length / 1024).toFixed(
        2
      )} KB`
    );

    // Also log a detailed field analysis
    console.log("\n📈 TOUR PACKAGES SUMMARY:");
    tours.forEach((tour, index) => {
      console.log(`${index + 1}. ${tour.name} (${tour.tourCode})`);
      console.log(`   Location: ${tour.location}`);
      console.log(`   Duration: ${tour.duration} days`);
      console.log(`   Status: ${tour.status}`);
      console.log(
        `   Price: ${tour.pricing.currency} ${tour.pricing.original}`
      );
      console.log(`   Travel Dates: ${tour.travelDates.length} available`);
      console.log(`   Description: ${tour.description.substring(0, 100)}...`);
      console.log(`   Highlights: ${tour.details.highlights.length} items`);
      console.log(`   Itinerary: ${tour.details.itinerary.length} days`);
      console.log(`   Requirements: ${tour.details.requirements.length} items`);
      console.log(
        `   Media: Cover=${tour.media.coverImage ? "Yes" : "No"}, Gallery=${
          tour.media.gallery.length
        } images`
      );
      console.log(
        `   Links: Brochure=${tour.brochureLink ? "Yes" : "No"}, Stripe=${
          tour.stripePaymentLink ? "Yes" : "No"
        }, PreDeparture=${tour.preDeparturePack ? "Yes" : "No"}`
      );
      console.log(
        `   Metadata: Created=${tour.metadata.createdAt}, Bookings=${tour.metadata.bookingsCount}`
      );
      console.log("");
    });

    // Field completeness analysis
    console.log("\n🔍 FIELD COMPLETENESS ANALYSIS:");
    const fieldStats = {
      "Basic Info": {
        id: tours.filter((t) => t.id).length,
        name: tours.filter((t) => t.name).length,
        slug: tours.filter((t) => t.slug).length,
        url: tours.filter((t) => t.url).length,
        tourCode: tours.filter((t) => t.tourCode).length,
        description: tours.filter((t) => t.description).length,
        location: tours.filter((t) => t.location).length,
        duration: tours.filter((t) => t.duration).length,
        status: tours.filter((t) => t.status).length,
      },
      "Travel & Pricing": {
        travelDates: tours.filter(
          (t) => t.travelDates && t.travelDates.length > 0
        ).length,
        "pricing.original": tours.filter((t) => t.pricing?.original).length,
        "pricing.deposit": tours.filter((t) => t.pricing?.deposit).length,
        "pricing.currency": tours.filter((t) => t.pricing?.currency).length,
        "pricing.discounted": tours.filter((t) => t.pricing?.discounted).length,
      },
      Details: {
        "details.highlights": tours.filter(
          (t) => t.details?.highlights && t.details.highlights.length > 0
        ).length,
        "details.itinerary": tours.filter(
          (t) => t.details?.itinerary && t.details.itinerary.length > 0
        ).length,
        "details.requirements": tours.filter(
          (t) => t.details?.requirements && t.details.requirements.length > 0
        ).length,
      },
      Media: {
        "media.coverImage": tours.filter((t) => t.media?.coverImage).length,
        "media.gallery": tours.filter(
          (t) => t.media?.gallery && t.media.gallery.length > 0
        ).length,
      },
      Links: {
        brochureLink: tours.filter((t) => t.brochureLink).length,
        stripePaymentLink: tours.filter((t) => t.stripePaymentLink).length,
        preDeparturePack: tours.filter((t) => t.preDeparturePack).length,
      },
      Metadata: {
        "metadata.createdAt": tours.filter((t) => t.metadata?.createdAt).length,
        "metadata.updatedAt": tours.filter((t) => t.metadata?.updatedAt).length,
        "metadata.createdBy": tours.filter((t) => t.metadata?.createdBy).length,
        "metadata.bookingsCount": tours.filter(
          (t) => typeof t.metadata?.bookingsCount === "number"
        ).length,
      },
      History: {
        pricingHistory: tours.filter(
          (t) => t.pricingHistory && t.pricingHistory.length > 0
        ).length,
      },
    };

    Object.entries(fieldStats).forEach(([category, fields]) => {
      console.log(`\n${category}:`);
      Object.entries(fields).forEach(([field, count]) => {
        const percentage = ((count / tours.length) * 100).toFixed(1);
        console.log(`  ${field}: ${count}/${tours.length} (${percentage}%)`);
      });
    });
  } catch (error) {
    console.error("❌ Error getting all tour packages:", error);
    throw new Error("Failed to fetch all tour packages");
  }
}

async function main() {
  try {
    console.log("🚀 Starting tour packages fetch...");
    await getAllTourPackages();
    console.log("🎉 Script completed successfully!");
  } catch (error) {
    console.error("❌ Script failed:", error);
    process.exit(1);
  }
}

main();
