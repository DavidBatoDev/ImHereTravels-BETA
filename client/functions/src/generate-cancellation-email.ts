import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import EmailTemplateService from "./email-template-service";
import GmailApiService from "./gmail-api-service";
import * as dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  initializeApp();
}
const db = getFirestore();

// Helper function to generate Gmail draft URL
function getGmailDraftUrl(draftId: string, messageId: string): string {
  return `https://mail.google.com/mail/u/0/#drafts?compose=${messageId}`;
}

// Helper function to format dates like Google Sheets: "Dec 2, 2025"
function formatDateLikeSheets(dateValue: any): string {
  if (!dateValue) return "";

  try {
    let date: Date | null = null;

    // Handle Firestore Timestamp objects
    if (dateValue && typeof dateValue === "object" && dateValue._seconds) {
      date = new Date(dateValue._seconds * 1000);
    }
    // Handle string dates
    else if (typeof dateValue === "string" && dateValue.trim() !== "") {
      const trimmedValue = dateValue.trim();

      // Check if it's already in the correct format
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const hasMonthName = monthNames.some((month) =>
        trimmedValue.includes(month),
      );

      if (hasMonthName) {
        // Already formatted, return as-is
        return trimmedValue;
      }

      // Otherwise, try to parse and format the date
      date = new Date(trimmedValue);
    }
    // Handle Date objects
    else if (dateValue instanceof Date) {
      date = dateValue;
    }

    // Validate and format the date
    if (date && !isNaN(date.getTime())) {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "Asia/Manila",
      });
    }

    return "";
  } catch (error) {
    console.warn("Error formatting date:", error, "Value:", dateValue);
    return "";
  }
}

// Helper function to get BCC list from includeBcc flag
async function getBCCList(includeBcc: boolean): Promise<string[]> {
  if (!includeBcc) return [];

  try {
    const bccUsersSnap = await db.collection("bcc-users").get();
    const bccList = bccUsersSnap.docs
      .map((doc) => doc.data())
      .filter((user: any) => user.isActive === true)
      .map((user: any) => user.email)
      .filter((email: string) => email && email.trim() !== "");

    logger.info(`Found ${bccList.length} active BCC users`);
    return bccList;
  } catch (error) {
    logger.error("Error fetching BCC users:", error);
    return [];
  }
}

// Helper function to extract message ID from Gmail URL
function extractMessageIdFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const composeParam = urlObj.searchParams.get("compose");
    if (composeParam) return composeParam;

    const hash = urlObj.hash;
    const composeMatch = hash.match(/compose=([^&]+)/);
    if (composeMatch) return composeMatch[1];

    const pathMatch = hash.match(/#drafts\/([^?&]+)/);
    if (pathMatch) return pathMatch[1];

    return null;
  } catch (error) {
    logger.error("Error parsing draft URL:", error);
    return null;
  }
}

/**
 * Firestore trigger that runs when a booking document is updated
 * Detects when generateCancellationDraft changes and:
 * - When toggled ON: Creates Gmail draft and updates cancellationEmailDraftLink & subjectLineCancellation
 * - When toggled OFF: Deletes Gmail draft and clears cancellationEmailDraftLink & subjectLineCancellation
 */
export const onGenerateCancellationDraftChanged = onDocumentUpdated(
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
        `📧 Checking generateCancellationDraft for booking: ${bookingId}`,
      );

      // Check if generateCancellationDraft changed
      const wasEnabled = beforeData.generateCancellationDraft === true;
      const isNowEnabled = afterData.generateCancellationDraft === true;

      logger.info("Generate cancellation draft status:", {
        wasEnabled,
        isNowEnabled,
        beforeValue: beforeData.generateCancellationDraft,
        afterValue: afterData.generateCancellationDraft,
      });

      // No change detected
      if (wasEnabled === isNowEnabled) {
        logger.info("No change in generateCancellationDraft status, skipping");
        return;
      }

      // Initialize Gmail API service
      const gmailService = new GmailApiService();

      // TOGGLE OFF: Delete draft and clear fields
      if (wasEnabled && !isNowEnabled) {
        logger.info(
          "🗑️ Generate cancellation draft toggled OFF - deleting draft",
        );

        const existingDraftUrl = afterData.cancellationEmailDraftLink;
        logger.info(`Existing draft URL from afterData: ${existingDraftUrl}`);

        if (existingDraftUrl) {
          try {
            // Extract message ID from the URL
            const messageId = extractMessageIdFromUrl(existingDraftUrl);
            logger.info(`Extracted message ID from URL: ${messageId}`);

            if (messageId) {
              // Find the actual draft ID using the message ID
              logger.info(`Finding draft ID for message ID: ${messageId}`);
              const draftId =
                await gmailService.findDraftIdByMessageId(messageId);

              if (draftId) {
                logger.info(`Found draft ID: ${draftId}, deleting...`);
                await gmailService.deleteDraft(draftId);
                logger.info("✅ Cancellation Gmail draft deleted successfully");
              } else {
                logger.warn(
                  `Could not find draft with message ID: ${messageId}`,
                );
              }
            } else {
              logger.warn("Could not extract message ID from URL");
            }
          } catch (deleteError) {
            logger.error(
              "❌ Error deleting cancellation Gmail draft:",
              deleteError,
            );
            // Continue to clear fields even if deletion fails
          }
        } else {
          logger.info("No existing draft URL found, skipping deletion");
        }

        // Clear the email draft link and subject line
        await db.collection("bookings").doc(bookingId).update({
          cancellationEmailDraftLink: "",
          subjectLineCancellation: "",
        });

        logger.info("Cancellation email draft fields cleared successfully");
        return;
      }

      // TOGGLE ON: Create draft and update fields
      if (!wasEnabled && isNowEnabled) {
        logger.info(
          "✅ Generate cancellation draft toggled ON - creating draft",
        );

        const bookingData = afterData;

        // Validate email
        const email = (bookingData.emailAddress as string)?.trim();
        if (!email || !email.includes("@")) {
          logger.warn(`Invalid email address: "${email}"`);
          return;
        }

        // Delete existing draft if it exists
        const existingDraftUrl = bookingData.cancellationEmailDraftLink;
        if (existingDraftUrl) {
          try {
            // Extract message ID from the URL
            const messageId = extractMessageIdFromUrl(existingDraftUrl);
            if (messageId) {
              // Find the actual draft ID using the message ID
              logger.info(
                "Finding existing draft to delete before creating new one",
              );
              const draftId =
                await gmailService.findDraftIdByMessageId(messageId);

              if (draftId) {
                logger.info(`Deleting existing draft with ID: ${draftId}`);
                await gmailService.deleteDraft(draftId);
                logger.info("Existing draft deleted successfully");
              }
            }
          } catch (deleteError) {
            logger.error("Error deleting existing draft:", deleteError);
          }
        }

        // Get template data (cancellation template ID: wQK3bh1S9KJdfQJG7cEI)
        const templateDoc = await db
          .collection("emailTemplates")
          .doc("wQK3bh1S9KJdfQJG7cEI")
          .get();

        if (!templateDoc.exists) {
          logger.error("Cancellation email template not found");
          return;
        }

        const templateData = templateDoc.data()!;

        // Extract booking data for template variables
        const fullName = bookingData.fullName || "";
        const tourPackage = bookingData.tourPackageName || "";
        const tourDateRaw = bookingData.tourDate;
        const reservationFee = bookingData.reservationFee || 0;

        // Extract cancellation-related fields
        const cancellationScenario = bookingData.cancellationScenario || "N/A";
        const cancellationRequestDate =
          bookingData.cancellationRequestDate || "";
        const eligibleRefund = bookingData.eligibleRefund || "N/A";
        const refundableAmount = bookingData.refundableAmount || 0;
        const nonRefundableAmount = bookingData.nonRefundableAmount || 0;
        const adminFee = bookingData.adminFee || 0;
        const supplierCostsCommitted = bookingData.supplierCostsCommitted || 0;
        const paymentPlan = bookingData.paymentPlan || "";
        const reasonForCancellation = bookingData.reasonForCancellation || "";

        // Extract days before tour from cancellationScenario
        // Format: "Guest Cancel Early (Full Payment) (125 days before tour)"
        let daysBeforeTour = 0;
        const daysMatch = cancellationScenario.match(
          /(\d+)\s+days\s+before\s+tour/,
        );
        if (daysMatch) {
          daysBeforeTour = parseInt(daysMatch[1]);
        }

        // Determine timing window
        let timingWindow = "N/A";
        if (daysBeforeTour >= 100) {
          timingWindow = "Early";
        } else if (daysBeforeTour >= 60) {
          timingWindow = "Mid-Range";
        } else if (daysBeforeTour > 0) {
          timingWindow = "Late";
        }

        // Determine who initiated cancellation
        let initiatedBy = "Guest"; // default
        if (
          reasonForCancellation.startsWith("IHT -") ||
          reasonForCancellation.startsWith("IHT-")
        ) {
          initiatedBy = "IHT";
        } else if (
          reasonForCancellation.startsWith("Guest -") ||
          reasonForCancellation.startsWith("Guest-")
        ) {
          initiatedBy = "Guest";
        }

        // Fetch tour package to get cover image
        let tourPackageCoverImage = "";
        try {
          const tourPackageSnap = await db
            .collection("tourPackages")
            .where("name", "==", tourPackage)
            .limit(1)
            .get();

          if (!tourPackageSnap.empty) {
            const tourPackageData = tourPackageSnap.docs[0].data();
            tourPackageCoverImage = tourPackageData.media?.coverImage || "";
            logger.info(
              `Found tour package cover image: ${tourPackageCoverImage ? "yes" : "no"}`,
            );
          } else {
            logger.info(`Tour package not found for: ${tourPackage}`);
          }
        } catch (error) {
          logger.warn("Could not fetch tour package for cover image:", error);
        }

        // Generate subject line for cancellation
        const subject = `Important Update: Your ${tourPackage} has been Cancelled`;

        // Prepare template variables
        const templateVariables: Record<string, any> = {
          fullName,
          tourPackage,
          tourDate: formatDateLikeSheets(tourDateRaw),
          reservationFee: Number(reservationFee).toFixed(2),
          cancelledRefundAmount: Number(reservationFee).toFixed(2),
          tourPackageCoverImage,
          // Cancellation details
          cancellationScenario,
          cancellationRequestDate: formatDateLikeSheets(
            cancellationRequestDate,
          ),
          eligibleRefund,
          refundableAmount: Number(refundableAmount).toFixed(2),
          nonRefundableAmount: Number(nonRefundableAmount).toFixed(2),
          adminFee: Number(adminFee).toFixed(2),
          supplierCostsCommitted: Number(supplierCostsCommitted).toFixed(2),
          // Contextual variables
          daysBeforeTour,
          timingWindow,
          initiatedBy,
          paymentPlan,
          reasonForCancellation,
        };

        // Process template content
        let processedHtml: string;
        try {
          processedHtml = EmailTemplateService.processTemplate(
            templateData.content,
            templateVariables,
          );
          logger.info(
            `Cancellation template processed successfully, HTML length: ${processedHtml.length}`,
          );
        } catch (templateError) {
          logger.error(
            `Cancellation template processing error:`,
            templateError,
          );
          return;
        }

        // Get BCC list
        const includeBcc = bookingData.includeBccCancellation === true;
        const bccList = await getBCCList(includeBcc);

        if (bccList.length > 0) {
          logger.info(
            `Including ${bccList.length} BCC recipients in cancellation email draft`,
          );
        }

        // Create Gmail draft
        try {
          const gmailDraftResult = await gmailService.createDraft({
            to: email,
            subject: subject,
            htmlContent: processedHtml,
            bcc: bccList,
            from: "Bella | ImHereTravels <bella@imheretravels.com>",
          });

          logger.info(
            `Cancellation Gmail draft created successfully: ${gmailDraftResult.draftId}`,
          );

          // Generate the Gmail draft URL
          const draftUrl = getGmailDraftUrl(
            gmailDraftResult.draftId,
            gmailDraftResult.messageId,
          );

          // Update booking with draft URL and subject
          await db.collection("bookings").doc(bookingId).update({
            cancellationEmailDraftLink: draftUrl,
            subjectLineCancellation: subject,
          });

          logger.info(
            `✅ Cancellation email draft created and booking updated with URL and subject`,
          );
        } catch (gmailError) {
          logger.error("Error creating cancellation Gmail draft:", gmailError);
          // Don't throw error, just log it
        }
      }
    } catch (error) {
      logger.error("❌ Error in onGenerateCancellationDraftChanged:", error);
      // Don't throw error to prevent retries
    }
  },
);
