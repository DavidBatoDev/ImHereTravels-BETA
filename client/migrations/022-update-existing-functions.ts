import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  initializeApp();
}
const db = getFirestore();

export async function updateExistingFunctions() {
  console.log(
    "🚀 Updating existing functions with functionDependencies field..."
  );

  try {
    // Get all existing functions
    const functionsSnapshot = await db.collection("ts_files").get();

    if (functionsSnapshot.empty) {
      console.log("❌ No functions found in ts_files collection");
      return;
    }

    console.log(`📊 Found ${functionsSnapshot.size} functions to update`);

    // Update each function to include functionDependencies field
    const batch = db.batch();
    let updateCount = 0;

    functionsSnapshot.forEach((doc) => {
      const data = doc.data();

      // Only update if functionDependencies field is missing
      if (!data.functionDependencies) {
        batch.update(doc.ref, {
          functionDependencies: [],
          updatedAt: new Date(),
        });
        updateCount++;
      }
    });

    if (updateCount > 0) {
      await batch.commit();
      console.log(
        `✅ Updated ${updateCount} functions with functionDependencies field`
      );
    } else {
      console.log("✅ All functions already have functionDependencies field");
    }

    console.log("🎉 Function update completed successfully!");
  } catch (error) {
    console.error("❌ Error updating existing functions:", error);
    throw error;
  }
}

// Run the migration
updateExistingFunctions()
  .then(() => {
    console.log("✅ Function update migration completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Function update migration failed:", error);
    process.exit(1);
  });
