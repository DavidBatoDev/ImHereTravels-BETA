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

// Helper function to format GBP currency
function formatGBP(value: number | string): string {
  if (!value) return "";
  return `£${Number(value).toFixed(2)}`;
}

// Helper function to handle Firestore Timestamps
function formatFirestoreDate(dateValue: any): string {
  if (!dateValue) return "";

  try {
    let date: Date | null = null;

    // Handle Firestore Timestamp objects
    if (dateValue && typeof dateValue === "object" && dateValue._seconds) {
      date = new Date(dateValue._seconds * 1000);
    }
    // Handle string dates
    else if (typeof dateValue === "string" && dateValue.trim() !== "") {
      date = new Date(dateValue);
    }
    // Handle Date objects
    else if (dateValue instanceof Date) {
      date = dateValue;
    }

    // Validate the date before formatting
    if (date && !isNaN(date.getTime())) {
      return date.toISOString().split("T")[0];
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

// Helper function to get BCC list (you can customize this)
function getBCCList(): string[] {
  // Return your BCC email addresses - removed Bella from BCC
  return [];
}

// Helper function to delete existing Gmail draft and local record
async function deleteExistingGmailDraft(bookingId: string): Promise<void> {
  try {
    const existingDrafts = await db
      .collection("emailDrafts")
      .where("bookingId", "==", bookingId)
      .where("gmailDraftId", "!=", null)
      .get();

    for (const draftDoc of existingDrafts.docs) {
      const draftData = draftDoc.data();
      const gmailDraftId = draftData.gmailDraftId;

      if (gmailDraftId) {
        try {
          // Delete Gmail draft
          await gmailService.deleteDraft(gmailDraftId);
          logger.info(`Deleted Gmail draft: ${gmailDraftId}`);
        } catch (error) {
          logger.warn(`Failed to delete Gmail draft ${gmailDraftId}:`, error);
          // Continue with local deletion even if Gmail deletion fails
        }
      }

      // Delete local record
      await draftDoc.ref.delete();
      logger.info(`Deleted local draft record: ${draftDoc.id}`);
    }
  } catch (error) {
    logger.error("Error deleting existing Gmail drafts:", error);
    throw error;
  }
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
      const { bookingId, generateDraftCell } = request.data;

      if (!bookingId) {
        throw new HttpsError("invalid-argument", "Booking ID is required");
      }

      logger.info(
        `Processing email draft for booking: ${bookingId}, generateDraftCell: ${generateDraftCell}`
      );

      // If generateDraftCell is false, delete existing drafts and return
      if (!generateDraftCell) {
        await deleteExistingGmailDraft(bookingId);

        // Update booking document to clear draft references
        await db.collection("bookings").doc(bookingId).update({
          emailDraftId: null,
          cancellationEmailDraftId: null,
          generateEmailDraft: false,
        });

        return {
          success: true,
          status: "deleted_draft",
          message: "Existing Gmail draft deleted successfully",
        };
      }

      logger.info(`Generating Gmail draft for booking: ${bookingId}`);

      // Get booking data
      const bookingDoc = await db.collection("bookings").doc(bookingId).get();
      if (!bookingDoc.exists) {
        throw new HttpsError("not-found", "Booking not found");
      }

      const bookingData = bookingDoc.data()!;
      logger.info(`Booking data:`, bookingData);

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
      logger.info(`Template data:`, templateData);

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
      const templateVariables: Record<string, any> = {
        fullName,
        mainBooker,
        tourPackage,
        tourDate: formatFirestoreDate(tourDateRaw),
        returnDate: formatFirestoreDate(returnDateRaw),
        availablePaymentTerms,
        tourDuration,
        bookingType,
        bookingId: bookingIdValue,
        groupId,
        reservationFee: formatGBP(reservationFee),
        remainingBalance: formatGBP(remainingBalance),
        fullPaymentAmount: formatGBP(fullPaymentAmount),
        fullPaymentDueDate: formatFirestoreDate(fullPaymentDueDate),
        p1Amount: formatGBP(p1Amount),
        p1DueDate: formatFirestoreDate(p1DueDate),
        p2Amount: formatGBP(p2Amount),
        p2DueDate: formatFirestoreDate(p2DueDate),
        p3Amount: formatGBP(p3Amount),
        p3DueDate: formatFirestoreDate(p3DueDate),
        p4Amount: formatGBP(p4Amount),
        p4DueDate: formatFirestoreDate(p4DueDate),
        isCancelled,
        cancelledRefundAmount: isCancelled ? formatGBP(reservationFee) : "",
      };

      logger.info(`Template variables:`, templateVariables);

      // Debug: Log each template variable to identify problematic dates
      Object.entries(templateVariables).forEach(([key, value]) => {
        if (typeof value === "string" && value.includes("Invalid time value")) {
          logger.error(`Problematic template variable: ${key} = ${value}`);
        }
      });

      // Process template content
      let processedHtml: string;
      try {
        processedHtml = EmailTemplateService.processTemplate(
          templateData.content,
          templateVariables
        );
        logger.info(`Processed HTML length:`, processedHtml.length);
      } catch (templateError) {
        logger.error(`Template processing error:`, templateError);
        logger.error(`Template variables causing error:`, templateVariables);
        throw new HttpsError(
          "internal",
          `Template processing failed: ${
            templateError instanceof Error
              ? templateError.message
              : String(templateError)
          }`
        );
      }

      // Check for existing Gmail drafts for this booking
      let existingGmailDraftId: string | null = null;
      try {
        const existingDrafts = await db
          .collection("emailDrafts")
          .where("bookingId", "==", bookingId)
          .where("gmailDraftId", "!=", null)
          .limit(1)
          .get();

        if (!existingDrafts.empty) {
          const existingDraftData = existingDrafts.docs[0].data();
          existingGmailDraftId = existingDraftData.gmailDraftId;
          logger.info(
            `Found existing Gmail draft ${existingGmailDraftId} for booking ${bookingId}, returning existing draft`
          );

          return {
            success: true,
            draftId: existingGmailDraftId,
            localDraftId: existingDrafts.docs[0].id,
            subject: existingDraftData.subject || subject,
            email: existingDraftData.to || email,
            isCancellation: existingDraftData.isCancellation || isCancelled,
            emailType:
              existingDraftData.emailType ||
              (isCancelled ? "cancellation" : "reservation"),
            status: "existing_gmail_draft",
            message:
              "Returned existing Gmail draft instead of creating new one",
          };
        }
      } catch (error) {
        logger.warn("Error checking for existing Gmail drafts:", error);
        // Continue with draft creation even if check fails
      }

      // Create Gmail draft using Gmail API service
      logger.info(
        `No existing Gmail draft found for booking ${bookingId}, creating new Gmail draft`
      );

      try {
        // Create Gmail draft
        const gmailDraftResult = await gmailService.createDraft({
          to: email,
          subject: subject,
          htmlContent: processedHtml,
          bcc: getBCCList(),
          from: "Bella | ImHereTravels <bella@imheretravels.com>",
        });

        logger.info(
          `Gmail draft created successfully: ${gmailDraftResult.draftId}`
        );

        // Create local record in emailDrafts collection for tracking
        const draftRef = db.collection("emailDrafts").doc();
        const localDraftId = draftRef.id;

        const emailDraftData = {
          id: localDraftId,
          gmailDraftId: gmailDraftResult.draftId, // Store Gmail draft ID
          messageId: gmailDraftResult.messageId,
          threadId: gmailDraftResult.threadId,
          to: email,
          subject: subject,
          htmlContent: processedHtml,
          bcc: getBCCList(),
          from: "Bella | ImHereTravels <bella@imheretravels.com>",
          emailType: isCancelled ? "cancellation" : "reservation",
          bookingId: bookingId,
          status: "gmail_draft",
          createdAt: new Date(),
          updatedAt: new Date(),
          // Additional metadata
          templateId: "BnRGgT6E8SVrXZH961LT",
          templateVariables: templateVariables,
          isCancellation: isCancelled,
          fullName: fullName,
          tourPackage: tourPackage,
        };

        // Save the local draft record
        await draftRef.set(emailDraftData);

        logger.info(
          `Local draft record created with ID: ${localDraftId} for Gmail draft: ${gmailDraftResult.draftId}`
        );

        return {
          success: true,
          draftId: gmailDraftResult.draftId,
          localDraftId: localDraftId,
          messageId: gmailDraftResult.messageId,
          threadId: gmailDraftResult.threadId,
          subject: subject,
          email: email,
          isCancellation: isCancelled,
          emailType: emailDraftData.emailType,
          status: "new_gmail_draft",
          message: "Created new Gmail draft",
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

      // Don't update booking document with error - just log it

      throw new HttpsError(
        "internal",
        `Failed to generate email draft: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
);
