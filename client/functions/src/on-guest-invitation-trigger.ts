import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
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
        "Guest invitation template not found in Firestore, falling back to file",
      );
      const fs = await import("fs");
      const path = await import("path");
      const templatePath = path.join(
        __dirname,
        "../emails/guestInvitation.html",
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
 * Firestore trigger: fires when a booking's paymentProgress newly becomes "50%".
 * - Creates a guestInvitations document (status: "created")
 * - If config/guest-invitation automaticSends is true, sends the invitation email
 */
export const onGuestInvitationTrigger = onDocumentUpdated(
  {
    document: "bookings/{bookingId}",
    region: "asia-southeast1",
    timeoutSeconds: 300,
    memory: "512MiB",
  },
  async (event) => {
    const bookingId = event.params.bookingId;

    try {
      const beforeData = event.data?.before.data();
      const afterData = event.data?.after.data();

      if (!beforeData || !afterData) {
        logger.warn("Missing before/after data, skipping");
        return;
      }

      // Only fire when paymentProgress newly becomes "50%"
      const wasAt50 = beforeData.paymentProgress === "50%";
      const isNowAt50 = afterData.paymentProgress === "50%";

      if (wasAt50 || !isNowAt50) {
        return; // Not a new 50% — skip
      }

      logger.info(`🎯 Payment progress reached 50% for booking: ${bookingId}`);

      // Check config/guest-invitation for automaticSends
      const guestInvitationConfigDoc = await db
        .collection("config")
        .doc("guest-invitation")
        .get();
      const automaticSends =
        guestInvitationConfigDoc.exists &&
        guestInvitationConfigDoc.data()?.automaticSends === true;

      logger.info(`Automatic sends: ${automaticSends}`);

      // Check for duplicate guest invitation
      const existingSnap = await db
        .collection("guestInvitations")
        .where("bookingDocumentId", "==", bookingId)
        .limit(1)
        .get();

      if (!existingSnap.empty) {
        logger.info(
          `⏭️ Guest invitation already exists for booking: ${bookingId} — skipping`,
        );
        return;
      }

      // Build guest invitation document data
      const guestInvitationData: Record<string, any> = {
        bookingDocumentId: bookingId,
        bookingId: afterData.bookingId || afterData.bookingReference || "",
        recipientName: afterData.fullName || "",
        recipientEmail: afterData.emailAddress || "",
        tourPackageName: afterData.tourPackageName || "",
        tourDate: afterData.tourDate || null,
        status: "created",
        createdAt: Timestamp.now(),
        lastModified: Timestamp.now(),
        sentEmailLink: null,
        sentAt: null,
      };

      if (automaticSends) {
        // Generate and send email, then set status to "sent"
        try {
          const templateVariables = {
            fullName: guestInvitationData.recipientName,
            tourPackage: guestInvitationData.tourPackageName,
            bookingId: guestInvitationData.bookingId,
            formLink: FORM_LINK,
          };

          const emailHtml =
            await generateGuestInvitationEmailHtml(templateVariables);
          const subject = `Complete Your Guest Information for ${templateVariables.tourPackage}`;
          const bccList = await getBCCList();

          const gmailService = new GmailApiService();
          const emailResult = await gmailService.sendEmail({
            to: guestInvitationData.recipientEmail,
            subject,
            htmlContent: emailHtml,
            bcc: bccList,
            from: "Bella | ImHereTravels <bella@imheretravels.com>",
          });

          logger.info("✅ Guest invitation email sent:", emailResult.messageId);

          guestInvitationData.status = "sent";
          guestInvitationData.sentEmailLink = `https://mail.google.com/mail/u/0/#sent/${emailResult.messageId}`;
          guestInvitationData.sentAt = Timestamp.now();

          // Create notification
          try {
            await db.collection("notifications").add({
              type: "guest_invitation",
              title: "Guest Invitation Sent",
              body: `Guest invitation sent to ${guestInvitationData.recipientName} (${guestInvitationData.recipientEmail}) for ${guestInvitationData.tourPackageName}`,
              data: {
                bookingId: guestInvitationData.bookingId,
                bookingDocumentId: bookingId,
                travelerName: guestInvitationData.recipientName,
                tourPackageName: guestInvitationData.tourPackageName,
                recipientEmail: guestInvitationData.recipientEmail,
                emailUrl: guestInvitationData.sentEmailLink,
              },
              targetType: "global",
              targetUserIds: [],
              createdAt: new Date(),
              readBy: {},
            });

            logger.info("✅ Notification created for sent guest invitation");
          } catch (notificationError) {
            logger.warn("Failed to create notification:", notificationError);
          }
        } catch (emailError) {
          logger.error("❌ Email sending failed:", emailError);
          // Still create document with "created" status on email failure
          guestInvitationData.status = "created";
        }
      } else {
        logger.info(
          "📝 Automatic sends disabled — guest invitation created with 'created' status",
        );
      }

      // Create guest invitation document
      const guestInvitationRef = await db
        .collection("guestInvitations")
        .add(guestInvitationData);

      logger.info(
        `✅ Guest invitation document created: ${guestInvitationRef.id} (${guestInvitationData.status})`,
      );
    } catch (error) {
      logger.error("❌ Error in onGuestInvitationTrigger:", error);
      // Don't throw to prevent retries
    }
  },
);
