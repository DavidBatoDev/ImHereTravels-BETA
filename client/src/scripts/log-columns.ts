#!/usr/bin/env tsx

/**
 * Script to generate a JSON file with all columns in the booking sheet from Firebase
 *
 * Usage:
 *   npm run log-columns
 *   or
 *   npx tsx src/scripts/log-columns.ts
 */

import { ColumnLogger } from "../utils/column-logger";
import { SheetColumn } from "../types/sheet-management";
import { writeFileSync } from "fs";
import { join } from "path";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../migrations/firebase-config";

console.log("🚀 Starting column JSON generation from Firebase...");

// Fetch columns from Firebase
async function fetchColumnsFromFirebase(): Promise<SheetColumn[]> {
  try {
    console.log("📡 Fetching columns from Firebase...");
    const columnsRef = collection(db, "bookingSheetColumns");
    const snapshot = await getDocs(columnsRef);
    
    if (snapshot.empty) {
      console.log("❌ No columns found in Firebase");
      return [];
    }

    const columns: SheetColumn[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      columns.push({
        id: doc.id,
        ...data,
      } as SheetColumn);
    });

    console.log(`✅ Fetched ${columns.length} columns from Firebase`);
    return columns;
  } catch (error) {
    console.error("❌ Error fetching columns from Firebase:", error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    // Fetch columns from Firebase
    const columns = await fetchColumnsFromFirebase();
    
    if (columns.length === 0) {
      console.log("❌ No columns to export");
      return;
    }

    // Export columns data in JSON format
    const exportedData = ColumnLogger.exportColumns(columns);

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `booking-columns-${timestamp}.json`;

    // Write to exports directory
    const outputPath = join(process.cwd(), 'exports', filename);

    // Ensure exports directory exists
    const fs = require('fs');
    const exportsDir = join(process.cwd(), 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    // Write JSON file
    writeFileSync(outputPath, JSON.stringify(exportedData, null, 2));
    
    console.log(`✅ JSON file generated successfully!`);
    console.log(`📁 File: ${filename}`);
    console.log(`📍 Path: ${outputPath}`);
    console.log(`📊 Columns: ${exportedData.totalColumns}`);
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
