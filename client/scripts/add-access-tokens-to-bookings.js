/**
 * Migration Script: Add Access Tokens to Existing Bookings
 * 
 * This script adds long-lived, secure access tokens to all existing booking documents.
 * These tokens enable a no-authentication booking system where customers can view their
 * booking status via /booking-status/<access_token> URLs.
 * 
 * Usage: node client/scripts/add-access-tokens-to-bookings.js
 */

const admin = require('firebase-admin');
const crypto = require('crypto');
const path = require('path');

// Initialize Firebase Admin SDK with service account
const serviceAccount = require('../keys/dev-project-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const db = admin.firestore();

/**
 * Generate a secure, unguessable access token
 * Uses 32 bytes of cryptographically secure random data encoded as URL-safe base64
 * This provides 256 bits of entropy, making it practically impossible to guess
 * 
 * @returns {string} A secure access token (43 characters)
 */
function generateAccessToken() {
  return crypto
    .randomBytes(32)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Add access tokens to all existing bookings
 */
async function addAccessTokensToBookings() {
  console.log('🚀 Starting migration: Adding access tokens to existing bookings...\n');

  try {
    // Fetch all bookings
    const bookingsRef = db.collection('bookings');
    const snapshot = await bookingsRef.get();

    if (snapshot.empty) {
      console.log('⚠️  No bookings found in the database.');
      return;
    }

    console.log(`📊 Found ${snapshot.size} bookings to process.\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors = [];

    // Use batched writes for better performance (max 500 operations per batch)
    const BATCH_SIZE = 500;
    let batch = db.batch();
    let operationCount = 0;

    for (const doc of snapshot.docs) {
      const bookingId = doc.id;
      const bookingData = doc.data();

      try {
        // Check if booking already has an access token
        if (bookingData.access_token) {
          console.log(`⏭️  Skipping ${bookingId} - already has access token`);
          skippedCount++;
          continue;
        }

        // Generate a new access token
        const accessToken = generateAccessToken();

        // Add to batch
        batch.update(doc.ref, {
          access_token: accessToken,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        operationCount++;
        updatedCount++;

        console.log(`✅ Queued ${bookingId} for update (${updatedCount}/${snapshot.size - skippedCount})`);

        // Commit batch when reaching batch size limit
        if (operationCount >= BATCH_SIZE) {
          console.log(`\n💾 Committing batch of ${operationCount} updates...`);
          await batch.commit();
          console.log('✅ Batch committed successfully\n');

          // Create new batch
          batch = db.batch();
          operationCount = 0;
        }
      } catch (error) {
        errorCount++;
        errors.push({ bookingId, error: error.message });
        console.error(`❌ Error processing ${bookingId}:`, error.message);
      }
    }

    // Commit remaining operations
    if (operationCount > 0) {
      console.log(`\n💾 Committing final batch of ${operationCount} updates...`);
      await batch.commit();
      console.log('✅ Final batch committed successfully\n');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total bookings:     ${snapshot.size}`);
    console.log(`✅ Updated:         ${updatedCount}`);
    console.log(`⏭️  Skipped:         ${skippedCount} (already had tokens)`);
    console.log(`❌ Errors:          ${errorCount}`);
    console.log('='.repeat(60));

    if (errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      errors.forEach(({ bookingId, error }) => {
        console.log(`  - ${bookingId}: ${error}`);
      });
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Update the booking creation logic to include access_token field');
    console.log('2. Update the /booking-status/[bookingDocumentId] route to accept access_token');
    console.log('3. Test the new access token-based booking status URLs\n');

  } catch (error) {
    console.error('\n❌ Migration failed with error:', error);
    throw error;
  } finally {
    // Clean up
    await admin.app().delete();
    console.log('🔒 Firebase Admin SDK connection closed.');
  }
}

// Run the migration
addAccessTokensToBookings()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
