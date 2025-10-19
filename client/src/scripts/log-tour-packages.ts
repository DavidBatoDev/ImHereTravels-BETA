#!/usr/bin/env tsx

/**
 * Script to export all documents from the tourPackages collection as JSON
 * Returns all fields from each document using spread operator
 *
 * Usage:
 *   npm run log-tour-packages
 *   or
 *   npx tsx src/scripts/log-tour-packages.ts
 */

import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../migrations/firebase-config";

console.log("🚀 Starting tourPackages collection export...");

// Fetch all documents from Firebase collection
async function fetchTourPackages(): Promise<any[]> {
  try {
    console.log("📡 Fetching documents from tourPackages collection...");
    const packagesRef = collection(db, "tourPackages");
    const snapshot = await getDocs(packagesRef);

    if (snapshot.empty) {
      console.log("❌ No documents found in tourPackages collection");
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
    const documents = await fetchTourPackages();

    if (documents.length === 0) {
      console.log("❌ No documents to export");
      return;
    }

    // Sort by name or document ID
    documents.sort((a, b) => {
      if (a.name && b.name) {
        return a.name.localeCompare(b.name);
      }
      return a.id.localeCompare(b.id);
    });

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `tour-packages-${timestamp}.json`;

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
    console.log("\n📋 Exported Tour Packages Summary:");
    documents.forEach((doc, index) => {
      const name = doc.name || "No name";
      const code = doc.tourCode || "No code";
      const status = doc.status || "No status";
      console.log(`${index + 1}. ${name} | Code: ${code} | Status: ${status}`);
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
