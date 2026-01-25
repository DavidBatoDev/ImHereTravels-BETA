import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config();

if (getApps().length === 0) {
  const serviceAccountPath = path.resolve(__dirname, "../../keys/prod-project-service-account.json");
  console.log(`🔑 Using service account key file: ${serviceAccountPath}`);
  initializeApp({
    credential: cert(serviceAccountPath),
  });
}
const db = getFirestore();

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const isProduction = args.includes("--production");

  if (!isDryRun && !isProduction) {
    console.error("❌ ERROR: You must specify either --dry-run or --production");
    console.error("Usage:");
    console.error("  npm run update-scheduled-email-rows -- --dry-run");
    console.error("  npm run update-scheduled-email-rows -- --production");
    process.exit(1);
  }

  console.log("\n" + "=".repeat(80));
  console.log("📧 UPDATE SCHEDULED EMAIL ROWS SCRIPT");
  console.log("=".repeat(80));
  console.log(`Mode: ${isDryRun ? "DRY RUN (no changes will be made)" : "PRODUCTION (will update scheduled emails)"}`);
  console.log(`Target: Add row field to scheduled emails based on bookingId`);
  console.log("=".repeat(80) + "\n");

  try {
    // Fetch all scheduled emails
    console.log("📥 Fetching all scheduled emails...\n");
    
    const scheduledEmailsSnapshot = await db.collection("scheduledEmails").get();
    console.log(`Found ${scheduledEmailsSnapshot.size} scheduled emails\n`);

    let emailsToUpdate = 0;
    let emailsAlreadyHaveRow = 0;
    let emailsMissingBookingId = 0;
    let bookingsNotFound = 0;
    const updates: { emailId: string; bookingId: string; row: number; to: string }[] = [];

    // Create a cache for booking rows to avoid repeated queries
    const bookingRowCache: Record<string, number | null> = {};

    console.log("🔍 Processing scheduled emails...\n");

    for (const emailDoc of scheduledEmailsSnapshot.docs) {
      const emailData = emailDoc.data();
      const emailId = emailDoc.id;

      // Check if row already exists
      if (emailData.row !== undefined && emailData.row !== null) {
        emailsAlreadyHaveRow++;
        continue;
      }

      // Get bookingId from the email document or templateVariables
      const bookingId = emailData.bookingId || emailData.templateVariables?.bookingId;

      if (!bookingId) {
        emailsMissingBookingId++;
        console.log(`  ⚠️  Email ${emailId} has no bookingId`);
        continue;
      }

      // Check cache first
      let row: number | null;
      if (bookingId in bookingRowCache) {
        row = bookingRowCache[bookingId];
      } else {
        // Fetch booking to get row number
        try {
          const bookingDoc = await db.collection("bookings").doc(bookingId).get();
          
          if (!bookingDoc.exists) {
            bookingRowCache[bookingId] = null;
            row = null;
            bookingsNotFound++;
            console.log(`  ⚠️  Booking ${bookingId} not found for email ${emailId}`);
            continue;
          }

          const bookingData = bookingDoc.data();
          row = bookingData?.row || null;
          bookingRowCache[bookingId] = row;
        } catch (error) {
          console.error(`  ❌ Error fetching booking ${bookingId}:`, error);
          continue;
        }
      }

      if (row === null) {
        console.log(`  ⚠️  Booking ${bookingId} has no row field`);
        continue;
      }

      emailsToUpdate++;
      updates.push({
        emailId,
        bookingId,
        row,
        to: emailData.to || "N/A",
      });
    }

    console.log("\n" + "=".repeat(80));
    console.log("📊 ANALYSIS SUMMARY");
    console.log("=".repeat(80));
    console.log(`Total scheduled emails: ${scheduledEmailsSnapshot.size}`);
    console.log(`Already have row field: ${emailsAlreadyHaveRow}`);
    console.log(`Missing bookingId: ${emailsMissingBookingId}`);
    console.log(`Booking not found: ${bookingsNotFound}`);
    console.log(`Emails to update: ${emailsToUpdate}`);
    console.log("=".repeat(80) + "\n");

    if (emailsToUpdate === 0) {
      console.log("✅ No emails need updating!\n");
      return;
    }

    // Show sample of updates
    console.log("📋 Sample updates (first 10):\n");
    updates.slice(0, 10).forEach((update) => {
      console.log(`  📧 ${update.to}`);
      console.log(`     Email ID: ${update.emailId}`);
      console.log(`     Booking ID: ${update.bookingId}`);
      console.log(`     Row: ${update.row}`);
      console.log("");
    });

    if (updates.length > 10) {
      console.log(`  ... and ${updates.length - 10} more\n`);
    }

    if (isDryRun) {
      console.log("\n" + "⚠️".repeat(40));
      console.log("⚠️  THIS WAS A DRY RUN - NO EMAILS WERE UPDATED");
      console.log("⚠️  To execute updates, run with --production flag");
      console.log("⚠️".repeat(40) + "\n");
      return;
    }

    // Production mode - update emails
    console.log("📝 Updating scheduled emails...\n");
    
    let updatedCount = 0;
    const batchSize = 500; // Firestore batch limit
    let batch = db.batch();
    let batchCount = 0;

    for (const update of updates) {
      const emailRef = db.collection("scheduledEmails").doc(update.emailId);
      batch.update(emailRef, { row: update.row });
      batchCount++;
      updatedCount++;

      // Commit batch when it reaches the limit
      if (batchCount === batchSize) {
        await batch.commit();
        console.log(`  Updated ${updatedCount}/${emailsToUpdate} emails...`);
        batch = db.batch();
        batchCount = 0;
      }
    }

    // Commit remaining updates
    if (batchCount > 0) {
      await batch.commit();
    }

    console.log(`\n✅ Successfully updated ${updatedCount} scheduled emails\n`);
    
    console.log("=".repeat(80));
    console.log("📊 FINAL SUMMARY");
    console.log("=".repeat(80));
    console.log(`Scheduled emails updated: ${updatedCount}`);
    console.log(`Unique bookings referenced: ${Object.keys(bookingRowCache).length}`);
    console.log("=".repeat(80) + "\n");

  } catch (error) {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  }
}

// Run the script
main()
  .then(() => {
    console.log("✅ Script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
