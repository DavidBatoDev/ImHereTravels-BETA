import fs from "fs";
import path from "path";
import {
  collection,
  doc,
  getDocs,
  writeBatch,
  Timestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase-config";

const MIGRATION_ID = "034-import-booking-columns";
const COLLECTION_NAME = "bookingSheetColumns";

type AnyRecord = Record<string, any>;

/**
 * Check if a value is a Firestore timestamp-like object
 */
function isTimestampLike(
  value: any
): { seconds: number; nanoseconds: number } | undefined {
  if (
    value &&
    typeof value === "object" &&
    typeof value.seconds === "number" &&
    typeof value.nanoseconds === "number"
  ) {
    return { seconds: value.seconds, nanoseconds: value.nanoseconds };
  }
  if (
    value &&
    typeof value === "object" &&
    value.type === "firestore/timestamp/1.0" &&
    typeof value.seconds === "number" &&
    typeof value.nanoseconds === "number"
  ) {
    return { seconds: value.seconds, nanoseconds: value.nanoseconds };
  }
  return undefined;
}

/**
 * Remove undefined values from objects and arrays.
 * Firestore doesn't allow undefined values.
 */
function cleanUndefinedValues(input: any): any {
  if (input === undefined || input === null) {
    return null;
  }
  if (Array.isArray(input)) {
    return input
      .map((item) => cleanUndefinedValues(item))
      .filter((v) => v !== undefined);
  }
  if (input && typeof input === "object") {
    const out: AnyRecord = {};
    for (const [k, v] of Object.entries(input)) {
      if (v !== undefined) {
        out[k] = cleanUndefinedValues(v);
      }
    }
    return out;
  }
  return input;
}

/**
 * Recursively revive timestamp objects from JSON
 */
function reviveTimestamps(input: any): any {
  if (Array.isArray(input)) {
    return input.map((item) => reviveTimestamps(item));
  }
  if (input && typeof input === "object") {
    const ts = isTimestampLike(input);
    if (ts) {
      return Timestamp.fromMillis(
        ts.seconds * 1000 + ts.nanoseconds / 1_000_000
      );
    }
    const out: AnyRecord = {};
    for (const [k, v] of Object.entries(input)) {
      out[k] = reviveTimestamps(v);
    }
    return out;
  }
  return input;
}

/**
 * Get the latest booking-columns export file
 */
function getLatestExportFile(): string {
  // Go up one level from migrations directory to client, then into exports
  const exportsDir = path.join(__dirname, "..", "exports");
  if (!fs.existsSync(exportsDir)) {
    throw new Error(`Exports directory not found: ${exportsDir}`);
  }
  const files = fs
    .readdirSync(exportsDir)
    .filter((f) => f.startsWith("booking-columns-") && f.endsWith(".json"))
    .map((f) => path.join(exportsDir, f));
  if (files.length === 0) {
    throw new Error(
      `No booking-columns-*.json export file found in ${exportsDir}. Please ensure the export file exists.`
    );
  }
  // Sort by modification time (newest first)
  files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return files[0];
}

export async function runMigration(dryRun = false): Promise<{
  message: string;
  details?: {
    created: number;
    updated: number;
    skipped: number;
    errors: number;
    fileUsed: string;
  };
}> {
  console.log(`\n🚀 Running ${MIGRATION_ID}`);
  console.log(`📦 Target collection: ${COLLECTION_NAME}`);
  console.log(`🔧 Dry run: ${dryRun ? "YES" : "NO"}`);

  const filePath = getLatestExportFile();
  console.log(`📄 Using export file: ${path.basename(filePath)}`);
  console.log(`📍 Full path: ${filePath}`);

  // Read and parse the export file
  const raw = fs.readFileSync(filePath, "utf-8");
  let entries: any[];
  try {
    const parsed = JSON.parse(raw);
    // Support both flat arrays and wrapped objects with .columns
    entries = Array.isArray(parsed) ? parsed : parsed.columns;
  } catch (e) {
    throw new Error(`Failed to parse JSON: ${e}`);
  }

  if (!Array.isArray(entries)) {
    throw new Error(
      "Export file must contain an array of columns or { columns: [...] }"
    );
  }

  console.log(`📊 Found ${entries.length} columns in export file`);

  // Revive timestamps and clean undefined values
  const revivedEntries = reviveTimestamps(entries);
  const cleanedEntries = cleanUndefinedValues(revivedEntries);

  // Get existing columns from Firestore
  const collectionRef = collection(db, COLLECTION_NAME);
  const existingSnap = await getDocs(collectionRef);
  const existingMap = new Map<string, any>();
  existingSnap.forEach((docSnap) => {
    existingMap.set(docSnap.id, docSnap.data());
  });

  console.log(`📚 Found ${existingMap.size} existing columns in Firestore`);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  // Process in batches (Firestore batch limit is 500)
  const batchSize = 500;
  for (let i = 0; i < cleanedEntries.length; i += batchSize) {
    const batch = writeBatch(db);
    const batchEntries = cleanedEntries.slice(i, i + batchSize);

    for (const entry of batchEntries) {
      if (!entry.id) {
        console.warn(`⚠️  Skipping entry without id:`, entry.columnName);
        skipped++;
        continue;
      }

      const docRef = doc(collectionRef, entry.id);
      const exists = existingMap.has(entry.id);

      try {
        if (dryRun) {
          if (exists) {
            console.log(
              `[DRY RUN] Would update: ${entry.id} (${entry.columnName})`
            );
            updated++;
          } else {
            console.log(
              `[DRY RUN] Would create: ${entry.id} (${entry.columnName})`
            );
            created++;
          }
        } else {
          // Keep the id field in the document since getColumn() queries by it
          batch.set(docRef, entry, { merge: true });

          if (exists) {
            updated++;
          } else {
            created++;
          }
        }
      } catch (error) {
        console.error(`❌ Error processing ${entry.id}:`, error);
        errors++;
      }
    }

    if (!dryRun) {
      try {
        await batch.commit();
        console.log(
          `✅ Batch ${Math.floor(i / batchSize) + 1} committed (${
            batchEntries.length
          } columns)`
        );
      } catch (error) {
        console.error(`❌ Failed to commit batch:`, error);
        errors += batchEntries.length;
      }
    }
  }

  const summary = {
    created,
    updated,
    skipped,
    errors,
    fileUsed: path.basename(filePath),
  };

  console.log("\n📊 Migration Summary:");
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   File: ${summary.fileUsed}`);

  if (dryRun) {
    return {
      message: `[DRY RUN] Would import ${created + updated} columns from ${
        summary.fileUsed
      }`,
      details: summary,
    };
  }

  if (errors > 0) {
    return {
      message: `⚠️  Migration completed with ${errors} error(s). Imported ${
        created + updated
      } columns.`,
      details: summary,
    };
  }

  return {
    message: `✅ Successfully imported ${
      created + updated
    } booking columns from ${summary.fileUsed}`,
    details: summary,
  };
}

// Allow direct execution
if (require.main === module) {
  const dryRun = process.argv.includes("--dry-run");

  runMigration(dryRun)
    .then((result) => {
      console.log(`\n${result.message}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Migration failed:", error);
      process.exit(1);
    });
}
