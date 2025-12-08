#!/usr/bin/env tsx

// Load environment variables
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc, query, orderBy } from "firebase/firestore";

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

async function cleanupDuplicates() {
  console.log("🔍 Finding duplicate payments in stripePayments collection...");
  console.log("");

  try {
    const paymentsRef = collection(db, "stripePayments");
    const q = query(paymentsRef, orderBy("createdAt", "asc"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log("✅ No payments found");
      return;
    }

    console.log(`📊 Found ${querySnapshot.size} total payment(s)`);
    console.log("");

    // Group by booking ID or email+tour combination
    const grouped = new Map<string, any[]>();
    
    querySnapshot.docs.forEach((doc) => {
      const data = doc.data();
      // Use bookingId if available, otherwise group by email+tourPackage+tourDate
      const key = data.bookingId && data.bookingId !== 'PENDING' 
        ? data.bookingId 
        : `${data.email}_${data.tourPackageId}_${data.tourDate}`;
      
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      
      grouped.get(key)!.push({
        id: doc.id,
        data: data,
        createdAt: data.createdAt?.toDate?.() || new Date(0)
      });
    });

    console.log(`📊 Found ${grouped.size} unique booking(s)`);
    console.log("");

    let deletedCount = 0;
    let keptCount = 0;

    // For each group, keep the most complete/recent one and delete others
    for (const [key, docs] of grouped.entries()) {
      if (docs.length === 1) {
        console.log(`✓ ${key}: Only 1 document (keeping)`);
        keptCount++;
        continue;
      }

      console.log(`⚠️  ${key}: ${docs.length} duplicate documents found`);
      
      // Sort by: 1) Has booking data (status=completed/confirmed), 2) Most recent
      docs.sort((a, b) => {
        const aComplete = a.data.status === 'confirmed' || a.data.status === 'completed';
        const bComplete = b.data.status === 'confirmed' || b.data.status === 'completed';
        
        if (aComplete !== bComplete) {
          return bComplete ? 1 : -1; // Keep completed/confirmed ones
        }
        
        return b.createdAt.getTime() - a.createdAt.getTime(); // Most recent first
      });

      // Keep the first one (best match)
      const keepDoc = docs[0];
      console.log(`   ✓ Keeping: ${keepDoc.id} (${keepDoc.data.status || 'pending'}, ${keepDoc.createdAt.toISOString()})`);
      keptCount++;

      // Delete the rest
      for (let i = 1; i < docs.length; i++) {
        const docToDelete = docs[i];
        try {
          await deleteDoc(doc(db, "stripePayments", docToDelete.id));
          console.log(`   ✗ Deleted: ${docToDelete.id} (${docToDelete.data.status || 'pending'}, ${docToDelete.createdAt.toISOString()})`);
          deletedCount++;
        } catch (error) {
          console.error(`   ❌ Error deleting ${docToDelete.id}:`, error);
        }
      }
      
      console.log("");
    }

    console.log("=".repeat(50));
    console.log("✅ Cleanup complete!");
    console.log(`📊 Kept: ${keptCount}, Deleted: ${deletedCount}`);
    console.log("=".repeat(50));
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    process.exit(1);
  }

  process.exit(0);
}

cleanupDuplicates();
