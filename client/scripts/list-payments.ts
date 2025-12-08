#!/usr/bin/env tsx

// Load environment variables
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

async function listPayments() {
  console.log("📋 Listing all payments in stripePayments collection...");
  console.log("");

  try {
    const paymentsRef = collection(db, "stripePayments");
    const querySnapshot = await getDocs(paymentsRef);

    if (querySnapshot.empty) {
      console.log("✅ No payments found");
      return;
    }

    console.log(`📊 Found ${querySnapshot.size} payment(s)`);
    console.log("");

    querySnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. Document ID: ${doc.id}`);
      console.log(`   Status: ${data.status || 'N/A'}`);
      console.log(`   Email: ${data.email || 'N/A'}`);
      console.log(`   Amount: £${data.amountGBP || 'N/A'}`);
      console.log(`   Booking ID: ${data.bookingId || 'N/A'}`);
      console.log(`   Tour Package: ${data.tourPackageName || 'N/A'}`);
      console.log(`   Created: ${data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleString() : 'N/A'}`);
      console.log("");
    });

    // Summary
    const statusCounts: Record<string, number> = {};
    querySnapshot.docs.forEach(doc => {
      const status = doc.data().status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    console.log("=".repeat(50));
    console.log("📊 Status Summary:");
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
    console.log("=".repeat(50));
  } catch (error) {
    console.error("❌ Error listing payments:", error);
    process.exit(1);
  }

  process.exit(0);
}

listPayments();
