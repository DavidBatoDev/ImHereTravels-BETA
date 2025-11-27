#!/usr/bin/env tsx

/**
 * Script to generate a JSON file with all documents from the `config` collection
 *
 * Usage:
 *   npx tsx src/scripts/log-config.ts
 */

import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../migrations/firebase-config";

console.log("🚀 Starting `config` collection export...");

async function fetchConfigDocs(): Promise<any[]> {
  try {
    console.log("📡 Fetching documents from `config` collection...");
    const ref = collection(db, "config");
    const snapshot = await getDocs(ref);

    if (snapshot.empty) {
      console.log("❌ No documents found in `config` collection");
      return [];
    }

    const documents: any[] = [];
    snapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...doc.data() });
    });

    console.log(`✅ Fetched ${documents.length} documents from Firebase`);
    return documents;
  } catch (error) {
    console.error("❌ Error fetching documents from Firebase:", error);
    throw error;
  }
}

async function main() {
  try {
    const documents = await fetchConfigDocs();
    if (documents.length === 0) {
      console.log("❌ No documents to export");
      return;
    }

    // Sort by document id for stable output
    documents.sort((a, b) => (a.id || "").localeCompare(b.id || ""));

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `config-${timestamp}.json`;

    const exportsDir = join(process.cwd(), "exports", "export-dev");
    if (!existsSync(exportsDir)) {
      mkdirSync(exportsDir, { recursive: true });
    }

    const outputPath = join(exportsDir, filename);
    writeFileSync(outputPath, JSON.stringify(documents, null, 2));

    console.log(`✅ JSON export completed successfully!`);
    console.log(`📁 File: ${filename}`);
    console.log(`📍 Path: ${outputPath}`);
    console.log(`📊 Total documents: ${documents.length}`);
  } catch (error) {
    console.error("❌ Error generating JSON file:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});
