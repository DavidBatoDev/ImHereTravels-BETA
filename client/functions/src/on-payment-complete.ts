import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { logger } from "firebase-functions";
import GmailApiService from "./gmail-api-service";
import EmailTemplateService from "./email-template-service";
import * as dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  initializeApp();
}
const db = getFirestore();
const storage = getStorage();

/**
 * Generate booking reference
 * Format: IMT-{tourDate:yyyy-MM-dd}-{tourCode}-{counter:0000}
 */
async function generateBookingReference(
  tourPackageName: string,
  tourDate: Timestamp
): Promise<string> {
  try {
    // Get tour code from tourPackages collection
    const tourPackagesSnap = await db
      .collection("tourPackages")
      .where("name", "==", tourPackageName)
      .limit(1)
      .get();

    let tourCode = "XXX"; // Default if not found
    if (!tourPackagesSnap.empty) {
      const tourData = tourPackagesSnap.docs[0].data();
      tourCode = tourData.tourCode || "XXX";
    }

    // Format tour date as yyyy-MM-dd
    const date = tourDate.toDate();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const formattedDate = `${year}-${month}-${day}`;

    // Count existing bookings for this tour package (using transaction for accuracy)
    const confirmedBookingsSnap = await db
      .collection("confirmedBookings")
      .where("tourPackageName", "==", tourPackageName)
      .orderBy("createdAt", "asc")
      .get();

    const counter = confirmedBookingsSnap.size + 1;
    const formattedCounter = String(counter).padStart(4, "0");

    return `IMT-${formattedDate}-${tourCode}-${formattedCounter}`;
  } catch (error) {
    logger.error("Error generating booking reference:", error);
    throw new Error("Failed to generate booking reference");
  }
}

/**
 * Find pre-departure pack by tour package name
 */
async function findPreDeparturePackByTourPackage(
  tourPackageName: string
): Promise<{ id: string; data: any } | null> {
  try {
    const packsSnap = await db.collection("preDeparturePack").get();

    for (const doc of packsSnap.docs) {
      const packData = doc.data();
      const tourPackages = packData.tourPackages || [];

      const found = tourPackages.some(
        (tp: any) =>
          tp.tourPackageName.toLowerCase().trim() ===
          tourPackageName.toLowerCase().trim()
      );

      if (found) {
        return { id: doc.id, data: packData };
      }
    }

    return null;
  } catch (error) {
    logger.error("Error finding pre-departure pack:", error);
    return null;
  }
}

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
        trimmedValue.includes(month)
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
 * Send booking confirmation email with pre-departure pack
 */
async function sendBookingConfirmationEmail(
  bookingData: any,
  preDeparturePackData: any | null
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const gmailService = new GmailApiService();

    // Get email template by querying for name "Confirmation Booking"
    const templateQuery = await db
      .collection("emailTemplates")
      .where("name", "==", "Confirmation Booking")
      .where("status", "==", "active")
      .limit(1)
      .get();

    if (templateQuery.empty) {
      logger.warn("Booking confirmation template not found");
      return { success: false, error: "Email template not found" };
    }

    const templateDoc = templateQuery.docs[0];
    const templateData = templateDoc.data();

    // Determine payment plan and build HTML table rows for selected terms
    const paymentPlan = bookingData.paymentPlan || "";
    const selectedTermsHtml: string[] = [];

    // Helper function to create table row
    const createTableRow = (
      term: string,
      amount: string,
      dueDate: string,
      datePaid: string
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
          formatDateLikeSheets(bookingData.fullPaymentDatePaid)
        )
      );
    } else {
      // Add P1 if exists
      if (bookingData.p1Amount) {
        selectedTermsHtml.push(
          createTableRow(
            "P1",
            Number(bookingData.p1Amount || 0).toFixed(2),
            formatDateLikeSheets(bookingData.p1DueDate),
            formatDateLikeSheets(bookingData.p1DatePaid)
          )
        );
      }
      // Add P2 if exists
      if (bookingData.p2Amount) {
        selectedTermsHtml.push(
          createTableRow(
            "P2",
            Number(bookingData.p2Amount || 0).toFixed(2),
            formatDateLikeSheets(bookingData.p2DueDate),
            formatDateLikeSheets(bookingData.p2DatePaid)
          )
        );
      }
      // Add P3 if exists
      if (bookingData.p3Amount) {
        selectedTermsHtml.push(
          createTableRow(
            "P3",
            Number(bookingData.p3Amount || 0).toFixed(2),
            formatDateLikeSheets(bookingData.p3DueDate),
            formatDateLikeSheets(bookingData.p3DatePaid)
          )
        );
      }
      // Add P4 if exists
      if (bookingData.p4Amount) {
        selectedTermsHtml.push(
          createTableRow(
            "P4",
            Number(bookingData.p4Amount || 0).toFixed(2),
            formatDateLikeSheets(bookingData.p4DueDate),
            formatDateLikeSheets(bookingData.p4DatePaid)
          )
        );
      }
    }

    // Prepare template variables
    const templateVariables: Record<string, any> = {
      fullName: bookingData.fullName || "",
      tourPackage: bookingData.tourPackageName || "",
      bookingReference: bookingData.bookingReference || "",
      tourDate: formatDateLikeSheets(bookingData.tourDate),
      returnDate: formatDateLikeSheets(bookingData.returnDate),
      tourDuration: bookingData.tourDuration || "",
      bookingType: bookingData.bookingType || "",
      selectedTerms: selectedTermsHtml.join("\n"),
      paid: Number(bookingData.paid || 0).toFixed(2),
      fullPaymentAmount: Number(bookingData.fullPaymentAmount || 0).toFixed(2),
      fullPaymentDueDate: formatDateLikeSheets(bookingData.fullPaymentDueDate),
      fullPaymentDatePaid: formatDateLikeSheets(
        bookingData.fullPaymentDatePaid
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
    };

    // Process template
    const processedHtml = EmailTemplateService.processTemplate(
      templateData.content,
      templateVariables
    );

    const subject = `Booking Confirmed for ${bookingData.tourPackageName}: ${bookingData.bookingReference}`;

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
    if (preDeparturePackData && preDeparturePackData.fileDownloadURL) {
      logger.info(
        "Attaching pre-departure pack:",
        preDeparturePackData.fileName
      );

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
    }

    // Send email
    const result = await gmailService.sendEmail(emailOptions);

    logger.info("Booking confirmation email sent:", result.messageId);

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error: any) {
    logger.error("Error sending booking confirmation email:", error);
    return {
      success: false,
      error: error.message || "Failed to send email",
    };
  }
}

/**
 * Firestore trigger that runs when a booking document is updated
 * Detects when paymentProgress changes to "100%" and creates confirmed booking
 */
export const onPaymentComplete = onDocumentUpdated(
  {
    document: "bookings/{bookingId}",
    region: "asia-southeast1",
    timeoutSeconds: 540,
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

      logger.info(`💳 Checking payment progress for booking: ${bookingId}`);

      // Check if paymentProgress changed to "100%"
      const wasComplete = beforeData.paymentProgress === "100%";
      const isNowComplete = afterData.paymentProgress === "100%";

      logger.info("Payment progress status:", {
        wasComplete,
        isNowComplete,
        beforeValue: beforeData.paymentProgress,
        afterValue: afterData.paymentProgress,
      });

      // Only proceed if changed to 100%
      if (wasComplete || !isNowComplete) {
        logger.info("No action needed - payment not newly completed");
        return;
      }

      logger.info("✅ Payment completed - processing confirmed booking");

      // Check if confirmed booking already exists
      const existingConfirmedBooking = await db
        .collection("confirmedBookings")
        .where("bookingDocumentId", "==", bookingId)
        .limit(1)
        .get();

      if (!existingConfirmedBooking.empty) {
        logger.info("Confirmed booking already exists, skipping");
        return;
      }

      // Get pre-departure configuration
      const configDoc = await db
        .collection("config")
        .doc("pre-departure")
        .get();

      const config = configDoc.exists
        ? configDoc.data()
        : { automaticSends: false };
      const automaticSends = config?.automaticSends === true;

      logger.info("Pre-departure config:", { automaticSends });

      // Find pre-departure pack
      const preDeparturePack = await findPreDeparturePackByTourPackage(
        afterData.tourPackageName
      );

      if (preDeparturePack) {
        logger.info(
          "Found pre-departure pack:",
          preDeparturePack.data.fileName
        );
      } else {
        logger.info("No pre-departure pack found for this tour package");
      }

      // Generate booking reference
      const bookingReference = await generateBookingReference(
        afterData.tourPackageName,
        afterData.tourDate
      );

      logger.info("Generated booking reference:", bookingReference);

      // Prepare confirmed booking data
      const confirmedBookingData: any = {
        bookingDocumentId: bookingId,
        bookingId: afterData.bookingId || "",
        tourPackageName: afterData.tourPackageName || "",
        tourDate: afterData.tourDate,
        preDeparturePackId: preDeparturePack?.id || null,
        preDeparturePackName: preDeparturePack?.data.fileName || null,
        status: "created",
        createdAt: Timestamp.now(),
        lastModified: Timestamp.now(),
        bookingReference,
        tags: [],
      };

      // If automatic sends is enabled, send email
      if (automaticSends) {
        logger.info(
          "🚀 Automatic sends enabled - attempting to send confirmation email",
          {
            hasPreDeparturePack: !!preDeparturePack,
            packName: preDeparturePack?.data.fileName || "N/A",
          }
        );

        const emailResult = await sendBookingConfirmationEmail(
          { ...afterData, bookingReference },
          preDeparturePack?.data || null
        );

        if (emailResult.success && emailResult.messageId) {
          confirmedBookingData.status = "sent";
          confirmedBookingData.sentEmailLink = `https://mail.google.com/mail/u/0/#sent/${emailResult.messageId}`;
          confirmedBookingData.sentAt = Timestamp.now();

          logger.info("✅ Email sent successfully:", emailResult.messageId);
        } else {
          logger.error("❌ Email sending failed:", emailResult.error);
          // Still create the confirmed booking with "created" status
        }
      } else {
        logger.info(
          "📝 Automatic sends disabled - booking created with 'created' status"
        );
      }

      // Create confirmed booking document
      const confirmedBookingRef = await db
        .collection("confirmedBookings")
        .add(confirmedBookingData);

      logger.info(
        `✅ Confirmed booking created: ${confirmedBookingRef.id} (${confirmedBookingData.status})`
      );
    } catch (error) {
      logger.error("❌ Error in onPaymentComplete:", error);
      // Don't throw error to prevent retries
    }
  }
);
