/**
 * Sync tourPackages collection from Production to Dev
 * This script copies all tour packages from prod to dev database
 */

const admin = require("firebase-admin");
const path = require("path");

// Load service accounts
const prodServiceAccountPath = path.join(
  __dirname,
  "..",
  "keys",
  "prod-project-service-account.json"
);

const devServiceAccountPath = path.join(
  __dirname,
  "..",
  "keys",
  "dev-project-service-account.json"
);

// Check if both service accounts exist
const fs = require("fs");
if (!fs.existsSync(prodServiceAccountPath)) {
  console.error("❌ Error: Production service account file not found at:", prodServiceAccountPath);
  console.error("Please ensure prod-project-service-account.json exists in the keys folder");
  process.exit(1);
}

if (!fs.existsSync(devServiceAccountPath)) {
  console.error("❌ Error: Dev service account file not found at:", devServiceAccountPath);
  console.error("Please ensure dev-project-service-account.json exists in the keys folder");
  process.exit(1);
}

const prodServiceAccount = require(prodServiceAccountPath);
const devServiceAccount = require(devServiceAccountPath);

// Initialize Firebase Admin for Production
const prodApp = admin.initializeApp({
  credential: admin.credential.cert(prodServiceAccount),
  projectId: prodServiceAccount.project_id,
}, "prod");

// Initialize Firebase Admin for Dev
const devApp = admin.initializeApp({
  credential: admin.credential.cert(devServiceAccount),
  projectId: devServiceAccount.project_id,
}, "dev");

const prodDb = prodApp.firestore();
const devDb = devApp.firestore();

async function syncTourPackages() {
  console.log("=".repeat(60));
  console.log("SYNCING TOUR PACKAGES FROM PROD TO DEV");
  console.log("=".repeat(60));
  console.log(`Production: ${prodServiceAccount.project_id}`);
  console.log(`Development: ${devServiceAccount.project_id}`);
  console.log("=".repeat(60));

  try {
    // Fetch all tour packages from production
    console.log("\n📦 Fetching tour packages from production...");
    const prodSnapshot = await prodDb.collection("tourPackages").get();
    
    if (prodSnapshot.empty) {
      console.log("⚠️  No tour packages found in production database");
      return;
    }

    console.log(`✅ Found ${prodSnapshot.size} tour packages in production`);

    // Prepare tour packages data
    const tourPackages = [];
    prodSnapshot.forEach((doc) => {
      tourPackages.push({
        id: doc.id,
        data: doc.data(),
      });
    });

    // Write to dev database
    console.log("\n📝 Writing tour packages to dev database...");
    const batchSize = 500; // Firestore batch limit
    let writtenCount = 0;
    let errorCount = 0;

    for (let i = 0; i < tourPackages.length; i += batchSize) {
      const batch = devDb.batch();
      const batchData = tourPackages.slice(i, i + batchSize);

      batchData.forEach((tourPackage) => {
        const docRef = devDb.collection("tourPackages").doc(tourPackage.id);
        batch.set(docRef, tourPackage.data, { merge: true });
      });

      try {
        await batch.commit();
        writtenCount += batchData.length;
        console.log(`  ✅ Batch ${Math.floor(i / batchSize) + 1}: ${writtenCount}/${tourPackages.length} tour packages synced`);
      } catch (error) {
        errorCount += batchData.length;
        console.error(`  ❌ Error in batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      }
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("SYNC SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total tour packages in production: ${tourPackages.length}`);
    console.log(`Successfully synced: ${writtenCount}`);
    console.log(`Failed: ${errorCount}`);
    console.log("=".repeat(60));

    if (errorCount === 0) {
      console.log("\n✨ Tour packages sync completed successfully!");
    } else {
      console.log("\n⚠️  Tour packages sync completed with some errors");
    }

    // List the synced tour packages
    console.log("\n📋 SYNCED TOUR PACKAGES:");
    tourPackages.forEach((tp, index) => {
      console.log(`${index + 1}. ${tp.data.name} (${tp.data.tourCode}) - ${tp.data.status}`);
    });

  } catch (error) {
    console.error("\n❌ Sync failed:", error);
    throw error;
  }
}

// Run the sync
syncTourPackages()
  .then(() => {
    console.log("\n✅ Sync process completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Sync process failed:", error);
    process.exit(1);
  });
