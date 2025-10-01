#!/usr/bin/env tsx

/**
 * Script to export all documents from the bookings collection as JSON
 * Returns all fields from each document using spread operator
 *
 * Usage:
 *   npm run log-bookings
 *   or
 *   npx tsx src/scripts/log-bookings.ts
 */

import { writeFileSync } from "fs";
import { join } from "path";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../migrations/firebase-config";

console.log("🚀 Starting bookings collection export...");

// Fetch all documents from Firebase collection
async function fetchBookings(): Promise<any[]> {
  try {
    console.log("📡 Fetching documents from bookings collection...");
    const bookingsRef = collection(db, "bookings");
    const snapshot = await getDocs(bookingsRef);

    if (snapshot.empty) {
      console.log("❌ No documents found in bookings collection");
      return [];
    }

    const documents: any[] = [];
    snapshot.forEach((doc) => {
      // Use spread operator to export all fields from the document
      const documentData = {
        id: doc.id,
        ...doc.data(),
      };
      documents.push(documentData);
    });

    console.log(`✅ Fetched ${documents.length} documents from Firebase`);
    return documents;
  } catch (error) {
    console.error("❌ Error fetching documents from Firebase:", error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    // Fetch all documents from Firebase
    const documents = await fetchBookings();

    if (documents.length === 0) {
      console.log("❌ No documents to export");
      return;
    }

    // Sort by booking ID or document ID
    documents.sort((a, b) => {
      if (a.bookingId !== undefined && b.bookingId !== undefined) {
        return a.bookingId.localeCompare(b.bookingId);
      }
      return a.id.localeCompare(b.id);
    });

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `bookings-${timestamp}.json`;

    // Write to exports directory
    const outputPath = join(process.cwd(), "exports", filename);

    // Ensure exports directory exists
    const fs = require("fs");
    const exportsDir = join(process.cwd(), "exports");
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    // Write JSON file with all document data
    writeFileSync(outputPath, JSON.stringify(documents, null, 2));

    console.log(`✅ JSON export completed successfully!`);
    console.log(`📁 File: ${filename}`);
    console.log(`📍 Path: ${outputPath}`);
    console.log(`📊 Total documents: ${documents.length}`);

    // Display summary of exported documents
    console.log("\n📋 Exported Bookings Summary:");
    documents.forEach((doc, index) => {
      const bookingId = doc.bookingId || doc.id;
      const fullName =
        doc.fullName ||
        `${doc.firstName || ""} ${doc.lastName || ""}`.trim() ||
        "No name";
      const tourName = doc.tourPackageName || "No tour";
      const status = doc.bookingStatus || "No status";
      const tourDate = doc.tourDate || "No date";

      console.log(
        `${
          index + 1
        }. ${bookingId} - ${fullName} | ${tourName} | ${status} | ${tourDate}`
      );
    });
  } catch (error) {
    console.error("❌ Error generating JSON file:", error);
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});
