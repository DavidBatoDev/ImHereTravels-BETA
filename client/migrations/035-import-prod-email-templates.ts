import fs from "fs";
import path from "path";
import {
  collection,
  doc,
  getDocs,
  writeBatch,
  Timestamp,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./firebase-config";

const MIGRATION_ID = "035-import-prod-email-templates";
const COLLECTION_NAME = "emailTemplates";

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
  if (
    value &&
    typeof value === "object" &&
    "_seconds" in value &&
    "_nanoseconds" in value
  ) {
    return { seconds: value._seconds, nanoseconds: value._nanoseconds };
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

function getProdExportFile(): string {
  const exportsDir = path.join(process.cwd(), "exports", "export-dev");
  const fileName = "emailTemplates-2025-11-23T15-53-28-433Z.json";
  const filePath = path.join(exportsDir, fileName);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Dev export file not found: ${filePath}`);
  }

  return filePath;
}

export async function runMigration(dryRun = false) {
  console.log(`\n🚀 Running ${MIGRATION_ID}`);
  console.log(
    `📋 This migration will replace all emailTemplates with dev backup data`
  );

  const filePath = getProdExportFile();
  console.log(`📄 Using dev export file: ${filePath}`);

  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw);
  const entries = Array.isArray(parsed)
    ? parsed
    : parsed.templates || parsed.data || [];

  if (!Array.isArray(entries)) {
    throw new Error("Invalid export format: expected an array.");
  }

  // Get existing documents
  const existingSnapshot = await getDocs(collection(db, COLLECTION_NAME));
  const existingIds = new Set(existingSnapshot.docs.map((doc) => doc.id));

  console.log(
    `📊 Found ${existingSnapshot.size} existing documents in ${COLLECTION_NAME}`
  );
  console.log(`📥 Will import ${entries.length} documents from dev backup`);

  if (dryRun) {
    console.log(`\n🧪 DRY RUN - No changes will be made`);
    console.log(`Would delete ${existingSnapshot.size} existing documents`);
    console.log(`Would create ${entries.length} new documents from dev backup`);

    console.log(`\n📋 Documents to import:`);
    entries.forEach((entry: any, index: number) => {
      const id = entry?.id;
      const name = entry?.data?.name || entry?.name || "Unknown";
      console.log(`  ${index + 1}. ${id} - ${name}`);
    });

    return {
      message: `Dry-run complete for ${MIGRATION_ID}`,
      details: {
        toDelete: existingSnapshot.size,
        toCreate: entries.length,
        fileUsed: filePath,
      },
    };
  }

  console.log(`\n🗑️ Deleting ${existingSnapshot.size} existing documents...`);

  // Delete all existing documents
  let batch = writeBatch(db);
  let ops = 0;

  for (const docSnap of existingSnapshot.docs) {
    batch.delete(docSnap.ref);
    ops++;

    if (ops % 450 === 0) {
      await batch.commit();
      batch = writeBatch(db);
      console.log(`   Deleted ${ops} documents...`);
    }
  }

  if (ops % 450 !== 0) {
    await batch.commit();
  }

  console.log(`✅ Deleted ${ops} existing documents`);
  console.log(`\n📥 Importing ${entries.length} documents from dev backup...`);

  let created = 0;
  let errors = 0;
  batch = writeBatch(db);
  ops = 0;

  for (const entry of entries) {
    try {
      const id: string | undefined = entry?.id;
      if (!id) {
        console.warn(`⚠️ Skipping entry without ID:`, entry);
        continue;
      }

      // Extract data from the nested structure
      const data = entry?.data || entry;
      const revived = reviveTimestamps(data);

      const ref = doc(db, COLLECTION_NAME, id);
      batch.set(ref, revived);
      ops++;
      created++;

      if (ops % 450 === 0) {
        await batch.commit();
        batch = writeBatch(db);
        console.log(`   Imported ${ops} documents...`);
      }
    } catch (e) {
      console.error(`❌ Failed processing entry:`, e);
      errors++;
    }
  }

  if (ops % 450 !== 0) {
    await batch.commit();
  }

  console.log(`\n✅ Migration complete!`);
  console.log(`   Created: ${created}`);
  console.log(`   Errors: ${errors}`);

  return {
    message: `✅ ${MIGRATION_ID} completed: ${created} created, ${errors} errors`,
    details: {
      deleted: existingSnapshot.size,
      created,
      errors,
      fileUsed: filePath,
    },
  };
}

export async function rollbackMigration(): Promise<void> {
  console.log(`\n↩️ Rolling back ${MIGRATION_ID}`);
  console.log(
    `⚠️ Rollback not implemented - please restore from production backup if needed`
  );
  console.log(
    `💡 Production backup location: exports/export-prod/emailTemplates-2025-11-13T12-41-34-817Z.json`
  );
}
