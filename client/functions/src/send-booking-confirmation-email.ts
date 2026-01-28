import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { logger } from "firebase-functions";
import GmailApiService from "./gmail-api-service";
import EmailTemplateService from "./email-template-service";

const db = getFirestore();
const storage = getStorage();

/**
 * Format date like Google Sheets: "Dec 2, 2025"
 */
function formatDateLikeSheets(dateValue: any): string {
  if (!dateValue) return "";

  try {
    let date: Date | null = null;

    if (dateValue && typeof dateValue === "object" && dateValue._seconds) {
      date = new Date(dateValue._seconds * 1000);
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
 * Callable function to send booking confirmation email
 */
export const sendBookingConfirmationEmail = onCall(
  {
    region: "asia-southeast1",
    timeoutSeconds: 540,
    memory: "1GiB",
    cors: true,
  },
  async (request) => {
    try {
      const { confirmedBookingId } = request.data;

      if (!confirmedBookingId) {
        throw new HttpsError(
          "invalid-argument",
          "confirmedBookingId is required",
        );
      }

      logger.info(
        `📧 Sending confirmation email for booking: ${confirmedBookingId}`,
      );

      // Get confirmed booking
      const confirmedBookingDoc = await db
        .collection("confirmedBookings")
        .doc(confirmedBookingId)
        .get();

      if (!confirmedBookingDoc.exists) {
        throw new HttpsError("not-found", "Confirmed booking not found");
      }

      const confirmedBooking = confirmedBookingDoc.data();

      if (!confirmedBooking) {
        throw new HttpsError("not-found", "Confirmed booking data is empty");
      }

      // Get booking data
      const bookingDoc = await db
        .collection("bookings")
        .doc(confirmedBooking.bookingDocumentId)
        .get();

      if (!bookingDoc.exists) {
        throw new HttpsError("not-found", "Booking not found");
      }

      const bookingData = bookingDoc.data();

      if (!bookingData) {
        throw new HttpsError("not-found", "Booking data is empty");
      }

      // Get pre-departure pack if exists
      let preDeparturePackData: any = null;
      if (confirmedBooking.preDeparturePackId) {
        const packDoc = await db
          .collection("preDeparturePack")
          .doc(confirmedBooking.preDeparturePackId)
          .get();

        if (packDoc.exists) {
          preDeparturePackData = packDoc.data();
        }
      }

      // Get email template
      const gmailService = new GmailApiService();

      const templateDoc = await db
        .collection("emailTemplates")
        .doc("DqdAH8Vez5tl1mJffTMI")
        .get();

      if (!templateDoc.exists) {
        throw new HttpsError("not-found", "Email template not found");
      }

      const templateData = templateDoc.data();

      if (!templateData) {
        throw new HttpsError("not-found", "Email template data is empty");
      }

      // Determine payment plan and build HTML table rows for selected terms
      const paymentPlan = bookingData.paymentPlan || "";
      const selectedTermsHtml: string[] = [];

      // Helper function to create table row
      const createTableRow = (
        term: string,
        amount: string,
        dueDate: string,
        datePaid: string,
      ) => {
        return `<tr>
        <td style="padding: 10px; border: 1px solid black;">${term}</td>
        <td style="padding: 10px; border: 1px solid black;">£${amount}</td>
        <td style="padding: 10px; border: 1px solid black;">${dueDate}</td>
        <td style="padding: 10px; border: 1px solid black;">${datePaid}</td>
      </tr>`;
      };

      // Build table rows based on payment plan
      if (paymentPlan.includes("Full Payment")) {
        selectedTermsHtml.push(
          createTableRow(
            "Full Payment",
            Number(bookingData.fullPaymentAmount || 0).toFixed(2),
            formatDateLikeSheets(bookingData.fullPaymentDueDate),
            formatDateLikeSheets(bookingData.fullPaymentDatePaid),
          ),
        );
      } else {
        // Add P1 if exists
        if (bookingData.p1Amount) {
          selectedTermsHtml.push(
            createTableRow(
              "P1",
              Number(bookingData.p1Amount || 0).toFixed(2),
              formatDateLikeSheets(bookingData.p1DueDate),
              formatDateLikeSheets(bookingData.p1DatePaid),
            ),
          );
        }
        // Add P2 if exists
        if (bookingData.p2Amount) {
          selectedTermsHtml.push(
            createTableRow(
              "P2",
              Number(bookingData.p2Amount || 0).toFixed(2),
              formatDateLikeSheets(bookingData.p2DueDate),
              formatDateLikeSheets(bookingData.p2DatePaid),
            ),
          );
        }
        // Add P3 if exists
        if (bookingData.p3Amount) {
          selectedTermsHtml.push(
            createTableRow(
              "P3",
              Number(bookingData.p3Amount || 0).toFixed(2),
              formatDateLikeSheets(bookingData.p3DueDate),
              formatDateLikeSheets(bookingData.p3DatePaid),
            ),
          );
        }
        // Add P4 if exists
        if (bookingData.p4Amount) {
          selectedTermsHtml.push(
            createTableRow(
              "P4",
              Number(bookingData.p4Amount || 0).toFixed(2),
              formatDateLikeSheets(bookingData.p4DueDate),
              formatDateLikeSheets(bookingData.p4DatePaid),
            ),
          );
        }
      }

      // Fetch tour package to get cover image
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
        bookingReference: confirmedBooking.bookingReference || "",
        tourDate: formatDateLikeSheets(bookingData.tourDate),
        returnDate: formatDateLikeSheets(bookingData.returnDate),
        tourDuration: bookingData.tourDuration || "",
        bookingType: bookingData.bookingType || "",
        selectedTerms: selectedTermsHtml.join("\n"),
        paid: Number(bookingData.paid || 0).toFixed(2),
        fullPaymentAmount: Number(bookingData.fullPaymentAmount || 0).toFixed(
          2,
        ),
        fullPaymentDueDate: formatDateLikeSheets(
          bookingData.fullPaymentDueDate,
        ),
        fullPaymentDatePaid: formatDateLikeSheets(
          bookingData.fullPaymentDatePaid,
        ),
        p1Amount: Number(bookingData.p1Amount || 0).toFixed(2),
        p1DueDate: formatDateLikeSheets(bookingData.p1DueDate),
        p1DatePaid: formatDateLikeSheets(bookingData.p1DatePaid),
        p2Amount: Number(bookingData.p2Amount || 0).toFixed(2),
        p2DueDate: formatDateLikeSheets(bookingData.p2DueDate),
        p2DatePaid: formatDateLikeSheets(bookingData.p2DatePaid),
        p3Amount: Number(bookingData.p3Amount || 0).toFixed(2),
        p3DueDate: formatDateLikeSheets(bookingData.p3DueDate),
        p3DatePaid: formatDateLikeSheets(bookingData.p3DatePaid),
        p4Amount: Number(bookingData.p4Amount || 0).toFixed(2),
        p4DueDate: formatDateLikeSheets(bookingData.p4DueDate),
        p4DatePaid: formatDateLikeSheets(bookingData.p4DatePaid),
        tourPackageCoverImage,
      };

      // Process template
      const processedHtml = EmailTemplateService.processTemplate(
        templateData.content,
        templateVariables,
      );

      const subject = `Reservation Confirmed for ${bookingData.tourPackageName}: ${confirmedBooking.bookingReference}`;

      // Get BCC list
      const bccList = await getBCCList();

      // Prepare email options
      const emailOptions: any = {
        to: bookingData.emailAddress,
        subject,
        htmlContent: processedHtml,
        bcc: bccList,
        from: "Bella | ImHereTravels <bella@imheretravels.com>",
      };

      // Attach pre-departure pack if available
      if (
        preDeparturePackData &&
        preDeparturePackData.fileDownloadURL &&
        preDeparturePackData.storagePath
      ) {
        logger.info(
          "Attaching pre-departure pack:",
          preDeparturePackData.fileName,
        );

        try {
          // Download file from Firebase Storage
          const bucket = storage.bucket();
          const file = bucket.file(preDeparturePackData.storagePath);

          const [fileBuffer] = await file.download();

          emailOptions.attachments = [
            {
              filename: preDeparturePackData.fileName,
              content: fileBuffer,
              contentType: preDeparturePackData.contentType,
            },
          ];
        } catch (error) {
          logger.error("Error downloading pre-departure pack:", error);
          // Continue without attachment
        }
      }

      // Send email
      const result = await gmailService.sendEmail(emailOptions);

      logger.info("Booking confirmation email sent:", result.messageId);

      // Update confirmed booking status
      await db
        .collection("confirmedBookings")
        .doc(confirmedBookingId)
        .update({
          status: "sent",
          sentEmailLink: `https://mail.google.com/mail/u/0/#sent/${result.messageId}`,
          sentAt: Timestamp.now(),
          lastModified: Timestamp.now(),
        });

      logger.info(`✅ Confirmed booking updated: ${confirmedBookingId}`);

      return {
        success: true,
        messageId: result.messageId,
        sentEmailLink: `https://mail.google.com/mail/u/0/#sent/${result.messageId}`,
      };
    } catch (error: any) {
      logger.error("❌ Error sending booking confirmation email:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        error.message || "Failed to send confirmation email",
      );
    }
  },
);
