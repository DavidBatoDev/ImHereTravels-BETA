#!/usr/bin/env tsx

/**
 * Script to generate a JSON file with all email templates from Firebase
 *
 * Usage:
 *   npm run log-email-templates
 *   or
 *   npx tsx src/scripts/log-email-templates.ts
 */

import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../migrations/firebase-config";

console.log("🚀 Starting emailTemplates collection export...");

// Fetch all documents from Firebase collection
async function fetchEmailTemplates(): Promise<any[]> {
  try {
    console.log("📡 Fetching documents from emailTemplates collection...");
    const templatesRef = collection(db, "emailTemplates");
    const snapshot = await getDocs(templatesRef);

    if (snapshot.empty) {
      console.log("❌ No documents found in emailTemplates collection");
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
    const documents = await fetchEmailTemplates();

    if (documents.length === 0) {
      console.log("❌ No documents to export");
      return;
    }

    // Sort by template name or document ID
    documents.sort((a, b) => {
      if (a.name && b.name) {
        return a.name.localeCompare(b.name);
      }
      return a.id.localeCompare(b.id);
    });

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `email-templates-${timestamp}.json`;

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
    console.log("\n📋 Exported Email Templates Summary:");
    documents.forEach((doc, index) => {
      const name = doc.name || "No name";
      const status = doc.status || "No status";
      const createdBy = doc.metadata?.createdBy || "Unknown";
      console.log(
        `${index + 1}. ${name} | Status: ${status} | Created by: ${createdBy}`
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
