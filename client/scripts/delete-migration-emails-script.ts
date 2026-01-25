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
    console.error("  npm run delete-migration-emails -- --dry-run");
    console.error("  npm run delete-migration-emails -- --production");
    process.exit(1);
  }

  console.log("\n" + "=".repeat(80));
  console.log("🗑️  DELETE MIGRATION EMAILS SCRIPT");
  console.log("=".repeat(80));
  console.log(`Mode: ${isDryRun ? "DRY RUN (no changes will be made)" : "PRODUCTION (will delete emails)"}`);
  console.log(`Target: Scheduled emails with source = "migration-script"`);
  console.log("=".repeat(80) + "\n");

  try {
    // Fetch all scheduled emails with source = "migration-script"
    console.log("📥 Fetching scheduled emails with source = 'migration-script'...\n");
    
    const scheduledEmailsSnapshot = await db
      .collection("scheduledEmails")
      .where("source", "==", "migration-script")
      .get();

    const totalEmails = scheduledEmailsSnapshot.size;
    console.log(`Found ${totalEmails} scheduled emails to delete\n`);

    if (totalEmails === 0) {
      console.log("✅ No emails to delete. Exiting.\n");
      return;
    }

    // Group by booking for better logging
    const emailsByBooking: Record<string, any[]> = {};
    
    scheduledEmailsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const bookingId = data.bookingId || "unknown";
      
      if (!emailsByBooking[bookingId]) {
        emailsByBooking[bookingId] = [];
      }
      
      emailsByBooking[bookingId].push({
        id: doc.id,
        to: data.to,
        status: data.status,
        scheduledFor: data.scheduledFor,
        bookingId: data.bookingId,
      });
    });

    console.log("📋 Emails grouped by booking:\n");
    Object.entries(emailsByBooking).forEach(([bookingId, emails]) => {
      console.log(`  Booking: ${bookingId}`);
      console.log(`    Emails: ${emails.length}`);
      console.log(`    To: ${emails[0]?.to || "N/A"}`);
      console.log(`    Statuses: ${emails.map(e => e.status).join(", ")}`);
      console.log("");
    });

    if (isDryRun) {
      console.log("\n" + "⚠️".repeat(40));
      console.log("⚠️  THIS WAS A DRY RUN - NO EMAILS WERE DELETED");
      console.log("⚠️  To execute deletion, run with --production flag");
      console.log("⚠️".repeat(40) + "\n");
      return;
    }

    // Production mode - delete emails
    console.log("🗑️  Deleting emails...\n");
    
    let deletedCount = 0;
    const batch = db.batch();
    
    scheduledEmailsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
      deletedCount++;
      
      if (deletedCount % 10 === 0) {
        console.log(`  Deleted ${deletedCount}/${totalEmails} emails...`);
      }
    });

    await batch.commit();
    
    console.log(`\n✅ Successfully deleted ${deletedCount} scheduled emails\n`);
    
    console.log("=".repeat(80));
    console.log("📊 SUMMARY");
    console.log("=".repeat(80));
    console.log(`Total emails deleted: ${deletedCount}`);
    console.log(`Bookings affected: ${Object.keys(emailsByBooking).length}`);
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
