/**
 * Sync tourPackages collection from Production to Dev
 * Using Firebase client SDK to avoid service account issues
 */

const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, writeBatch, doc } = require("firebase/firestore");

// Production Firebase config
const prodConfig = {
  apiKey: "AIzaSyCw4r9i20r5WJYXGeu0rxet0SKnJH9GDpI",
  authDomain: "imheretravels-a3f81.firebaseapp.com",
  projectId: "imheretravels-a3f81",
  storageBucket: "imheretravels-a3f81.firebasestorage.app",
  messagingSenderId: "283391684985",
  appId: "1:283391684985:web:bcb38a92a27de6ab15bfa8"
};

// Dev Firebase config
const devConfig = {
  apiKey: "AIzaSyDcUxBeUTuq2P3Gj9SoO9qhx9hQDhYANVs",
  authDomain: "imheretravels-dev.firebaseapp.com",
  projectId: "imheretravels-dev",
  storageBucket: "imheretravels-dev.firebasestorage.app",
  messagingSenderId: "449769532624",
  appId: "1:449769532624:web:80809ee6a7bd26f9e882d5"
};

async function syncTourPackages() {
  try {
    console.log("\n============================================================");
    console.log("SYNCING TOUR PACKAGES FROM PROD TO DEV (Client SDK)");
    console.log("============================================================");
    console.log("Production:", prodConfig.projectId);
    console.log("Development:", devConfig.projectId);
    console.log("============================================================\n");

    // Initialize both Firebase apps
    const prodApp = initializeApp(prodConfig, "prod");
    const devApp = initializeApp(devConfig, "dev");

    // Get Firestore instances
    const prodDb = getFirestore(prodApp);
    const devDb = getFirestore(devApp);

    // Fetch all tour packages from production
    console.log("📦 Fetching tour packages from production...");
    const prodCollectionRef = collection(prodDb, "tourPackages");
    const prodSnapshot = await getDocs(prodCollectionRef);

    const tourPackages = [];
    prodSnapshot.forEach((doc) => {
      tourPackages.push({
        id: doc.id,
        data: doc.data()
      });
    });

    console.log(`✅ Found ${tourPackages.length} tour packages in production\n`);

    if (tourPackages.length === 0) {
      console.log("⚠️  No tour packages to sync");
      return;
    }

    // Write to dev database in batches (max 500 per batch)
    console.log("📝 Writing tour packages to dev database...");
    const batchSize = 500;
    let batchCount = 0;
    let totalWritten = 0;

    for (let i = 0; i < tourPackages.length; i += batchSize) {
      batchCount++;
      const batch = writeBatch(devDb);
      const batchPackages = tourPackages.slice(i, i + batchSize);

      batchPackages.forEach((pkg) => {
        const docRef = doc(devDb, "tourPackages", pkg.id);
        batch.set(docRef, pkg.data);
      });

      await batch.commit();
      totalWritten += batchPackages.length;
      console.log(`   Batch ${batchCount}: Wrote ${batchPackages.length} packages (Total: ${totalWritten}/${tourPackages.length})`);
    }

    console.log("\n============================================================");
    console.log("✅ SYNC COMPLETED SUCCESSFULLY");
    console.log("============================================================");
    console.log(`Total packages synced: ${totalWritten}`);
    console.log(`Batches processed: ${batchCount}`);
    console.log("============================================================\n");

  } catch (error) {
    console.error("\n❌ Sync failed:", error);
    console.error("\n❌ Sync process failed:", error);
    process.exit(1);
  }
}

// Run the sync
syncTourPackages();
