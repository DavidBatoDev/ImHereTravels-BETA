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

// Helper function to format GBP currency
function formatGBP(value: number | string): string {
  if (!value) return "";

  // If it's already a string with £, return as-is to avoid double £
  if (typeof value === "string" && value.includes("£")) {
    return value;
  }

  // Convert to number and format
  const numValue = Number(value);
  if (isNaN(numValue)) return "";

  return `£${numValue.toFixed(2)}`;
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
    // Handle string dates (including comma-separated dates like P2/P3/P4)
    else if (typeof dateValue === "string" && dateValue.trim() !== "") {
      const trimmedValue = dateValue.trim();

      // Check if it's already in the correct format from P2/P3/P4 functions
      // These functions already return formatted strings like "Dec 2, 2025, Jan 2, 2026"
      // If the string contains a month name (Jan, Feb, etc.), assume it's already formatted
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
        // Already formatted by P2/P3/P4 functions, return as-is
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

// Helper function to generate subject line based on payment terms
function getSubjectLine(
  availablePaymentTerms: string,
  fullName: string,
  tourPackage: string,
  isCancelled: boolean = false
): string {
  if (isCancelled) {
    return `Important Update: Your ${tourPackage} has been Cancelled`;
  }

  switch (availablePaymentTerms) {
    case "Invalid":
      return "Action Required: Issue with your Booking - Please Review";
    case "Full payment required within 48hrs":
      return `Action Required: Complete your Booking for ${tourPackage}`;
    case "P1":
      return `Hi ${fullName}, Complete your Booking for ${tourPackage}`;
    case "P2":
      return "Choose a Payment Plan to Confirm your Tour";
    case "P3":
    case "P4":
      return `Confirm your Spot on ${tourPackage} with a Flexible Payment Plan`;
    default:
      return "Booking Confirmation: Please Review your Details";
  }
}

// Helper function to get main booker by group ID
async function getMainBookerByGroupId(groupId: string): Promise<string | null> {
  try {
    const bookingsSnap = await db
      .collection("bookings")
      .where("groupIdGroupIdGenerator", "==", groupId)
      .where("isMainBooker", "==", true)
      .limit(1)
      .get();

    if (bookingsSnap.empty) return null;

    const booking = bookingsSnap.docs[0].data();
    const firstName = booking.firstName || "";
    const lastName = booking.lastName || "";
    return `${firstName} ${lastName}`.trim();
  } catch (error) {
    logger.error("Error getting main booker:", error);
    return null;
  }
}

// Helper function to get BCC list from request or return empty array
function getBCCList(bccFromRequest?: string[]): string[] {
  // Use BCC list from request if provided, otherwise return empty array
  return bccFromRequest || [];
}

// Main function to generate email draft
export const generateReservationEmail = onCall(
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
        `Processing email draft for booking: ${bookingId}, generateDraftCell: ${generateDraftCell}, includeBCC: ${
          bcc ? "yes" : "no"
        }`
      );

      // If generateDraftCell is false, just return without doing anything
      // No need to delete since we're not storing local drafts anymore
      if (!generateDraftCell) {
        return {
          success: true,
          status: "skipped",
          message: "Draft generation skipped as requested",
        };
      }

      logger.info(`Generating Gmail draft for booking: ${bookingId}`);

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

      // Get template data
      const templateDoc = await db
        .collection("emailTemplates")
        .doc("BnRGgT6E8SVrXZH961LT")
        .get();
      if (!templateDoc.exists) {
        throw new HttpsError("not-found", "Email template not found");
      }

      const templateData = templateDoc.data()!;
      logger.info(`Email template retrieved`);

      // Extract booking data for template variables
      const fullName = bookingData.fullName || "";
      const bookingIdValue = bookingData.bookingId || "";
      const groupId = bookingData.groupIdGroupIdGenerator || "";
      const tourPackage = bookingData.tourPackageName || "";
      const tourDateRaw = bookingData.tourDate;
      const returnDateRaw = bookingData.returnDate;
      const tourDuration = bookingData.tourDuration || "";
      const bookingType = bookingData.bookingType || "";
      const reservationFee = bookingData.reservationFee || 0;
      const remainingBalance = bookingData.remainingBalance || 0;
      const fullPaymentAmount = bookingData.fullPaymentAmount || 0;
      const fullPaymentDueDate = bookingData.fullPaymentDueDate;
      const p1Amount = bookingData.p1Amount || 0;
      const p1DueDate = bookingData.p1DueDate;
      const p2Amount = bookingData.p2Amount || 0;
      const p2DueDate = bookingData.p2DueDate;
      const p3Amount = bookingData.p3Amount || 0;
      const p3DueDate = bookingData.p3DueDate;
      const p4Amount = bookingData.p4Amount || 0;
      const p4DueDate = bookingData.p4DueDate;
      const availablePaymentTerms = bookingData.availablePaymentTerms || "";
      const reasonForCancellation = bookingData.reasonForCancellation || "";

      // Determine if this is a cancellation email
      const isCancelled =
        availablePaymentTerms === "Cancelled" || !!reasonForCancellation;

      // Generate subject line
      const subject = getSubjectLine(
        availablePaymentTerms,
        fullName,
        tourPackage,
        isCancelled
      );

      // Get main booker for group bookings
      let mainBooker = fullName;
      if (
        (bookingType === "Group Booking" || bookingType === "Duo Booking") &&
        groupId
      ) {
        const mainBookerResult = await getMainBookerByGroupId(groupId);
        mainBooker = mainBookerResult || fullName;
      }

      // Prepare template variables
      // Note: reservationFee is passed as raw number because template has hardcoded £
      // Payment amounts are formatted with £ as template doesn't have hardcoded £
      const templateVariables: Record<string, any> = {
        fullName,
        mainBooker,
        tourPackage,
        tourDate: formatDateLikeSheets(tourDateRaw),
        returnDate: formatDateLikeSheets(returnDateRaw),
        availablePaymentTerms,
        tourDuration,
        bookingType,
        bookingId: bookingIdValue,
        groupId,
        reservationFee: Number(reservationFee).toFixed(2), // Raw number - template adds £
        remainingBalance: formatGBP(remainingBalance),
        fullPaymentAmount: formatGBP(fullPaymentAmount),
        fullPaymentDueDate: formatDateLikeSheets(fullPaymentDueDate),
        p1Amount: formatGBP(p1Amount),
        p1DueDate: formatDateLikeSheets(p1DueDate),
        p2Amount: formatGBP(p2Amount),
        p2DueDate: formatDateLikeSheets(p2DueDate),
        p3Amount: formatGBP(p3Amount),
        p3DueDate: formatDateLikeSheets(p3DueDate),
        p4Amount: formatGBP(p4Amount),
        p4DueDate: formatDateLikeSheets(p4DueDate),
        isCancelled,
        cancelledRefundAmount: isCancelled
          ? Number(reservationFee).toFixed(2)
          : "", // Raw for template's £
      };

      logger.info(`Template variables prepared for booking: ${bookingId}`);

      // Process template content
      let processedHtml: string;
      try {
        processedHtml = EmailTemplateService.processTemplate(
          templateData.content,
          templateVariables
        );
        logger.info(
          `Template processed successfully, HTML length: ${processedHtml.length}`
        );
      } catch (templateError) {
        logger.error(`Template processing error:`, templateError);
        throw new HttpsError(
          "internal",
          `Template processing failed: ${
            templateError instanceof Error
              ? templateError.message
              : String(templateError)
          }`
        );
      }

      // Create Gmail draft using Gmail API service
      logger.info(`Creating Gmail draft for booking: ${bookingId}`);

      try {
        // Get BCC list from request
        const bccList = getBCCList(bcc);

        if (bccList.length > 0) {
          logger.info(
            `Including ${bccList.length} BCC recipients in email draft`
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
          `Gmail draft created successfully: ${gmailDraftResult.draftId}`
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
          isCancellation: isCancelled,
          emailType: isCancelled ? "cancellation" : "reservation",
          status: "gmail_draft_created",
          message: `Gmail draft created successfully. Click the URL to open: ${draftUrl}`,
        };
      } catch (gmailError) {
        logger.error("Error creating Gmail draft:", gmailError);
        throw new HttpsError(
          "internal",
          `Failed to create Gmail draft: ${
            gmailError instanceof Error
              ? gmailError.message
              : String(gmailError)
          }`
        );
      }
    } catch (error) {
      logger.error("Error generating email draft:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        `Failed to generate email draft: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
);
