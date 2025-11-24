/**
 * Export all Firestore collections from Production to JSON files
 * This script exports all collections listed in the Firebase console
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Load service account from keys folder
const serviceAccountPath = path.join(
  __dirname,
  "..",
  "keys",
  "prod-project-service-account.json"
);

if (!fs.existsSync(serviceAccountPath)) {
  console.error(
    "❌ Error: Service account file not found at:",
    serviceAccountPath
  );
  console.error(
    "Please ensure prod-project-service-account.json exists in the keys folder"
  );
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

// Initialize Firebase Admin with production credentials
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const db = admin.firestore();

// Collections to export (based on your Firebase console screenshot)
const collections = [
  "bcc-users",
  "bookingSheetColumns",
  "bookingVersions",
  "bookings",
  "emailTemplates",
  "emails",
  "file_objects",
  "paymentTerms",
  "scheduledEmails",
  "stripePayments",
  "tourPackages",
  "ts_files",
  "ts_folders",
  "users",
];

// Create timestamp for the export
const timestamp = new Date()
  .toISOString()
  .replace(/:/g, "-")
  .replace(/\./g, "-");

// Output directory
const outputDir = path.join(__dirname, "..", "exports", "export-prod");

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

/**
 * Export a single collection
 */
async function exportCollection(collectionName) {
  console.log(`\nExporting collection: ${collectionName}...`);

  try {
    const snapshot = await db.collection(collectionName).get();

    if (snapshot.empty) {
      console.log(`  ⚠️  Collection ${collectionName} is empty`);
      return { collection: collectionName, count: 0, status: "empty" };
    }

    const data = [];
    snapshot.forEach((doc) => {
      data.push({
        id: doc.id,
        data: doc.data(),
      });
    });

    const filename = `${collectionName}-${timestamp}.json`;
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));

    console.log(`  ✅ Exported ${data.length} documents to ${filename}`);
    return {
      collection: collectionName,
      count: data.length,
      status: "success",
      filename,
    };
  } catch (error) {
    console.error(`  ❌ Error exporting ${collectionName}:`, error.message);
    return {
      collection: collectionName,
      count: 0,
      status: "error",
      error: error.message,
    };
  }
}

/**
 * Export all collections
 */
async function exportAllCollections() {
  console.log("=".repeat(60));
  console.log("EXPORTING PRODUCTION FIRESTORE COLLECTIONS");
  console.log("=".repeat(60));
  console.log(`Project ID: ${serviceAccount.project_id}`);
  console.log(`Output Directory: ${outputDir}`);
  console.log(`Timestamp: ${timestamp}`);
  console.log("=".repeat(60));

  const results = [];

  for (const collectionName of collections) {
    const result = await exportCollection(collectionName);
    results.push(result);
  }

  // Create summary
  console.log("\n" + "=".repeat(60));
  console.log("EXPORT SUMMARY");
  console.log("=".repeat(60));

  const summary = {
    timestamp,
    projectId: serviceAccount.project_id,
    totalCollections: collections.length,
    successful: results.filter((r) => r.status === "success").length,
    empty: results.filter((r) => r.status === "empty").length,
    errors: results.filter((r) => r.status === "error").length,
    totalDocuments: results.reduce((sum, r) => sum + r.count, 0),
    results,
  };

  results.forEach((result) => {
    const icon =
      result.status === "success"
        ? "✅"
        : result.status === "empty"
        ? "⚠️"
        : "❌";
    console.log(
      `${icon} ${result.collection}: ${result.count} documents (${result.status})`
    );
  });

  console.log("\n" + "-".repeat(60));
  console.log(`Total Documents Exported: ${summary.totalDocuments}`);
  console.log(
    `Successful: ${summary.successful} | Empty: ${summary.empty} | Errors: ${summary.errors}`
  );
  console.log("=".repeat(60));

  // Save summary
  const summaryFilename = `_export-summary-${timestamp}.json`;
  const summaryPath = path.join(outputDir, summaryFilename);
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`\n📊 Summary saved to: ${summaryFilename}`);

  return summary;
}

// Run the export
exportAllCollections()
  .then(() => {
    console.log("\n✨ Export completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Export failed:", error);
    process.exit(1);
  });
