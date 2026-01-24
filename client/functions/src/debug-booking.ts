import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config();

if (getApps().length === 0) {
  const serviceAccountPath = path.resolve(__dirname, "../../keys/prod-project-service-account.json");
  initializeApp({
    credential: cert(serviceAccountPath),
  });
}
const db = getFirestore();

async function debugBooking() {
  const emails = [
    "somlyokatherine@gmail.com",
    "cameronsimpson476@gmail.com"
  ];

  for (const email of emails) {
    console.log("\n" + "=".repeat(80));
    console.log(`📧 Checking: ${email}`);
    console.log("=".repeat(80));

    const snapshot = await db
      .collection("bookings")
      .where("emailAddress", "==", email)
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.log("❌ Booking not found");
      continue;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    console.log(`\n📋 Document ID: ${doc.id}`);
    console.log(`Row: ${data.row || "N/A"}`);
    console.log(`Full Name: ${data.fullName || "N/A"}`);
    console.log(`Payment Plan: ${data.availablePaymentTerms || "N/A"}`);
    console.log(`Enable Payment Reminder: ${data.enablePaymentReminder}`);

    console.log("\n📅 Payment Term Fields:");
    
    // Check all possible field variations
    const terms = ["P1", "P2", "P3", "P4", "p1", "p2", "p3", "p4"];
    const fieldSuffixes = [
      "ScheduledReminderDate",
      "ScheduledEmailLink",
      "scheduledReminderDate",
      "scheduledEmailLink",
      "DueDate",
      "DatePaid",
      "Amount"
    ];

    for (const term of terms.slice(0, 4)) { // Just P1-P4
      console.log(`\n${term}:`);
      for (const suffix of fieldSuffixes) {
        const fieldName = `${term.toLowerCase()}${suffix}`;
        const fieldNameCap = `${term}${suffix}`;
        
        if (data[fieldName] !== undefined) {
          console.log(`  ✓ ${fieldName}: ${JSON.stringify(data[fieldName])}`);
        }
        if (data[fieldNameCap] !== undefined && fieldNameCap !== fieldName) {
          console.log(`  ✓ ${fieldNameCap}: ${JSON.stringify(data[fieldNameCap])}`);
        }
      }
    }

    console.log("\n📋 All fields containing 'scheduled' or 'reminder' (case-insensitive):");
    Object.keys(data).forEach(key => {
      if (key.toLowerCase().includes("scheduled") || key.toLowerCase().includes("reminder")) {
        console.log(`  ${key}: ${JSON.stringify(data[key])}`);
      }
    });
  }
}

debugBooking()
  .then(() => {
    console.log("\n✅ Debug completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
