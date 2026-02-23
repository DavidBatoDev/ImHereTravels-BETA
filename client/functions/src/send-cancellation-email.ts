import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import GmailApiService from "./gmail-api-service";
import * as dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  initializeApp();
}
const db = getFirestore();

/**
 * Extract message ID from Gmail draft URL
 * Examples:
 * - https://mail.google.com/mail/u/0/#drafts?compose=abc123xyz -> abc123xyz
 */
function extractMessageIdFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const composeParam = urlObj.searchParams.get("compose");
    if (composeParam) {
      return composeParam;
    }

    const hash = urlObj.hash;
    const composeMatch = hash.match(/compose=([^&]+)/);
    if (composeMatch) {
      return composeMatch[1];
    }

    return null;
  } catch (error) {
    logger.error("Error parsing URL:", error);
    return null;
  }
}

/**
 * Generate Gmail sent email URL
 */
function getGmailSentUrl(messageId: string): string {
  return `https://mail.google.com/mail/u/0/#sent/${messageId}`;
}

/**
 * Format date with PH time: "Dec 2, 2025, 3:45 PM (PH)"
 */
function formatDateWithPHTime(dateValue: any): string {
  if (!dateValue) return "";

  try {
    let date: Date | null = null;

    if (dateValue && typeof dateValue === "object" && dateValue._seconds) {
      date = new Date(dateValue._seconds * 1000);
    } else if (typeof dateValue === "string" && dateValue.trim() !== "") {
      date = new Date(dateValue.trim());
    } else if (dateValue instanceof Date) {
      date = dateValue;
    }

    if (date && !isNaN(date.getTime())) {
      // Format date part
      const datePart = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "Asia/Manila",
      });

      // Format time part in PH timezone
      const timePart = date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Manila",
      });

      return `${datePart}, ${timePart} (PH)`;
    }

    return "";
  } catch (error) {
    logger.warn("Error formatting date:", error, "Value:", dateValue);
    return "";
  }
}

/**
 * Firestore trigger that runs when a booking document is updated
 * Detects when sendCancellationEmail changes from false to true and:
 * - Sends the cancellation email draft
 * - Updates sentCancellationEmailLink and cancellationEmailSentDate fields
 */
export const onSendCancellationEmailChanged = onDocumentUpdated(
  {
    document: "bookings/{bookingId}",
    region: "asia-southeast1",
    timeoutSeconds: 300,
    memory: "1GiB",
  },
  async (event) => {
    try {
      const bookingId = event.params.bookingId as string;
      const beforeData = event.data?.before.data();
      const afterData = event.data?.after.data();

      if (!beforeData || !afterData) {
        logger.info("No data found in before or after snapshot");
        return;
      }

      logger.info(
        `📧 Checking sendCancellationEmail for booking: ${bookingId}`,
      );

      // Check if sendCancellationEmail changed from false to true
      const wasEnabled = beforeData.sendCancellationEmail === true;
      const isNowEnabled = afterData.sendCancellationEmail === true;

      logger.info("Send cancellation email status:", {
        wasEnabled,
        isNowEnabled,
        beforeValue: beforeData.sendCancellationEmail,
        afterValue: afterData.sendCancellationEmail,
      });

      // Only proceed if changed from false to true (toggled ON)
      if (!wasEnabled && isNowEnabled) {
        logger.info(
          "✅ Send cancellation email toggled ON - sending cancellation email",
        );

        const bookingData = afterData;
        const draftUrl = bookingData.cancellationEmailDraftLink;

        if (!draftUrl) {
          logger.warn("No cancellation draft URL found, skipping email send");
          return;
        }

        // Extract messageId from the draft URL
        const messageId = extractMessageIdFromUrl(draftUrl);

        if (!messageId) {
          logger.error(
            "Could not extract message ID from cancellation draft URL",
          );
          return;
        }

        logger.info(`Extracted message ID: ${messageId}`);

        // Initialize Gmail API service
        const gmailService = new GmailApiService();

        // Find the draft by message ID
        const draftId = await gmailService.findDraftIdByMessageId(messageId);

        if (!draftId) {
          logger.error(
            "Cancellation draft not found with the given message ID",
          );
          return;
        }

        logger.info(`Found cancellation draft with ID: ${draftId}`);

        // Send the draft
        try {
          const result = await gmailService.sendDraft(draftId);
          logger.info(
            "Cancellation draft sent successfully:",
            result.messageId,
          );

          // Generate the sent email URL
          const sentUrl = getGmailSentUrl(result.messageId);

          // Get current date with PH time for sent date
          const sentDate = formatDateWithPHTime(new Date());

          // Update booking with sent email link and sent date
          await db.collection("bookings").doc(bookingId).update({
            sentCancellationEmailLink: sentUrl,
            cancellationEmailSentDate: sentDate,
          });

          logger.info(
            `✅ Cancellation email sent successfully and booking updated with sent URL and date`,
          );

          // Create notification for sent cancellation email
          try {
            const travelerName =
              bookingData.fullName || bookingData.travelerName || "Customer";
            const tourPackageName = bookingData.tourPackageName || "Tour";
            const recipientEmail =
              bookingData.emailAddress || bookingData.email || "customer";

            await db.collection("notifications").add({
              type: "reservation_email",
              title: "Cancellation Email Sent",
              body: `Cancellation email sent to ${travelerName} (${recipientEmail}) for ${tourPackageName}`,
              data: {
                bookingId: bookingData.bookingId || bookingId,
                bookingDocumentId: bookingId,
                travelerName,
                tourPackageName,
                recipientEmail,
                emailUrl: sentUrl,
              },
              targetType: "global",
              targetUserIds: [],
              createdAt: new Date(),
              readBy: {},
            });

            logger.info("✅ Notification created for sent cancellation email");
          } catch (notificationError) {
            logger.warn("Failed to create notification:", notificationError);
            // Fail silently - don't block the email sending process
          }
        } catch (sendError) {
          logger.error("Error sending cancellation email draft:", sendError);
          // Don't throw error, just log it
        }
      } else {
        logger.info(
          "No action needed - sendCancellationEmail not toggled from false to true",
        );
      }
    } catch (error) {
      logger.error("❌ Error in onSendCancellationEmailChanged:", error);
      // Don't throw error to prevent retries
    }
  },
);
