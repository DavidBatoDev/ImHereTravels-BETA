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

const MIGRATION_ID = "031-import-tour-packages";
const COLLECTION_NAME = "tourPackages";

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
  if (Array.isArray(input)) return input.map((i) => reviveTimestamps(i));
  if (input && typeof input === "object") {
    const ts = isTimestampLike(input);
    if (ts)
      return Timestamp.fromMillis(
        ts.seconds * 1000 + ts.nanoseconds / 1_000_000
      );
    const out: AnyRecord = {};
    for (const [k, v] of Object.entries(input)) out[k] = reviveTimestamps(v);
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
    .filter((f) => f.startsWith("tour-packages-") && f.endsWith(".json"))
    .map((f) => path.join(exportsDir, f));
  if (files.length === 0) {
    throw new Error(
      `No tour-packages-*.json export file found in ${exportsDir}. Run npm run log-tour-packages first.`
    );
  }
  files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return files[0];
}

export async function runMigration(dryRun = false) {
  console.log(`\n🚀 Running ${MIGRATION_ID}`);
  const filePath = getLatestExportFile();
  console.log(`📄 Using export file: ${filePath}`);
  const raw = fs.readFileSync(filePath, "utf-8");
  const entries = JSON.parse(raw);
  if (!Array.isArray(entries))
    throw new Error("Invalid export format: expected an array.");

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

  let created = 0,
    skipped = 0,
    errors = 0,
    ops = 0;
  let batch = writeBatch(db);
  for (const entry of entries) {
    try {
      const id: string | undefined =
        entry?.id || entry?.tourCode || entry?.name;
      if (!id) {
        skipped++;
        continue;
      }
      const data = { ...entry } as AnyRecord;
      data.id = id;
      const revived = reviveTimestamps(data);
      const ref = doc(db, COLLECTION_NAME, id);
      batch.set(ref, revived, { merge: true });
      ops++;
      created++;
      if (ops % 450 === 0) {
        await batch.commit();
        batch = writeBatch(db);
      }
    } catch (e) {
      console.error(`❌ Failed processing entry:`, e);
      errors++;
    }
  }
  if (ops % 450 !== 0) await batch.commit();
  return {
    message: `✅ ${MIGRATION_ID} completed: ${created} upserts, ${skipped} skipped, ${errors} errors`,
    details: { created, updated: 0, skipped, errors, fileUsed: filePath },
  };
}

export async function rollbackMigration(): Promise<void> {
  console.log(`\n↩️ Rolling back ${MIGRATION_ID}`);
  const filePath = getLatestExportFile();
  const entries = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  if (!Array.isArray(entries)) return;
  for (const entry of entries) {
    const id: string | undefined = entry?.id || entry?.tourCode || entry?.name;
    if (!id) continue;
    const ref = doc(db, COLLECTION_NAME, id);
    await setDoc(
      ref,
      { _rolledBackBy: MIGRATION_ID, _rolledBackAt: new Date() },
      { merge: true }
    );
  }
  console.log("Rollback marker set on imported documents.");
}
