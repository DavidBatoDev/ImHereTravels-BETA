import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions";

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  initializeApp();
}
const db = getFirestore();

/**
 * Cloud Function triggered when a stripePayments document is updated.
 * Creates a notification for all admin users when a payment succeeds.
 */
export const onStripePaymentSuccess = onDocumentUpdated(
  {
    document: "stripePayments/{paymentId}",
    region: "asia-southeast1",
  },
  async (event) => {
    try {
      const beforeData = event.data?.before.data();
      const afterData = event.data?.after.data();
      const paymentId = event.params.paymentId;

      if (!beforeData || !afterData) {
        logger.warn("Missing data in stripePayments update event");
        return;
      }

      // Check if status changed to "terms_selected"
      // This triggers after Step 3 when user selects payment plan
      const wasTermsSelected = beforeData.status === "terms_selected";
      const isNowTermsSelected = afterData.status === "terms_selected";

      // Only proceed if status just changed to terms_selected
      if (wasTermsSelected || !isNowTermsSelected) {
        logger.info("No action needed - terms not newly selected");
        return;
      }

      logger.info(`✅ Payment terms selected for stripePayments/${paymentId}`);

      // Get booking information from the payment record
      const bookingId = afterData.bookingId;
      const bookingDocumentId = afterData.bookingDocumentId;

      // Fetch the booking document for more details
      let bookingData: any = null;
      if (bookingDocumentId) {
        const bookingDoc = await db
          .collection("bookings")
          .doc(bookingDocumentId)
          .get();
        if (bookingDoc.exists) {
          bookingData = bookingDoc.data();
        }
      }

      // Build notification content
      const travelerName = bookingData?.travelerName || "A customer";
      const tourPackageName = bookingData?.tourPackageName || "a tour";
      const amount = afterData.amount || 0;
      const currency = afterData.currency || "GBP";
      const paymentPlan =
        afterData.paymentPlan || bookingData?.paymentPlan || "";

      // Format amount for display
      const formattedAmount = new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: currency.toUpperCase(),
      }).format(amount / 100); // Stripe amounts are in cents

      // Create the notification document
      const notificationData = {
        type: "payment_received",
        title: "New Booking Confirmed",
        body: `${travelerName} booked ${tourPackageName} (${formattedAmount} reservation fee paid)`,
        data: {
          bookingId: bookingId || null,
          bookingDocumentId: bookingDocumentId || null,
          amount: amount,
          currency: currency,
          travelerName: travelerName,
          tourPackageName: tourPackageName,
          paymentPlan: paymentPlan,
          selectedPaymentPlan: afterData.selectedPaymentPlan || null,
          stripePaymentId: paymentId,
        },
        targetType: "global", // All users with payment notifications enabled
        createdAt: Timestamp.now(),
        readBy: {}, // Empty initially - users mark as read individually
      };

      // Create notification document
      const notificationRef = await db
        .collection("notifications")
        .add(notificationData);

      logger.info(
        `✅ Notification created: ${notificationRef.id} for payment ${paymentId}`
      );

      // Optionally: Update the stripePayments doc to mark notification as sent
      await db.collection("stripePayments").doc(paymentId).update({
        notificationSent: true,
        notificationId: notificationRef.id,
        notificationSentAt: Timestamp.now(),
      });

      logger.info(`✅ Payment document updated with notification reference`);
    } catch (error) {
      logger.error("❌ Error in onStripePaymentSuccess:", error);
      // Don't throw to prevent retries
    }
  }
);
