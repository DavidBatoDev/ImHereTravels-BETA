#!/usr/bin/env tsx

/**
 * Script to export all documents from the bookingSheetColumns collection as JSON
 * Returns all fields from each document using spread operator
 *
 * Usage:
 *   npm run log-columns
 *   or
 *   npx tsx src/scripts/log-columns.ts
 */

import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../migrations/firebase-config";

console.log("🚀 Starting bookingSheetColumns collection export...");

// Fetch all documents from Firebase collection
async function fetchBookingSheetColumns(): Promise<any[]> {
  try {
    console.log("📡 Fetching documents from bookingSheetColumns collection...");
    const columnsRef = collection(db, "bookingSheetColumns");
    const snapshot = await getDocs(columnsRef);

    if (snapshot.empty) {
      console.log("❌ No documents found in bookingSheetColumns collection");
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
    const documents = await fetchBookingSheetColumns();

    if (documents.length === 0) {
      console.log("❌ No documents to export");
      return;
    }

    // Sort by order field if it exists, otherwise by id
    documents.sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      return a.id.localeCompare(b.id);
    });

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `booking-columns-${timestamp}.json`;

    // Write to exports directory
    const outputPath = join(process.cwd(), "exports", filename);

    // Ensure exports directory exists
    const exportsDir = join(process.cwd(), "exports");
    if (!existsSync(exportsDir)) {
      mkdirSync(exportsDir, { recursive: true });
    }

    // Write JSON file with all document data
    writeFileSync(outputPath, JSON.stringify(documents, null, 2));

    console.log(`✅ JSON export completed successfully!`);
    console.log(`📁 File: ${filename}`);
    console.log(`📍 Path: ${outputPath}`);
    console.log(`📊 Total documents: ${documents.length}`);

    // Display summary of exported documents
    console.log("\n📋 Exported Documents Summary:");
    documents.forEach((doc, index) => {
      const name = doc.name || doc.columnName || "Unnamed";
      const type = doc.type || doc.dataType || "Unknown";
      const order =
        doc.order !== undefined ? `Order: ${doc.order}` : "No order";
      console.log(
        `${index + 1}. ${name} (ID: ${doc.id}) - Type: ${type}, ${order}`
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
