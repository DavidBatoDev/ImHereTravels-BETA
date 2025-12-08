#!/usr/bin/env tsx

// Load environment variables
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function clearStripePayments() {
  console.log("🗑️  Clearing stripePayments collection...");
  console.log("");

  try {
    const paymentsRef = collection(db, "stripePayments");
    const querySnapshot = await getDocs(paymentsRef);

    if (querySnapshot.empty) {
      console.log("✅ No documents found in stripePayments collection");
      return;
    }

    console.log(`📊 Found ${querySnapshot.size} documents to delete`);
    console.log("");

    let deletedCount = 0;
    let errorCount = 0;

    for (const docSnapshot of querySnapshot.docs) {
      try {
        console.log(`  🗑️  Deleting: ${docSnapshot.id}`);
        await deleteDoc(doc(db, "stripePayments", docSnapshot.id));
        deletedCount++;
      } catch (error) {
        console.error(`  ❌ Error deleting ${docSnapshot.id}:`, error);
        errorCount++;
      }
    }

    console.log("");
    console.log("✅ Cleanup complete!");
    console.log(`📊 Deleted: ${deletedCount}, Errors: ${errorCount}`);
  } catch (error) {
    console.error("❌ Error clearing stripePayments:", error);
    process.exit(1);
  }

  process.exit(0);
}

clearStripePayments();
