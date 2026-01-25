/**
 * Migration Script: Add Access Tokens to Existing Bookings
 * 
 * This script adds long-lived, secure access tokens to all existing booking documents.
 * These tokens enable a no-authentication booking system where customers can view their
 * booking status via /booking-status/<access_token> URLs.
 * 
 * Usage: 
 *   npx ts-node client/scripts/add-access-tokens-to-bookings.ts --dry-run
 *   npx ts-node client/scripts/add-access-tokens-to-bookings.ts --production
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as crypto from "crypto";
import * as path from "path";

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  const serviceAccountPath = path.resolve(
    __dirname,
    "../keys/dev-project-service-account.json"
  );
  console.log(`🔑 Using service account key file: ${serviceAccountPath}`);
  initializeApp({
    credential: cert(serviceAccountPath),
  });
}
const db = getFirestore();

/**
 * Generate a secure, unguessable access token using crypto.randomBytes
 * Uses 32 bytes of cryptographically secure random data encoded as URL-safe base64
 * This provides 256 bits of entropy, making it practically impossible to guess
 * 
 * @returns {string} A secure access token (43 characters, URL-safe)
 */
function generateAccessToken(): string {
  return crypto
    .randomBytes(32)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

interface MigrationStats {
  totalBookings: number;
  updatedBookings: number;
  skippedBookings: number;
  errorCount: number;
  errors: Array<{ bookingId: string; error: string }>;
}

/**
 * Add access tokens to all existing bookings
 */
async function addAccessTokensToBookings(isDryRun: boolean) {
  const mode = isDryRun ? "DRY RUN" : "PRODUCTION";
  
  console.log("\n" + "=".repeat(80));
  console.log("🔐 ACCESS TOKEN MIGRATION SCRIPT");
  console.log("=".repeat(80));
  console.log(`Mode: ${mode} ${isDryRun ? "(no changes will be made)" : "(will modify database)"}`);
  console.log("=".repeat(80) + "\n");

  const stats: MigrationStats = {
    totalBookings: 0,
    updatedBookings: 0,
    skippedBookings: 0,
    errorCount: 0,
    errors: [],
  };

  try {
    console.log("📥 Fetching all bookings...\n");
    
    // Fetch all bookings
    const bookingsSnapshot = await db.collection("bookings").get();
    stats.totalBookings = bookingsSnapshot.size;

    if (bookingsSnapshot.empty) {
      console.log("⚠️  No bookings found in the database.\n");
      return stats;
    }

    console.log(`📊 Found ${stats.totalBookings} bookings to process.\n`);
    console.log("=".repeat(80) + "\n");

    // Process each booking
    let processedCount = 0;
    for (const doc of bookingsSnapshot.docs) {
      const bookingId = doc.id;
      const bookingData = doc.data();
      
      processedCount++;
      const progress = `[${processedCount}/${stats.totalBookings}]`;

      try {
        // Check if booking already has an access token
        if (bookingData.access_token) {
          console.log(`${progress} ⏭️  Skipping ${bookingId} - already has access token`);
          stats.skippedBookings++;
          continue;
        }

        // Generate a new access token
        const accessToken = generateAccessToken();

        if (isDryRun) {
          console.log(`${progress} [DRY RUN] Would add access_token to ${bookingId}`);
          stats.updatedBookings++;
        } else {
          // Update the booking document with the access token
          await doc.ref.update({
            access_token: accessToken,
            updatedAt: Timestamp.now(),
          });

          console.log(`${progress} ✅ Added access_token to ${bookingId}`);
          stats.updatedBookings++;
        }
      } catch (error) {
        stats.errorCount++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        stats.errors.push({ bookingId, error: errorMessage });
        console.error(`${progress} ❌ Error processing ${bookingId}:`, errorMessage);
      }
    }

    // Summary
    console.log("\n" + "=".repeat(80));
    console.log("📋 MIGRATION SUMMARY");
    console.log("=".repeat(80));
    console.log(`Total bookings:          ${stats.totalBookings}`);
    console.log(`✅ ${isDryRun ? 'Would update' : 'Updated'}:           ${stats.updatedBookings}`);
    console.log(`⏭️  Skipped:              ${stats.skippedBookings} (already had tokens)`);
    console.log(`❌ Errors:               ${stats.errorCount}`);
    console.log("=".repeat(80));

    if (stats.errors.length > 0) {
      console.log("\n⚠️  Errors encountered:");
      stats.errors.forEach(({ bookingId, error }) => {
        console.log(`  - ${bookingId}: ${error}`);
      });
    }

    if (isDryRun) {
      console.log("\n" + "⚠️".repeat(40));
      console.log("⚠️  THIS WAS A DRY RUN - NO CHANGES WERE MADE");
      console.log("⚠️  To execute in production, run with --production flag");
      console.log("⚠️".repeat(40) + "\n");
    } else {
      console.log("\n✅ Migration completed successfully!");
      console.log("\nNext steps:");
      console.log("1. Update booking creation logic to include access_token field");
      console.log("2. Update /booking-status route to accept access_token parameter");
      console.log("3. Test the new access token-based booking status URLs\n");
    }

    return stats;
  } catch (error) {
    console.error("\n❌ Migration failed with error:", error);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const isProduction = args.includes("--production");

  if (!isDryRun && !isProduction) {
    console.error("❌ ERROR: You must specify either --dry-run or --production");
    console.error("\nUsage:");
    console.error("  npx ts-node client/scripts/add-access-tokens-to-bookings.ts --dry-run");
    console.error("  npx ts-node client/scripts/add-access-tokens-to-bookings.ts --production");
    process.exit(1);
  }

  try {
    await addAccessTokensToBookings(isDryRun);
    console.log("✅ Script completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Script failed:", error);
    process.exit(1);
  }
}

// Run the script
main();
