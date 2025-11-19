import { onCall, HttpsError } from "firebase-functions/v2/https";
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

// Initialize Gmail API Service
const gmailService = new GmailApiService();

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
        trimmedValue.includes(month)
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
      });
    }

    return "";
  } catch (error) {
    console.warn("Error formatting date:", error, "Value:", dateValue);
    return "";
  }
}

// Helper function to get BCC list from request or return empty array
function getBCCList(bccFromRequest?: string[]): string[] {
  // Use BCC list from request if provided, otherwise return empty array
  return bccFromRequest || [];
}

// Main function to generate cancellation email draft
export const generateCancellationEmail = onCall(
  {
    region: "asia-southeast1",
    maxInstances: 10,
    timeoutSeconds: 300,
    memory: "1GiB",
    cors: true,
  },
  async (request) => {
    try {
      const { bookingId, generateDraftCell, bcc } = request.data;

      if (!bookingId) {
        throw new HttpsError("invalid-argument", "Booking ID is required");
      }

      logger.info(
        `Processing cancellation email draft for booking: ${bookingId}, generateDraftCell: ${generateDraftCell}, includeBCC: ${
          bcc ? "yes" : "no"
        }`
      );

      // If generateDraftCell is false, just return without doing anything
      if (!generateDraftCell) {
        return {
          success: true,
          status: "skipped",
          message: "Cancellation draft generation skipped as requested",
        };
      }

      logger.info(
        `Generating cancellation Gmail draft for booking: ${bookingId}`
      );

      // Get booking data
      const bookingDoc = await db.collection("bookings").doc(bookingId).get();
      if (!bookingDoc.exists) {
        throw new HttpsError("not-found", "Booking not found");
      }

      const bookingData = bookingDoc.data()!;
      logger.info(`Booking data retrieved for booking: ${bookingId}`);

      // Validate email
      const email = (bookingData.emailAddress as string)?.trim();
      if (!email || !email.includes("@")) {
        throw new HttpsError("invalid-argument", `Invalid email: "${email}"`);
      }

      // Get cancellation template data (template ID: wQK3bh1S9KJdfQJG7cEI)
      const templateDoc = await db
        .collection("emailTemplates")
        .doc("wQK3bh1S9KJdfQJG7cEI")
        .get();
      if (!templateDoc.exists) {
        throw new HttpsError(
          "not-found",
          "Cancellation email template not found"
        );
      }

      const templateData = templateDoc.data()!;
      logger.info(`Cancellation email template retrieved`);

      // Extract booking data for template variables
      const fullName = bookingData.fullName || "";
      const tourPackage = bookingData.tourPackageName || "";
      const tourDateRaw = bookingData.tourDate;
      const reservationFee = bookingData.reservationFee || 0;

      // Generate subject line for cancellation
      const subject = `Important Update: Your ${tourPackage} has been Cancelled`;

      // Prepare template variables (only the ones needed by cancellation template)
      // Note: All payment amounts are passed as raw numbers (e.g., "150.00")
      // because the template has hardcoded £ symbols
      const templateVariables: Record<string, any> = {
        fullName,
        tourPackage,
        tourDate: formatDateLikeSheets(tourDateRaw),
        cancelledRefundAmount: Number(reservationFee).toFixed(2), // Raw number - template adds £
      };

      logger.info(
        `Cancellation template variables prepared for booking: ${bookingId}`
      );

      // Process template content
      let processedHtml: string;
      try {
        processedHtml = EmailTemplateService.processTemplate(
          templateData.content,
          templateVariables
        );
        logger.info(
          `Cancellation template processed successfully, HTML length: ${processedHtml.length}`
        );
      } catch (templateError) {
        logger.error(`Cancellation template processing error:`, templateError);
        throw new HttpsError(
          "internal",
          `Cancellation template processing failed: ${
            templateError instanceof Error
              ? templateError.message
              : String(templateError)
          }`
        );
      }

      // Create Gmail draft using Gmail API service
      logger.info(
        `Creating cancellation Gmail draft for booking: ${bookingId}`
      );

      try {
        // Get BCC list from request
        const bccList = getBCCList(bcc);

        if (bccList.length > 0) {
          logger.info(
            `Including ${bccList.length} BCC recipients in cancellation email draft`
          );
        }

        // Create Gmail draft in Bella's account
        const gmailDraftResult = await gmailService.createDraft({
          to: email,
          subject: subject,
          htmlContent: processedHtml,
          bcc: bccList,
          from: "Bella | ImHereTravels <bella@imheretravels.com>",
        });

        logger.info(
          `Cancellation Gmail draft created successfully: ${gmailDraftResult.draftId}`
        );

        // Generate the Gmail draft URL using messageId for compose parameter
        const draftUrl = getGmailDraftUrl(
          gmailDraftResult.draftId,
          gmailDraftResult.messageId
        );

        return {
          success: true,
          draftId: gmailDraftResult.draftId,
          draftUrl: draftUrl,
          messageId: gmailDraftResult.messageId,
          threadId: gmailDraftResult.threadId,
          subject: subject,
          email: email,
          fullName: fullName,
          tourPackage: tourPackage,
          isCancellation: true,
          emailType: "cancellation",
          status: "gmail_draft_created",
          message: `Cancellation Gmail draft created successfully. Click the URL to open: ${draftUrl}`,
        };
      } catch (gmailError) {
        logger.error("Error creating cancellation Gmail draft:", gmailError);
        throw new HttpsError(
          "internal",
          `Failed to create cancellation Gmail draft: ${
            gmailError instanceof Error
              ? gmailError.message
              : String(gmailError)
          }`
        );
      }
    } catch (error) {
      logger.error("Error generating cancellation email draft:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        `Failed to generate cancellation email draft: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
);
