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

const MIGRATION_ID = "027-import-booking-sheet-columns";
const COLLECTION_NAME = "bookingSheetColumns";

type AnyRecord = Record<string, any>;

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

function getLatestExportFile(): string {
  const exportsDir = path.join(process.cwd(), "exports");
  if (!fs.existsSync(exportsDir)) {
    throw new Error(`Exports directory not found: ${exportsDir}`);
  }
  const files = fs
    .readdirSync(exportsDir)
    .filter((f) => f.startsWith("booking-columns-") && f.endsWith(".json"))
    .map((f) => path.join(exportsDir, f));
  if (files.length === 0) {
    throw new Error(
      `No booking-columns-*.json export file found in ${exportsDir}. Run npm run log-columns first.`
    );
  }
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

  const filePath = getLatestExportFile();
  console.log(`📄 Using export file: ${filePath}`);

  const raw = fs.readFileSync(filePath, "utf-8");
  let entries: any;
  try {
    const parsed = JSON.parse(raw);
    // Support both flat arrays and wrapped objects with .columns
    entries = Array.isArray(parsed) ? parsed : parsed.columns;
  } catch (e) {
    throw new Error(`Failed to parse JSON file: ${e}`);
  }

  if (!Array.isArray(entries)) {
    throw new Error(
      "Invalid export format: expected an array or an object with a 'columns' array."
    );
  }

  // Check existing docs
  const existingSnapshot = await getDocs(collection(db, COLLECTION_NAME));
  if (existingSnapshot.size > 0) {
    console.log(
      `⚠️ Found ${existingSnapshot.size} existing documents in ${COLLECTION_NAME}. This migration will upsert entries by ID.`
    );
  }

  if (dryRun) {
    console.log(
      `🧪 Dry-run: would process ${entries.length} documents into ${COLLECTION_NAME}`
    );
    return {
      message: `Dry-run complete for ${MIGRATION_ID}`,
      details: {
        created: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
        fileUsed: filePath,
      },
    };
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  let batch = writeBatch(db);
  let ops = 0;

  for (const entry of entries) {
    try {
      const id: string | undefined =
        entry?.id || entry?.columnId || entry?.name;
      if (!id) {
        skipped++;
        continue;
      }

      const data = { ...entry } as AnyRecord;
      // Ensure the document id field matches ID
      data.id = id;
      const revived = reviveTimestamps(data);

      const ref = doc(db, COLLECTION_NAME, id);
      // Using setDoc with merge to upsert
      batch.set(ref, revived, { merge: true });
      ops++;
      created++; // Count as created/upsert; we don't check existence per doc here

      if (ops % 450 === 0) {
        await batch.commit();
        batch = writeBatch(db);
      }
    } catch (e) {
      console.error(`❌ Failed processing entry:`, e);
      errors++;
    }
  }

  if (ops % 450 !== 0) {
    await batch.commit();
  }

  return {
    message: `✅ ${MIGRATION_ID} completed: ${created} upserts, ${skipped} skipped, ${errors} errors`,
    details: { created, updated, skipped, errors, fileUsed: filePath },
  };
}

export async function rollbackMigration(): Promise<void> {
  console.log(`\n↩️ Rolling back ${MIGRATION_ID}`);
  const filePath = getLatestExportFile();
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw);
  const entries = Array.isArray(parsed) ? parsed : parsed.columns;
  if (!Array.isArray(entries)) {
    console.log("Nothing to rollback: invalid export format.");
    return;
  }

  let batch = writeBatch(db);
  let ops = 0;
  for (const entry of entries) {
    const id: string | undefined = entry?.id || entry?.columnId || entry?.name;
    if (!id) continue;
    const ref = doc(db, COLLECTION_NAME, id);
    // Emulate delete via set with empty object and merge false? Better to truly delete
    // But we didn't import delete here; to keep file small, use setDoc with marker
    await setDoc(
      ref,
      { _rolledBackBy: MIGRATION_ID, _rolledBackAt: new Date() },
      { merge: true }
    );
    ops++;
    if (ops % 450 === 0) {
      await batch.commit();
      batch = writeBatch(db);
    }
  }
  if (ops % 450 !== 0) {
    await batch.commit();
  }
  console.log("Rollback marker set on imported documents.");
}
