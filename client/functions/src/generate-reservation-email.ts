import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
// @ts-ignore
const { google } = require("googleapis");
import EmailTemplateService from "./email-template-service";
import * as dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  initializeApp();
}
const db = getFirestore();

// Gmail API setup with OAuth2
const getGmailClient = () => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_OAUTH2_CLIENT_ID,
    process.env.GMAIL_OAUTH2_CLIENT_SECRET,
    "urn:ietf:wg:oauth:2.0:oob" // For desktop apps
  );

  // Set the refresh token
  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_OAUTH2_REFRESH_TOKEN,
  });

  return google.gmail({ version: "v1", auth: oauth2Client });
};

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
  // Return your BCC email addresses
  return ["bella@imheretravels.com"];
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

      if (!generateDraftCell) {
        throw new HttpsError(
          "invalid-argument",
          "generateDraftCell must be true"
        );
      }

      logger.info(`Generating email draft for booking: ${bookingId}`);

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

      // Check for existing drafts with same recipient and subject
      const gmail = getGmailClient();

      try {
        const existingDrafts = await gmail.users.drafts.list({
          userId: "me",
          q: `in:drafts to:${email} subject:"${subject}"`,
        });

        if (
          existingDrafts.data.drafts &&
          existingDrafts.data.drafts.length > 0
        ) {
          logger.warn(
            `Found ${existingDrafts.data.drafts.length} existing drafts for ${email}`
          );
          throw new HttpsError(
            "already-exists",
            `A draft with the same recipient (${email}) and subject ("${subject}") already exists. Please delete it manually from Gmail before generating a new one.`
          );
        }
      } catch (error) {
        if (error instanceof HttpsError) throw error;
        logger.warn("Error checking existing drafts:", error);
        // Continue with draft creation even if check fails
      }

      // Prepare email message
      const message = {
        to: email,
        subject: subject,
        htmlBody: processedHtml,
        bcc: getBCCList(),
        from: "Bella | ImHereTravels <bella@imheretravels.com>",
      };

      // Create draft using Gmail API
      const draft = await gmail.users.drafts.create({
        userId: "me",
        requestBody: {
          message: {
            raw: Buffer.from(
              `To: ${message.to}\r\n` +
                `Subject: ${message.subject}\r\n` +
                `From: ${message.from}\r\n` +
                `Bcc: ${message.bcc.join(", ")}\r\n` +
                `Content-Type: text/html; charset=UTF-8\r\n\r\n` +
                message.htmlBody
            )
              .toString("base64")
              .replace(/\+/g, "-")
              .replace(/\//g, "_")
              .replace(/=+$/, ""),
          },
        },
      });

      const messageId = draft.data.message?.id;
      if (!messageId) {
        throw new HttpsError(
          "internal",
          "Failed to create draft - no message ID returned"
        );
      }

      // Generate Gmail compose URL
      const composeUrl = `https://mail.google.com/mail/u/0/#drafts?compose=${messageId}`;

      logger.info(`Draft created successfully for ${email}: ${composeUrl}`);

      // Update booking document with draft link and subject
      const updateData: any = {
        emailDraftLink: composeUrl,
        generateEmailDraft: false, // Reset the trigger
      };

      if (!isCancelled) {
        updateData.subjectLineReservation = subject;
      } else {
        updateData.subjectLineCancellation = subject;
        updateData.cancellationEmailDraftLink = composeUrl;
      }

      await db.collection("bookings").doc(bookingId).update(updateData);

      return {
        success: true,
        draftLink: composeUrl,
        subject: subject,
        messageId: messageId,
        email: email,
        isCancellation: isCancelled,
      };
    } catch (error) {
      logger.error("Error generating email draft:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      // Update booking document with error
      if (request.data.bookingId) {
        try {
          await db
            .collection("bookings")
            .doc(request.data.bookingId)
            .update({
              emailDraftLink: `ERROR: ${
                error instanceof Error ? error.message : String(error)
              }`,
              generateEmailDraft: false,
            });
        } catch (updateError) {
          logger.error(
            "Error updating booking with error message:",
            updateError
          );
        }
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
