import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import GmailApiService from "./gmail-api-service";

const db = getFirestore();

/**
 * Generate guest invitation link
 */
function generateGuestInvitationLink(
  parentBookingId: string,
  guestEmail: string
): string {
  // Use NEXT_PUBLIC_WEBSITE_URL from environment or fallback
  const baseUrl =
    process.env.NEXT_PUBLIC_WEBSITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  const params = new URLSearchParams({
    booking: parentBookingId,
    email: guestEmail,
  });
  return `${baseUrl}/guest-reservation?${params.toString()}`;
}

/**
 * Format date for display
 */
function formatDate(dateValue: any): string {
  if (!dateValue) return "";

  try {
    let date: Date | null = null;

    if (dateValue && typeof dateValue === "object" && dateValue._seconds) {
      date = new Date(dateValue._seconds * 1000);
    } else if (dateValue.toDate) {
      date = dateValue.toDate();
    } else if (typeof dateValue === "string") {
      date = new Date(dateValue);
    } else if (dateValue instanceof Date) {
      date = dateValue;
    }

    if (date && !isNaN(date.getTime())) {
      return date.toLocaleDateString("en-US", {
        month: "long",
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
 * Generate HTML email body for guest invitation
 */
function generateGuestInvitationEmailHtml(data: {
  guestEmail: string;
  mainBookerName: string;
  tourName: string;
  tourDate: string;
  invitationLink: string;
  expiresAt: string;
  depositAmount: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited to Join a Group Tour</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">
                You're Invited! 🎉
              </h1>
              <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">
                Join ${data.mainBookerName} on an amazing adventure
              </p>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hi there! 👋
              </p>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                <strong>${
                  data.mainBookerName
                }</strong> has invited you to join their group booking for an exciting tour with <strong>I'm Here Travels</strong>!
              </p>
              
              <!-- Tour Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 30px 0;">
                <tr>
                  <td style="padding: 24px;">
                    <h2 style="color: #667eea; margin: 0 0 16px 0; font-size: 20px; font-weight: 600;">
                      Tour Details
                    </h2>
                    
                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;">
                          <strong>Tour:</strong>
                        </td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0; text-align: right;">
                          ${data.tourName}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;">
                          <strong>Travel Date:</strong>
                        </td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0; text-align: right;">
                          ${data.tourDate}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0; border-top: 2px solid #e0e0e0;">
                          <strong>Initial Deposit:</strong>
                        </td>
                        <td style="color: #667eea; font-size: 18px; font-weight: 700; padding: 8px 0; text-align: right; border-top: 2px solid #e0e0e0;">
                          €${data.depositAmount}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Important Info -->
              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; margin: 30px 0; border-radius: 4px;">
                <p style="color: #856404; margin: 0; font-size: 14px; line-height: 1.5;">
                  ⏰ <strong>Important:</strong> This invitation expires on <strong>${
                    data.expiresAt
                  }</strong>. Complete your booking before then to secure your spot!
                </p>
              </div>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                To complete your reservation, simply click the button below and follow the steps to provide your details and make your initial deposit payment.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${data.invitationLink}" 
                       style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-size: 18px; font-weight: 600; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                      Complete My Booking
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; text-align: center;">
                Or copy and paste this link into your browser:<br>
                <a href="${
                  data.invitationLink
                }" style="color: #667eea; word-break: break-all;">
                  ${data.invitationLink}
                </a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-radius: 0 0 12px 12px;">
              <p style="color: #666666; font-size: 14px; margin: 0 0 10px 0;">
                Questions? We're here to help!
              </p>
              <p style="color: #666666; font-size: 14px; margin: 0;">
                Contact us at <a href="mailto:support@imheretravels.com" style="color: #667eea; text-decoration: none;">support@imheretravels.com</a>
              </p>
              <p style="color: #999999; font-size: 12px; margin: 20px 0 0 0;">
                © ${new Date().getFullYear()} I'm Here Travels. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Callable function to send guest invitation emails
 * Called after main booker completes their payment
 */
export const sendGuestInvitationEmails = onCall(
  {
    region: "asia-southeast1",
    timeoutSeconds: 300,
    memory: "512MiB",
    cors: true,
  },
  async (request) => {
    try {
      const { paymentDocId } = request.data;

      if (!paymentDocId) {
        throw new HttpsError("invalid-argument", "Missing paymentDocId");
      }

      logger.info(
        `Sending guest invitation emails for payment: ${paymentDocId}`
      );

      // 1. Fetch the payment document
      const paymentDocRef = db.collection("stripePayments").doc(paymentDocId);
      const paymentDoc = await paymentDocRef.get();

      if (!paymentDoc.exists) {
        throw new HttpsError("not-found", "Payment document not found");
      }

      const paymentData = paymentDoc.data();

      // 2. Verify this is a group/duo booking
      const bookingType = paymentData?.booking?.type || "";
      if (bookingType !== "Duo Booking" && bookingType !== "Group Booking") {
        logger.info("Not a group booking, skipping guest invitations");
        return { success: true, message: "Not a group booking" };
      }

      // 3. Get guest emails from additionalGuests
      const additionalGuests = paymentData?.booking?.additionalGuests || [];

      if (additionalGuests.length === 0) {
        logger.info("No additional guests found");
        return { success: true, message: "No guests to invite" };
      }

      // 4. Prepare invitation data
      const invitationExpiryDays = 7;
      const invitedAt = Timestamp.now();
      const expiresAt = Timestamp.fromDate(
        new Date(Date.now() + invitationExpiryDays * 24 * 60 * 60 * 1000)
      );

      const mainBookerName = `${paymentData?.customer?.firstName || ""} ${
        paymentData?.customer?.lastName || ""
      }`.trim();
      const tourName = paymentData?.tour?.packageName || "your tour";
      const tourDate = formatDate(paymentData?.tour?.date);

      // Fetch reservation fee from the main booker's booking document
      let depositAmount = "0.00";
      try {
        const mainBookingDocId = paymentData?.booking?.documentId;
        if (mainBookingDocId) {
          const bookingDocRef = db.collection("bookings").doc(mainBookingDocId);
          const bookingDoc = await bookingDocRef.get();
          if (bookingDoc.exists) {
            const bookingData = bookingDoc.data();
            // Use the reservationFee field instead of payment plan deposit
            const amount = bookingData?.reservationFee;
            if (amount) {
              depositAmount =
                typeof amount === "number" ? amount.toFixed(2) : String(amount);
            }
          }
        }
      } catch (error) {
        logger.warn("Error fetching reservation fee from booking:", error);
        // Continue with 0.00 fallback
      }

      // 5. Initialize Gmail API
      const gmailService = new GmailApiService();

      // 6. Send invitations to each guest
      const invitations: any[] = [];
      const sendResults = [];

      for (const guestEmail of additionalGuests) {
        try {
          // Generate invitation link
          const invitationLink = generateGuestInvitationLink(
            paymentDocId,
            guestEmail
          );

          // Generate email HTML
          const emailHtml = generateGuestInvitationEmailHtml({
            guestEmail,
            mainBookerName,
            tourName,
            tourDate,
            invitationLink,
            expiresAt: formatDate(expiresAt),
            depositAmount,
          });

          // Send email via Gmail API
          const emailSubject = `🎉 You're Invited to Join ${mainBookerName} on ${tourName}`;

          await gmailService.sendEmail({
            to: guestEmail,
            subject: emailSubject,
            htmlContent: emailHtml,
          });

          logger.info(`✅ Sent invitation to ${guestEmail}`);

          // Track invitation
          invitations.push({
            email: guestEmail,
            invitedAt,
            expiresAt,
            status: "pending",
          });

          sendResults.push({
            email: guestEmail,
            success: true,
          });
        } catch (emailError: any) {
          logger.error(
            `❌ Failed to send invitation to ${guestEmail}:`,
            emailError
          );

          invitations.push({
            email: guestEmail,
            invitedAt,
            expiresAt,
            status: "failed",
            error: emailError.message,
          });

          sendResults.push({
            email: guestEmail,
            success: false,
            error: emailError.message,
          });
        }
      }

      // 7. Update payment document with invitation records
      await paymentDocRef.update({
        guestInvitations: invitations,
        "timestamps.guestInvitationsSentAt": Timestamp.now(),
        "timestamps.updatedAt": Timestamp.now(),
      });

      logger.info(`✅ Guest invitations sent for ${paymentDocId}`);

      return {
        success: true,
        invitationsSent: sendResults.filter((r) => r.success).length,
        invitationsFailed: sendResults.filter((r) => !r.success).length,
        results: sendResults,
      };
    } catch (error: any) {
      logger.error("Error sending guest invitations:", error);
      throw new HttpsError(
        "internal",
        error.message || "Failed to send invitations"
      );
    }
  }
);
