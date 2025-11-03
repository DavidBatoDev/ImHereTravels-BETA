/**
 * Export booking columns from Firestore to JSON file
 *
 * Usage:
 *   npx tsx export-booking-columns.ts
 *
 * This will export all columns from the bookingSheetColumns collection
 * to a timestamped JSON file in the exports folder.
 */

import {
  collection,
  getDocs,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import fs from "fs";
import path from "path";
import { db } from "./firebase-config";

const COLLECTION_NAME = "bookingSheetColumns";

/**
 * Serialize Firestore Timestamps to a format that can be revived
 */
function serializeTimestamps(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj instanceof Timestamp) {
    return {
      type: "firestore/timestamp/1.0",
      seconds: obj.seconds,
      nanoseconds: obj.nanoseconds,
    };
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeTimestamps);
  }

  if (typeof obj === "object") {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeTimestamps(value);
    }
    return result;
  }

  return obj;
}

async function exportBookingColumns(): Promise<void> {
  console.log(`\n🚀 Exporting booking columns from Firestore`);
  console.log(`📦 Source collection: ${COLLECTION_NAME}`);

  try {
    // Get all columns ordered by order field
    const collectionRef = collection(db, COLLECTION_NAME);
    const q = query(collectionRef, orderBy("order", "asc"));
    const querySnapshot = await getDocs(q);

    const columns = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      // Include the document ID as 'id' field if not present
      if (!data.id) {
        data.id = doc.id;
      }
      return data;
    });

    console.log(`📊 Found ${columns.length} columns`);

    // Serialize timestamps
    const serializedColumns = serializeTimestamps(columns);

    // Create exports directory if it doesn't exist
    const exportsDir = path.join(__dirname, "..", "exports");
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    // Generate filename with timestamp
    const timestamp = new Date()
      .toISOString()
      .replace(/:/g, "-")
      .replace(/\..+/, "");
    const filename = `booking-columns-${timestamp}.json`;
    const filepath = path.join(exportsDir, filename);

    // Write to file with pretty formatting
    fs.writeFileSync(
      filepath,
      JSON.stringify(serializedColumns, null, 2),
      "utf-8"
    );

    console.log(`✅ Successfully exported ${columns.length} columns`);
    console.log(`📄 File: ${filename}`);
    console.log(`📍 Full path: ${filepath}`);
  } catch (error) {
    console.error(`❌ Export failed:`, error);
    throw error;
  }
}

// Run the export
exportBookingColumns()
  .then(() => {
    console.log("\n✨ Export complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Export failed:", error);
    process.exit(1);
  });
