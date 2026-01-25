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
    console.error("  npm run cleanup-booking-links -- --dry-run");
    console.error("  npm run cleanup-booking-links -- --production");
    process.exit(1);
  }

  console.log("\n" + "=".repeat(80));
  console.log("🧹 CLEANUP BOOKING ADMIN PANEL LINKS SCRIPT");
  console.log("=".repeat(80));
  console.log(`Mode: ${isDryRun ? "DRY RUN (no changes will be made)" : "PRODUCTION (will update bookings)"}`);
  console.log(`Target: Remove admin panel links from booking documents`);
  console.log("=".repeat(80) + "\n");

  try {
    // Fetch all bookings
    console.log("📥 Fetching all bookings...\n");
    
    const bookingsSnapshot = await db.collection("bookings").get();
    console.log(`Found ${bookingsSnapshot.size} bookings\n`);

    let bookingsToUpdate = 0;
    let totalLinksToRemove = 0;
    const updates: { bookingId: string; email: string; linksToRemove: string[] }[] = [];

    // Check each booking for admin panel links
    bookingsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const linksToRemove: string[] = [];

      // Check P1-P4 scheduled email links
      ["p1", "p2", "p3", "p4"].forEach((term) => {
        const linkField = `${term}ScheduledEmailLink`;
        const linkValue = data[linkField];

        if (linkValue && typeof linkValue === "string" && linkValue.startsWith("https://admin.imheretravels.com")) {
          linksToRemove.push(linkField);
        }
      });

      if (linksToRemove.length > 0) {
        bookingsToUpdate++;
        totalLinksToRemove += linksToRemove.length;
        updates.push({
          bookingId: doc.id,
          email: data.emailAddress || "N/A",
          linksToRemove,
        });
      }
    });

    console.log("📋 Bookings with admin panel links:\n");
    if (updates.length === 0) {
      console.log("  ✅ No admin panel links found!\n");
      return;
    }

    updates.forEach((update) => {
      console.log(`  📧 ${update.email}`);
      console.log(`     Booking ID: ${update.bookingId}`);
      console.log(`     Links to remove: ${update.linksToRemove.join(", ")}`);
      console.log("");
    });

    console.log("=".repeat(80));
    console.log(`Total bookings to update: ${bookingsToUpdate}`);
    console.log(`Total links to remove: ${totalLinksToRemove}`);
    console.log("=".repeat(80) + "\n");

    if (isDryRun) {
      console.log("\n" + "⚠️".repeat(40));
      console.log("⚠️  THIS WAS A DRY RUN - NO BOOKINGS WERE UPDATED");
      console.log("⚠️  To execute cleanup, run with --production flag");
      console.log("⚠️".repeat(40) + "\n");
      return;
    }

    // Production mode - remove admin panel links
    console.log("🧹 Removing admin panel links...\n");
    
    let updatedCount = 0;
    const batch = db.batch();
    
    updates.forEach((update) => {
      const bookingRef = db.collection("bookings").doc(update.bookingId);
      const updateData: Record<string, null> = {};
      
      update.linksToRemove.forEach((field) => {
        updateData[field] = null; // Set to null to remove the field
      });

      batch.update(bookingRef, updateData);
      updatedCount++;
      
      if (updatedCount % 10 === 0) {
        console.log(`  Updated ${updatedCount}/${bookingsToUpdate} bookings...`);
      }
    });

    await batch.commit();
    
    console.log(`\n✅ Successfully updated ${updatedCount} bookings\n`);
    
    console.log("=".repeat(80));
    console.log("📊 SUMMARY");
    console.log("=".repeat(80));
    console.log(`Bookings updated: ${updatedCount}`);
    console.log(`Admin panel links removed: ${totalLinksToRemove}`);
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
