import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
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
    console.error("  npm run skip-old-emails -- --dry-run");
    console.error("  npm run skip-old-emails -- --production");
    process.exit(1);
  }

  console.log("\n" + "=".repeat(80));
  console.log("⏭️  SKIP OLD SCHEDULED EMAILS SCRIPT");
  console.log("=".repeat(80));
  console.log(`Mode: ${isDryRun ? "DRY RUN (no changes will be made)" : "PRODUCTION (will skip emails)"}`);
  console.log(`Target: Emails scheduled before January 19, 2026 at 9:00:00 AM UTC+8`);
  console.log("=".repeat(80) + "\n");

  try {
    // Create cutoff date: January 19, 2026 at 9:00:00 AM UTC+8
    const cutoffDate = new Date("2026-01-19T09:00:00+08:00");
    const cutoffTimestamp = Timestamp.fromDate(cutoffDate);
    
    console.log(`📅 Cutoff date: ${cutoffDate.toISOString()}`);
    console.log(`📅 Cutoff timestamp: ${cutoffTimestamp.toDate().toISOString()}\n`);

    // Fetch all scheduled emails before the cutoff date
    console.log("📥 Fetching scheduled emails before cutoff date...\n");
    
    const scheduledEmailsSnapshot = await db
      .collection("scheduledEmails")
      .where("scheduledFor", "<", cutoffTimestamp)
      .where("status", "==", "pending") // Only skip pending emails
      .get();

    const totalEmails = scheduledEmailsSnapshot.size;
    console.log(`Found ${totalEmails} pending emails scheduled before ${cutoffDate.toLocaleString()}\n`);

    if (totalEmails === 0) {
      console.log("✅ No emails to skip. Exiting.\n");
      return;
    }

    // Group by scheduled date for better logging
    const emailsByDate: Record<string, any[]> = {};
    
    scheduledEmailsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const scheduledFor = data.scheduledFor.toDate();
      const dateKey = scheduledFor.toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (!emailsByDate[dateKey]) {
        emailsByDate[dateKey] = [];
      }
      
      emailsByDate[dateKey].push({
        id: doc.id,
        to: data.to,
        subject: data.subject,
        scheduledFor: scheduledFor.toISOString(),
        bookingId: data.bookingId,
        row: data.row,
      });
    });

    console.log("📋 Emails grouped by scheduled date:\n");
    Object.entries(emailsByDate)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .forEach(([date, emails]) => {
        console.log(`  📅 ${date}: ${emails.length} emails`);
        emails.slice(0, 3).forEach((email) => {
          console.log(`     • ${email.to} - ${email.subject.substring(0, 50)}...`);
        });
        if (emails.length > 3) {
          console.log(`     ... and ${emails.length - 3} more`);
        }
        console.log("");
      });

    if (isDryRun) {
      console.log("\n" + "⚠️".repeat(40));
      console.log("⚠️  THIS WAS A DRY RUN - NO EMAILS WERE SKIPPED");
      console.log("⚠️  To execute skip, run with --production flag");
      console.log("⚠️".repeat(40) + "\n");
      return;
    }

    // Production mode - skip emails
    console.log("⏭️  Skipping emails...\n");
    
    let skippedCount = 0;
    const batchSize = 500; // Firestore batch limit
    let batch = db.batch();
    let batchCount = 0;

    for (const doc of scheduledEmailsSnapshot.docs) {
      const emailRef = db.collection("scheduledEmails").doc(doc.id);
      batch.update(emailRef, { 
        status: "skipped",
        updatedAt: Timestamp.now(),
      });
      batchCount++;
      skippedCount++;

      // Commit batch when it reaches the limit
      if (batchCount === batchSize) {
        await batch.commit();
        console.log(`  Skipped ${skippedCount}/${totalEmails} emails...`);
        batch = db.batch();
        batchCount = 0;
      }
    }

    // Commit remaining updates
    if (batchCount > 0) {
      await batch.commit();
    }

    console.log(`\n✅ Successfully skipped ${skippedCount} scheduled emails\n`);
    
    console.log("=".repeat(80));
    console.log("📊 SUMMARY");
    console.log("=".repeat(80));
    console.log(`Total emails skipped: ${skippedCount}`);
    console.log(`Cutoff date: ${cutoffDate.toLocaleString()}`);
    console.log(`Dates affected: ${Object.keys(emailsByDate).length}`);
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
