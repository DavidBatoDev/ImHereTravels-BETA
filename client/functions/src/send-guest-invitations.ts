import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import GmailApiService from "./gmail-api-service";
import EmailTemplateService from "./email-template-service";

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
 * Load and process guest invitation email template
 */
async function generateGuestInvitationEmailHtml(data: {
  guestEmail: string;
  mainBookerName: string;
  tourName: string;
  tourDate: string;
  invitationLink: string;
  expiresAt: string;
  depositAmount: string;
}): Promise<string> {
  try {
    // Try to fetch template from Firestore emailTemplates collection
    // You'll need to create a template document for guest invitations
    const templateDoc = await db
      .collection("emailTemplates")
      .doc("5FZyQvXECyl3a2poPW2g") // You can change this ID
      .get();

    let templateHtml: string;

    if (templateDoc.exists) {
      // Use template from Firestore - template is stored in 'content' field
      templateHtml = templateDoc.data()?.content || "";
      logger.info("Using guest invitation template from Firestore");
    } else {
      // Fallback: load from file system (for local development)
      logger.warn(
        "Guest invitation template not found in Firestore, attempting file system fallback"
      );
      const fs = await import("fs");
      const path = await import("path");
      const templatePath = path.join(
        __dirname,
        "../emails/guestInvitation.html"
      );
      templateHtml = fs.readFileSync(templatePath, "utf-8");
    }

    // Process template with variables
    const currentYear = new Date().getFullYear().toString();
    const processedHtml = EmailTemplateService.processTemplate(templateHtml, {
      ...data,
      currentYear,
    });

    return processedHtml;
  } catch (error) {
    logger.error("Error loading guest invitation template:", error);
    // Return a basic fallback HTML if template loading fails
    return `
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h1>You're Invited!</h1>
          <p>Hi there! ${data.mainBookerName} has invited you to join their group booking for ${data.tourName}.</p>
          <p><strong>Tour Date:</strong> ${data.tourDate}</p>
          <p><strong>Initial Deposit:</strong> €${data.depositAmount}</p>
          <p><a href="${data.invitationLink}" style="display: inline-block; background-color: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Complete My Booking</a></p>
          <p><small>This invitation expires on ${data.expiresAt}</small></p>
        </body>
      </html>
    `;
  }
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

          // Generate email HTML using template
          const emailHtml = await generateGuestInvitationEmailHtml({
            guestEmail,
            mainBookerName,
            tourName,
            tourDate,
            invitationLink,
            expiresAt: formatDate(expiresAt),
            depositAmount,
          });

          // Send email via Gmail API
          const emailSubject = `You're Invited to Join ${mainBookerName} on ${tourName}`;

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
