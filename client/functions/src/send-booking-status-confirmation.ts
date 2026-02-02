import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import * as QRCode from "qrcode";
import GmailApiService from "./gmail-api-service";
import EmailTemplateService from "./email-template-service";

const db = getFirestore();

/**
 * Format date like Google Sheets: "Dec 2, 2025"
 */
function formatDateLikeSheets(dateValue: any): string {
  if (!dateValue) return "";

  try {
    let date: Date | null = null;

    if (dateValue && typeof dateValue === "object" && dateValue._seconds) {
      date = new Date(dateValue._seconds * 1000);
    } else if (
      dateValue &&
      typeof dateValue === "object" &&
      dateValue.seconds
    ) {
      date = new Date(dateValue.seconds * 1000);
    } else if (typeof dateValue === "string" && dateValue.trim() !== "") {
      const trimmedValue = dateValue.trim();
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
        return trimmedValue;
      }

      date = new Date(trimmedValue);
    } else if (dateValue instanceof Date) {
      date = dateValue;
    } else if (dateValue.toDate) {
      date = dateValue.toDate();
    }

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
    logger.warn("Error formatting date:", error);
    return "";
  }
}

/**
 * Get BCC list from bcc-users collection
 */
async function getBCCList(): Promise<string[]> {
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

/**
 * Generate QR code as base64 data URL
 */
async function generateQRCode(url: string): Promise<string> {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });
    return qrCodeDataURL;
  } catch (error) {
    logger.error("Error generating QR code:", error);
    throw new Error("Failed to generate QR code");
  }
}

/**
 * Callable function to send booking status confirmation email with QR code
 * This should be called after step 3 (payment selection) in /reservation-booking-form
 * or after step 2 in /guest-reservation
 */
export const sendBookingStatusConfirmation = onCall(
  {
    region: "asia-southeast1",
    timeoutSeconds: 540,
    memory: "1GiB",
    cors: true,
  },
  async (request) => {
    try {
      const { bookingDocumentId, email } = request.data;

      if (!bookingDocumentId) {
        throw new HttpsError(
          "invalid-argument",
          "bookingDocumentId is required",
        );
      }

      if (!email) {
        throw new HttpsError("invalid-argument", "email is required");
      }

      logger.info(
        `📧 Sending booking status confirmation for booking: ${bookingDocumentId}`,
      );

      // Get booking data
      const bookingDoc = await db
        .collection("bookings")
        .doc(bookingDocumentId)
        .get();

      if (!bookingDoc.exists) {
        throw new HttpsError("not-found", "Booking not found");
      }

      const bookingData = bookingDoc.data();

      if (!bookingData) {
        throw new HttpsError("not-found", "Booking data is empty");
      }

      // Verify email matches
      if (bookingData.emailAddress !== email) {
        throw new HttpsError(
          "permission-denied",
          "Email does not match booking",
        );
      }

      if (!bookingData.access_token) {
        throw new HttpsError(
          "failed-precondition",
          "Booking access token is missing",
        );
      }

      // Generate booking status URL
      const bookingStatusUrl = `${
        process.env.NEXT_PUBLIC_APP_URL || "https://admin.imheretravels.com/"
      }/booking-status/${bookingData.access_token}`;

      // Generate QR code
      logger.info("Generating QR code for URL:", bookingStatusUrl);
      const qrCodeDataURL = await generateQRCode(bookingStatusUrl);

      // Convert data URL to buffer for email attachment
      const qrCodeBuffer = Buffer.from(qrCodeDataURL.split(",")[1], "base64");

      // Get email template from Firestore
      logger.info("Loading email template from Firestore...");
      const templateDoc = await db
        .collection("emailTemplates")
        .doc("C8PKdv5BgAlTSFCm6wS3")
        .get();

      if (!templateDoc.exists) {
        throw new HttpsError(
          "not-found",
          "Email template 'Reservation Confirmed' not found",
        );
      }

      const templateData = templateDoc.data();
      if (!templateData) {
        throw new HttpsError("not-found", "Email template data is empty");
      }

      const emailTemplate = templateData.content;

      logger.info("Email template loaded successfully");

      // Calculate payment details
      const totalCost =
        bookingData.discountedTourCost || bookingData.originalTourCost || 0;
      const paid = bookingData.paid || 0;
      const remainingBalance = totalCost - paid;

      // Fetch tour package cover image for hero
      let tourPackageCoverImage = "";
      try {
        const tourPackageSnap = await db
          .collection("tourPackages")
          .where("name", "==", bookingData.tourPackageName)
          .limit(1)
          .get();
        if (!tourPackageSnap.empty) {
          const tourPackageData = tourPackageSnap.docs[0].data();
          tourPackageCoverImage = tourPackageData.media?.coverImage || "";
        }
      } catch (error) {
        logger.warn("Could not fetch tour package for cover image:", error);
      }

      // Prepare template variables
      const templateVariables: Record<string, any> = {
        fullName: bookingData.fullName || "",
        tourPackage: bookingData.tourPackageName || "",
        bookingId: bookingData.bookingId || bookingDocumentId,
        tourDate: formatDateLikeSheets(bookingData.tourDate),
        returnDate: formatDateLikeSheets(bookingData.returnDate),
        tourDuration: bookingData.tourDuration || "",
        bookingType: bookingData.bookingType || "",
        paymentPlan: bookingData.paymentPlan || "",
        totalCost: totalCost.toFixed(2),
        paid: paid.toFixed(2),
        remainingBalance: remainingBalance.toFixed(2),
        bookingStatusUrl: bookingStatusUrl,
        currentYear: new Date().getFullYear(),
        tourPackageCoverImage,
      };

      // Process template using EmailTemplateService (Nunjucks)
      const processedHtml = EmailTemplateService.processTemplate(
        emailTemplate,
        templateVariables,
      );

      const subject = `Booking Confirmed - ${bookingData.tourPackageName}`;

      // Get BCC list
      const bccList = await getBCCList();

      // Initialize Gmail service
      const gmailService = new GmailApiService();

      // Prepare email options with QR code as inline image
      const emailOptions: any = {
        to: email,
        subject,
        htmlContent: processedHtml,
        bcc: bccList,
        from: "Bella | ImHereTravels <bella@imheretravels.com>",
        attachments: [
          {
            filename: "qrcode.png",
            content: qrCodeBuffer,
            contentType: "image/png",
            cid: "qrcode", // Content ID for inline embedding
          },
        ],
      };

      // Send email
      const result = await gmailService.sendEmail(emailOptions);

      logger.info("Booking status confirmation email sent:", result.messageId);

      // Update booking with sent email info
      await db
        .collection("bookings")
        .doc(bookingDocumentId)
        .update({
          bookingStatusEmailSent: true,
          bookingStatusEmailSentAt: Timestamp.now(),
          bookingStatusEmailLink: `https://mail.google.com/mail/u/0/#sent/${result.messageId}`,
          lastModified: Timestamp.now(),
        });

      logger.info(
        `✅ Booking updated with email sent status: ${bookingDocumentId}`,
      );

      return {
        success: true,
        messageId: result.messageId,
        sentEmailLink: `https://mail.google.com/mail/u/0/#sent/${result.messageId}`,
        bookingStatusUrl: bookingStatusUrl,
      };
    } catch (error: any) {
      logger.error("❌ Error sending booking status confirmation:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        error.message || "Failed to send booking status confirmation",
      );
    }
  },
);
