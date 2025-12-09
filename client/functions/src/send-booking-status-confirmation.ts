import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import * as QRCode from "qrcode";
import GmailApiService from "./gmail-api-service";
import EmailTemplateService from "./email-template-service";

const db = getFirestore();

/**
 * Generate receipt HTML for attachment
 */
function generateReceiptHtml(data: {
  bookingId: string;
  tourName: string;
  reservationFee: number;
  currency: string;
  email: string;
  travelDate: string;
  paymentDate: string;
}): string {
  const currencySymbol =
    data.currency === "GBP" ? "£" : data.currency === "EUR" ? "€" : "$";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt - ${data.bookingId}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 40px;
      background-color: white;
    }
    .receipt-container {
      max-width: 700px;
      margin: 0 auto;
      background-color: white;
    }
    .receipt-header {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
      padding: 40px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .receipt-header-left h1 {
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    .receipt-header-left p {
      font-size: 16px;
      opacity: 0.95;
    }
    .receipt-header-right {
      text-align: right;
    }
    .receipt-header-right .label {
      font-size: 12px;
      opacity: 0.85;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 6px;
    }
    .receipt-header-right .value {
      font-family: 'Courier New', monospace;
      font-size: 16px;
      font-weight: 600;
    }
    .receipt-body {
      padding: 40px;
    }
    .amount-paid {
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 24px;
      margin-bottom: 30px;
    }
    .amount-paid .label {
      font-size: 13px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 10px;
      font-weight: 600;
    }
    .amount-paid .value {
      font-size: 40px;
      font-weight: bold;
      color: #111827;
      margin-bottom: 12px;
    }
    .payment-date {
      display: flex;
      justify-content: space-between;
      font-size: 15px;
    }
    .payment-date .label {
      color: #6b7280;
    }
    .payment-date .value {
      color: #111827;
      font-weight: 600;
    }
    .summary {
      background-color: #f9fafb;
      border-radius: 10px;
      padding: 24px;
      margin-bottom: 30px;
    }
    .summary h2 {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 18px;
      font-weight: 700;
    }
    .summary-item {
      display: flex;
      justify-content: space-between;
      padding: 14px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .summary-item:last-child {
      border-bottom: none;
    }
    .summary-item .label {
      font-size: 15px;
      color: #6b7280;
    }
    .summary-item .value {
      font-size: 15px;
      font-weight: 700;
      color: #111827;
    }
    .booking-details h2 {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 18px;
      font-weight: 700;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 14px 0;
      border-bottom: 1px solid #f3f4f6;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-row .label {
      font-size: 15px;
      color: #6b7280;
    }
    .detail-row .value {
      font-size: 15px;
      color: #111827;
      font-weight: 500;
    }
    .detail-row .value.mono {
      font-family: 'Courier New', monospace;
      font-weight: 600;
    }
    .footer {
      padding-top: 30px;
      border-top: 2px solid #e5e7eb;
      margin-top: 30px;
    }
    .footer p {
      font-size: 13px;
      color: #9ca3af;
      text-align: center;
      margin: 10px 0;
      line-height: 1.6;
    }
    .footer a {
      color: #ef4444;
      text-decoration: none;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="receipt-header">
      <div class="receipt-header-left">
        <h1>Receipt</h1>
        <p>from I'm Here Travels</p>
      </div>
      <div class="receipt-header-right">
        <div class="label">RECEIPT</div>
        <div class="value">#${data.bookingId}</div>
      </div>
    </div>
    <div class="receipt-body">
      <div class="amount-paid">
        <div class="label">Amount Paid</div>
        <div class="value">${currencySymbol}${data.reservationFee.toFixed(2)}</div>
        <div class="payment-date">
          <span class="label">Date Paid</span>
          <span class="value">${data.paymentDate}</span>
        </div>
      </div>
      <div class="summary">
        <h2>Summary</h2>
        <div class="summary-item">
          <span class="label">Pay Balance Instalment</span>
          <span class="value">${currencySymbol}${data.reservationFee.toFixed(2)}</span>
        </div>
      </div>
      <div class="booking-details">
        <h2>Booking Details</h2>
        <div class="detail-row">
          <span class="label">Booking ID</span>
          <span class="value mono">${data.bookingId}</span>
        </div>
        <div class="detail-row">
          <span class="label">Tour</span>
          <span class="value">${data.tourName}</span>
        </div>
        <div class="detail-row">
          <span class="label">Travel Date</span>
          <span class="value">${data.travelDate}</span>
        </div>
        <div class="detail-row">
          <span class="label">Email</span>
          <span class="value">${data.email}</span>
        </div>
      </div>
      <div class="footer">
        <p>
          If you have any questions, contact us at
          <a href="mailto:amer@imheretravels.com">amer@imheretravels.com</a> or call us at
          <a href="tel:+447712283331">+44 7712 283331</a>
        </p>
        <p>
          You're receiving this email because you made a purchase at I'm Here Travels, which
          partners with Stripe to provide invoicing and payment processing.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
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
          "bookingDocumentId is required"
        );
      }

      if (!email) {
        throw new HttpsError("invalid-argument", "email is required");
      }

      logger.info(
        `📧 Sending booking status confirmation for booking: ${bookingDocumentId}`
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
          "Email does not match booking"
        );
      }

      // Generate booking status URL
      const bookingStatusUrl = `${
        process.env.NEXT_PUBLIC_APP_URL || "https://im-here-travels.vercel.app/"
      }/booking-status/${bookingDocumentId}?email=${encodeURIComponent(email)}`;

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
          "Email template 'Reservation Confirmed' not found"
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
      };

      // Process template using EmailTemplateService (Nunjucks)
      const processedHtml = EmailTemplateService.processTemplate(
        emailTemplate,
        templateVariables
      );

      const subject = `Booking Confirmed - ${bookingData.tourPackageName}`;

      // Get BCC list
      const bccList = await getBCCList();

      // Initialize Gmail service
      const gmailService = new GmailApiService();

      // Generate receipt HTML
      logger.info("Generating receipt HTML...");
      const receiptHtml = generateReceiptHtml({
        bookingId: bookingData.bookingId || bookingDocumentId,
        tourName: bookingData.tourPackageName || "Tour",
        reservationFee: bookingData.reservationFee || paid,
        currency: "GBP",
        email: email,
        travelDate: formatDateLikeSheets(bookingData.tourDate) || "",
        paymentDate: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      });

      // Prepare email options with QR code and receipt as attachments
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
          {
            filename: `Receipt-${bookingData.bookingId || bookingDocumentId}.html`,
            content: Buffer.from(receiptHtml, "utf-8"),
            contentType: "text/html",
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
        `✅ Booking updated with email sent status: ${bookingDocumentId}`
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
        error.message || "Failed to send booking status confirmation"
      );
    }
  }
);
