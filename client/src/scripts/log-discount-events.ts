#!/usr/bin/env tsx

/**
 * Script to export all documents from the discountEvents collection as JSON
 * Returns all fields from each document using spread operator
 *
 * Usage:
 *   npm run log-discount-events
 *   or
 *   npx tsx src/scripts/log-discount-events.ts
 */

import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../migrations/firebase-config";

console.log("🚀 Starting discountEvents collection export...");

// Fetch all documents from Firebase collection
async function fetchDiscountEvents(): Promise<any[]> {
  try {
    console.log("📡 Fetching documents from discountEvents collection...");
    const eventsRef = collection(db, "discountEvents");
    const snapshot = await getDocs(eventsRef);

    if (snapshot.empty) {
      console.log("❌ No documents found in discountEvents collection");
      return [];
    }

    const documents: any[] = [];
    snapshot.forEach((doc) => {
      // Use spread operator to export all fields from the document
      const documentData = {
        id: doc.id,
        data: doc.data(),
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
    const documents = await fetchDiscountEvents();

    if (documents.length === 0) {
      console.log("❌ No documents to export");
      return;
    }

    // Sort by event name or document ID
    documents.sort((a, b) => {
      if (a.data?.name && b.data?.name) {
        return a.data.name.localeCompare(b.data.name);
      }
      return a.id.localeCompare(b.id);
    });

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `discountEvents-${timestamp}.json`;

    // Write to export-dev directory
    const outputPath = join(process.cwd(), "exports", "export-dev", filename);

    // Ensure export-dev directory exists
    const exportsDir = join(process.cwd(), "exports", "export-dev");
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
    console.log("\n📋 Exported Discount Events Summary:");
    documents.forEach((doc, index) => {
      const name = doc.data?.name || "No name";
      const status = doc.data?.status || "No status";
      const discountType = doc.data?.discountType || "Unknown";
      console.log(
        `${index + 1}. ${name} | Type: ${discountType} | Status: ${status}`
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
