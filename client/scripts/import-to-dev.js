/**
 * Import all exported collections from export-prod to Dev Firebase
 * This script imports all JSON files from the export-prod folder
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Load service account from keys folder
const serviceAccountPath = path.join(
  __dirname,
  "..",
  "keys",
  "dev-project-service-account.json"
);

if (!fs.existsSync(serviceAccountPath)) {
  console.error(
    "❌ Error: Service account file not found at:",
    serviceAccountPath
  );
  console.error(
    "Please ensure dev-project-service-account.json exists in the keys folder"
  );
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

// Initialize Firebase Admin with dev credentials
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const db = admin.firestore();

// Directory containing the exported data
const exportDir = path.join(__dirname, "..", "exports", "export-prod");

// Get the latest export files
function getLatestExportFiles() {
  const files = fs.readdirSync(exportDir);

  // Group files by collection name
  const collections = {};

  files.forEach((file) => {
    if (file.startsWith("_export-summary") || !file.endsWith(".json")) {
      return;
    }

    // Extract collection name (everything before the timestamp)
    const match = file.match(/^(.+?)-\d{4}-\d{2}-\d{2}T[\d-]+Z\.json$/);
    if (match) {
      const collectionName = match[1];
      if (!collections[collectionName] || file > collections[collectionName]) {
        collections[collectionName] = file;
      }
    }
  });

  return collections;
}

/**
 * Import a single collection
 */
async function importCollection(collectionName, filename) {
  console.log(`\nImporting collection: ${collectionName}...`);

  try {
    const filepath = path.join(exportDir, filename);
    const data = JSON.parse(fs.readFileSync(filepath, "utf8"));

    if (data.length === 0) {
      console.log(`  ⚠️  Collection ${collectionName} is empty, skipping`);
      return { collection: collectionName, count: 0, status: "empty" };
    }

    console.log(`  📦 Found ${data.length} documents to import`);

    // Import documents in batches
    const batchSize = 500; // Firestore batch limit
    let importedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = db.batch();
      const batchData = data.slice(i, i + batchSize);

      batchData.forEach((doc) => {
        const docRef = db.collection(collectionName).doc(doc.id);
        batch.set(docRef, doc.data, { merge: true }); // Use merge to avoid overwriting
      });

      try {
        await batch.commit();
        importedCount += batchData.length;
        console.log(
          `  ✅ Imported batch ${
            Math.floor(i / batchSize) + 1
          }: ${importedCount}/${data.length} documents`
        );
      } catch (error) {
        errorCount += batchData.length;
        console.error(`  ❌ Error importing batch:`, error.message);
      }
    }

    console.log(
      `  ✅ Completed: ${importedCount} imported, ${errorCount} errors`
    );
    return {
      collection: collectionName,
      count: importedCount,
      errors: errorCount,
      status: errorCount > 0 ? "partial" : "success",
    };
  } catch (error) {
    console.error(`  ❌ Error importing ${collectionName}:`, error.message);
    return {
      collection: collectionName,
      count: 0,
      status: "error",
      error: error.message,
    };
  }
}

/**
 * Import all collections
 */
async function importAllCollections() {
  console.log("=".repeat(60));
  console.log("IMPORTING COLLECTIONS TO DEV FIREBASE");
  console.log("=".repeat(60));
  console.log(`Project ID: ${serviceAccount.project_id}`);
  console.log(`Source Directory: ${exportDir}`);
  console.log("=".repeat(60));

  const collections = getLatestExportFiles();
  const collectionNames = Object.keys(collections);

  console.log(`\nFound ${collectionNames.length} collections to import:`);
  collectionNames.forEach((name) => console.log(`  - ${name}`));

  console.log("\n" + "=".repeat(60));
  console.log("Starting import...");
  console.log("=".repeat(60));

  const results = [];

  for (const [collectionName, filename] of Object.entries(collections)) {
    const result = await importCollection(collectionName, filename);
    results.push(result);
  }

  // Create summary
  console.log("\n" + "=".repeat(60));
  console.log("IMPORT SUMMARY");
  console.log("=".repeat(60));

  const timestamp = new Date()
    .toISOString()
    .replace(/:/g, "-")
    .replace(/\./g, "-");
  const summary = {
    timestamp,
    projectId: serviceAccount.project_id,
    sourceDirectory: exportDir,
    totalCollections: collectionNames.length,
    successful: results.filter((r) => r.status === "success").length,
    partial: results.filter((r) => r.status === "partial").length,
    empty: results.filter((r) => r.status === "empty").length,
    errors: results.filter((r) => r.status === "error").length,
    totalDocuments: results.reduce((sum, r) => sum + r.count, 0),
    results,
  };

  results.forEach((result) => {
    const icon =
      result.status === "success"
        ? "✅"
        : result.status === "partial"
        ? "⚠️"
        : result.status === "empty"
        ? "⚠️"
        : "❌";
    const errorInfo = result.errors ? ` (${result.errors} errors)` : "";
    console.log(
      `${icon} ${result.collection}: ${result.count} documents imported${errorInfo} (${result.status})`
    );
  });

  console.log("\n" + "-".repeat(60));
  console.log(`Total Documents Imported: ${summary.totalDocuments}`);
  console.log(
    `Successful: ${summary.successful} | Partial: ${summary.partial} | Empty: ${summary.empty} | Errors: ${summary.errors}`
  );
  console.log("=".repeat(60));

  // Save summary
  const summaryFilename = `_import-summary-${timestamp}.json`;
  const summaryPath = path.join(exportDir, summaryFilename);
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`\n📊 Summary saved to: ${summaryFilename}`);

  return summary;
}

// Run the import
importAllCollections()
  .then(() => {
    console.log("\n✨ Import completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Import failed:", error);
    process.exit(1);
  });
