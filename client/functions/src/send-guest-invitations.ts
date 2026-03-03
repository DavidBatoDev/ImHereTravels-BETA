import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import GmailApiService from "./gmail-api-service";
import EmailTemplateService from "./email-template-service";

const db = getFirestore();

const FORM_LINK =
  "https://docs.google.com/forms/d/e/1FAIpQLSdwCccoJRIcxpBQYxjs1fZPpqsMpzXDFyQfLdIKr3g-lPvwEg/viewform";

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
 * Load and process guest invitation email template
 */
async function generateGuestInvitationEmailHtml(data: {
  fullName: string;
  tourPackage: string;
  bookingId: string;
  formLink: string;
}): Promise<string> {
  try {
    // Try to fetch template from Firestore emailTemplates collection
    const templateDoc = await db
      .collection("emailTemplates")
      .doc("5FZyQvXECyl3a2poPW2g")
      .get();

    let templateHtml: string;

    if (templateDoc.exists) {
      templateHtml = templateDoc.data()?.content || "";
      logger.info("Using guest invitation template from Firestore");
    } else {
      // Fallback: load from file system
      logger.warn(
        "Guest invitation template not found in Firestore, falling back to file"
      );
      const fs = await import("fs");
      const path = await import("path");
      const templatePath = path.join(
        __dirname,
        "../emails/guestInvitation.html"
      );
      templateHtml = fs.readFileSync(templatePath, "utf-8");
    }

    const processedHtml = EmailTemplateService.processTemplate(templateHtml, {
      ...data,
      currentYear: new Date().getFullYear().toString(),
    });

    return processedHtml;
  } catch (error) {
    logger.error("Error loading guest invitation template:", error);
    // Inline fallback
    return `
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h1>Complete Your Guest Information</h1>
          <p>Hi ${data.fullName},</p>
          <p>Help us make sure your travel arrangements are complete for <strong>${data.tourPackage}</strong> with Booking ID: <strong>${data.bookingId}</strong>.</p>
          <p>Please fill out our <strong>Guest Information Form</strong>.</p>
          <p><a href="${data.formLink}" style="display:inline-block;background:#EF3340;color:#fff;padding:12px 24px;text-decoration:none;border-radius:50px;font-weight:700;">Complete Guest Information Form</a></p>
          <p>Bella | ImHereTravels</p>
        </body>
      </html>
    `;
  }
}

/**
 * Callable function to send guest invitation email
 * Takes a guestInvitationId and sends the invitation email to the recipient
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
      const { guestInvitationId } = request.data;

      if (!guestInvitationId) {
        throw new HttpsError(
          "invalid-argument",
          "guestInvitationId is required"
        );
      }

      logger.info(
        `📧 Sending guest invitation email for: ${guestInvitationId}`
      );

      // 1. Get guest invitation document
      const guestInvitationDoc = await db
        .collection("guestInvitations")
        .doc(guestInvitationId)
        .get();

      if (!guestInvitationDoc.exists) {
        throw new HttpsError("not-found", "Guest invitation not found");
      }

      const guestInvitation = guestInvitationDoc.data();

      if (!guestInvitation) {
        throw new HttpsError("not-found", "Guest invitation data is empty");
      }

      // 2. Get booking data
      const bookingDoc = await db
        .collection("bookings")
        .doc(guestInvitation.bookingDocumentId)
        .get();

      if (!bookingDoc.exists) {
        throw new HttpsError("not-found", "Booking not found");
      }

      const bookingData = bookingDoc.data();

      if (!bookingData) {
        throw new HttpsError("not-found", "Booking data is empty");
      }

      // 3. Build template variables matching guestInvitation.html
      const templateVariables = {
        fullName: guestInvitation.recipientName || bookingData.fullName || "",
        tourPackage:
          guestInvitation.tourPackageName || bookingData.tourPackageName || "",
        bookingId: guestInvitation.bookingId || "",
        formLink: FORM_LINK,
      };

      // 4. Generate email HTML
      const emailHtml = await generateGuestInvitationEmailHtml(
        templateVariables
      );

      const subject = `Complete Your Guest Information for ${templateVariables.tourPackage}`;

      // 5. Get BCC list
      const bccList = await getBCCList();

      // 6. Send email
      const gmailService = new GmailApiService();

      const result = await gmailService.sendEmail({
        to: guestInvitation.recipientEmail,
        subject,
        htmlContent: emailHtml,
        bcc: bccList,
        from: "Bella | ImHereTravels <bella@imheretravels.com>",
      });

      logger.info("Guest invitation email sent:", result.messageId);

      // 7. Update guest invitation status
      const sentEmailLink = `https://mail.google.com/mail/u/0/#sent/${result.messageId}`;

      await db.collection("guestInvitations").doc(guestInvitationId).update({
        status: "sent",
        sentEmailLink,
        sentAt: Timestamp.now(),
        lastModified: Timestamp.now(),
      });

      logger.info(`✅ Guest invitation updated: ${guestInvitationId}`);

      return {
        success: true,
        messageId: result.messageId,
        sentEmailLink,
      };
    } catch (error: any) {
      logger.error("❌ Error sending guest invitation email:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        error.message || "Failed to send guest invitation email"
      );
    }
  }
);
