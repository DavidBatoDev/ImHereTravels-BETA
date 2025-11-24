#!/usr/bin/env tsx

// Load environment variables
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc, query, where, serverTimestamp } from "firebase/firestore";

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

async function updatePendingPayments() {
  console.log("🔄 Updating pending payments to completed status...");
  console.log("");

  try {
    const paymentsRef = collection(db, "stripePayments");
    const q = query(paymentsRef, where("status", "==", "pending"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log("✅ No pending payments found");
      return;
    }

    console.log(`📊 Found ${querySnapshot.size} pending payment(s) to update`);
    console.log("");

    let updatedCount = 0;
    let errorCount = 0;

    for (const docSnapshot of querySnapshot.docs) {
      try {
        const data = docSnapshot.data();
        console.log(`  🔄 Updating: ${docSnapshot.id}`);
        console.log(`     Email: ${data.email || 'N/A'}`);
        console.log(`     Amount: £${data.amountGBP || 'N/A'}`);
        
        await updateDoc(doc(db, "stripePayments", docSnapshot.id), {
          status: "completed",
          updatedAt: serverTimestamp(),
        });
        
        console.log(`     ✅ Updated to completed`);
        console.log("");
        updatedCount++;
      } catch (error) {
        console.error(`  ❌ Error updating ${docSnapshot.id}:`, error);
        errorCount++;
      }
    }

    console.log("=".repeat(50));
    console.log("✅ Update complete!");
    console.log(`📊 Updated: ${updatedCount}, Errors: ${errorCount}`);
    console.log("=".repeat(50));
  } catch (error) {
    console.error("❌ Error updating pending payments:", error);
    process.exit(1);
  }

  process.exit(0);
}

updatePendingPayments();
