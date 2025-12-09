import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";

const db = getFirestore();

/**
 * Format date like "Dec 8, 2025"
 */
function formatDate(dateValue: any): string {
  if (!dateValue) return "";

  try {
    let date: Date | null = null;

    if (dateValue && typeof dateValue === "object" && dateValue._seconds) {
      date = new Date(dateValue._seconds * 1000);
    } else if (typeof dateValue === "string" && dateValue.trim() !== "") {
      date = new Date(dateValue.trim());
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
 * Generate receipt HTML
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

  return `
<!DOCTYPE html>
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
    .footer a:hover {
      text-decoration: underline;
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
</html>
  `;
}

/**
 * Callable function to generate receipt HTML/PDF for a booking
 * Note: For PDF generation, you would need to add puppeteer to dependencies
 * and use it here to convert HTML to PDF
 */
export const generateReceipt = onCall(
  {
    region: "asia-southeast1",
    timeoutSeconds: 120,
    memory: "512MiB",
    cors: true,
  },
  async (request: CallableRequest) => {
    try {
      const { bookingDocumentId } = request.data;

      if (!bookingDocumentId) {
        throw new HttpsError(
          "invalid-argument",
          "bookingDocumentId is required"
        );
      }

      logger.info(`📄 Generating receipt for booking: ${bookingDocumentId}`);

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

      // Extract receipt data
      const receiptData = {
        bookingId: bookingData.bookingId || bookingDocumentId,
        tourName: bookingData.tour?.name || "Tour",
        reservationFee: bookingData.reservationFee || 0,
        currency: "GBP",
        email: bookingData.email || "",
        travelDate: formatDate(bookingData.tourDate) || "",
        paymentDate: formatDate(new Date()),
      };

      // Generate receipt HTML
      const receiptHtml = generateReceiptHtml(receiptData);

      logger.info(`✅ Receipt generated for booking: ${bookingDocumentId}`);

      return {
        success: true,
        receiptData,
        receiptHtml,
      };
    } catch (error: any) {
      logger.error("❌ Error generating receipt:", error);
      throw new HttpsError("internal", error.message || "Failed to generate receipt");
    }
  }
);
