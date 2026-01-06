// functions/src/scheduled-cleanup-abandoned-payments.ts
import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";

/**
 * Scheduled Cloud Function to clean up abandoned stripePayments documents
 *
 * Runs daily at 2:00 AM UTC to delete:
 * - Documents with status "reserve_pending" or "pending"
 * - Created more than 7 days ago
 * - No associated booking document
 *
 * This prevents database bloat from incomplete booking attempts.
 *
 * Schedule: Every day at 2:00 AM UTC
 * Cron syntax: 0 2 * * *
 */
export const cleanupAbandonedPayments = onSchedule(
  {
    schedule: "0 2 * * *", // Every day at 2:00 AM UTC
    timeZone: "UTC",
    region: "asia-southeast1",
  },
  async (event) => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    const sevenDaysAgo = admin.firestore.Timestamp.fromMillis(
      now.toMillis() - 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
    );

    console.log("🧹 Starting cleanup of abandoned payments...");
    console.log(`📅 Cutoff date: ${sevenDaysAgo.toDate().toISOString()}`);

    try {
      // Query for abandoned payments
      const abandonedQuery = db
        .collection("stripePayments")
        .where("payment.status", "in", ["reserve_pending", "pending"])
        .where("timestamps.createdAt", "<=", sevenDaysAgo);

      const snapshot = await abandonedQuery.get();

      if (snapshot.empty) {
        console.log("✅ No abandoned payments found");
        return;
      }

      console.log(`🔍 Found ${snapshot.size} potential abandoned payments`);

      let deletedCount = 0;
      let skippedCount = 0;
      const batch = db.batch();

      for (const doc of snapshot.docs) {
        const data = doc.data();

        // Safety checks before deletion
        // 1. Skip if booking document exists and is not "PENDING"
        if (
          data.booking?.documentId &&
          data.booking.documentId !== "" &&
          data.booking.documentId !== "PENDING"
        ) {
          console.log(
            `⏭️ Skipping ${doc.id}: has booking document ${data.booking.documentId}`
          );
          skippedCount++;
          continue;
        }

        // 2. Skip if status is not truly abandoned
        const status = data.payment?.status || data.status;
        if (status !== "reserve_pending" && status !== "pending") {
          console.log(`⏭️ Skipping ${doc.id}: status is ${status}`);
          skippedCount++;
          continue;
        }

        // 3. Skip if recently updated (within last 24 hours)
        const updatedAt = data.timestamps?.updatedAt;
        if (updatedAt) {
          const twentyFourHoursAgo = admin.firestore.Timestamp.fromMillis(
            now.toMillis() - 24 * 60 * 60 * 1000
          );
          if (updatedAt.toMillis() > twentyFourHoursAgo.toMillis()) {
            console.log(`⏭️ Skipping ${doc.id}: updated within last 24 hours`);
            skippedCount++;
            continue;
          }
        }

        // Safe to delete
        console.log(
          `🗑️ Deleting abandoned payment ${
            doc.id
          } (created: ${data.timestamps?.createdAt?.toDate().toISOString()})`
        );
        batch.delete(doc.ref);
        deletedCount++;

        // Firestore batch limit is 500 operations
        if (deletedCount % 500 === 0) {
          await batch.commit();
          console.log(`✅ Committed batch of ${deletedCount} deletions`);
        }
      }

      // Commit remaining deletions
      if (deletedCount % 500 !== 0) {
        await batch.commit();
      }

      console.log(
        `✅ Cleanup complete: ${deletedCount} deleted, ${skippedCount} skipped`
      );

      // Log summary to a cleanup-logs collection for audit trail
      await db.collection("cleanup-logs").add({
        type: "abandoned-payments",
        timestamp: now,
        deletedCount,
        skippedCount,
        totalProcessed: snapshot.size,
        cutoffDate: sevenDaysAgo,
      });

      console.log(`✅ Cleanup complete:`, {
        deletedCount,
        skippedCount,
        totalProcessed: snapshot.size,
      });
    } catch (error) {
      console.error("❌ Error during cleanup:", error);

      // Log error for monitoring
      await db.collection("cleanup-logs").add({
        type: "abandoned-payments",
        timestamp: now,
        error: error instanceof Error ? error.message : String(error),
        success: false,
      });

      throw error;
    }
  }
);
