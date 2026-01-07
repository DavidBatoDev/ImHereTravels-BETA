import { onCall } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as crypto from "crypto";
import * as nodemailer from "nodemailer";
import { EmailTemplateLoader } from "./email-template-loader";
import { GmailApiService } from "./gmail-api-service";

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

export const sendVerificationEmail = onCall(
  {
    region: "asia-southeast1",
    maxInstances: 10,
  },
  async (request) => {
    try {
      const { email, firstName, userId } = request.data;

      if (!email || !firstName || !userId) {
        throw new Error("Missing required fields: email, firstName, or userId");
      }

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Store verification token in Firestore
      const verificationRef = db.collection("emails").doc(userId);
      await verificationRef.set({
        email,
        verificationToken,
        expiresAt,
        type: "email_verification",
        createdAt: new Date(),
        isUsed: false,
      });

      // Create verification link
      const verificationLink = `${
        process.env.FRONTEND_URL || "https://admin.imheretravels.com"
      }/auth/verify-email?token=${verificationToken}&userId=${userId}`;

      // Load email template
      const htmlContent = EmailTemplateLoader.loadTemplate(
        "email-verification",
        {
          firstName,
          verificationLink,
        }
      );

      // Create email content
      const emailContent = {
        to: email,
        subject: "Verify Your Email - ImHere Travels",
        html: htmlContent,
        text: `
          Hello ${firstName}! 👋
          
          You have been selected to become an administrator for ImHere Travels. 
          To complete your admin account setup and gain access to the management dashboard, please verify your email address.
          
          VERIFICATION LINK:
          ${verificationLink}
          
          ADMIN ACCOUNT BENEFITS:
          • Access to comprehensive travel management dashboard
          • Manage bookings, tours, and customer communications
          • Generate reports and analytics
          • Full system administration capabilities
          
          SECURITY NOTICE:
          • This verification link will expire in 24 hours for security reasons
          • If you didn't request admin access, please contact support immediately
          • After verification, you can complete your admin profile setup
          
          Best regards,
          ImHere Travels Team
          
          Your Gateway to Unforgettable Adventures
        `,
      };

      // Try Gmail API first, fallback to SMTP if it fails
      let emailResult;
      let messageId;

      try {
        // Try Gmail API first
        const gmailService = new GmailApiService();

        emailResult = await gmailService.sendEmail({
          to: email,
          subject: emailContent.subject,
          htmlContent: emailContent.html,
          from: "Bella | ImHereTravels <bella@imheretravels.com>",
        });

        messageId = emailResult.messageId;
        console.log("Email sent successfully via Gmail API:", messageId);
      } catch (gmailError) {
        console.warn("Gmail API failed, falling back to SMTP:", gmailError);

        // Fallback to Gmail SMTP
        const transporter = nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 587,
          secure: false,
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
          },
        });

        const mailOptions = {
          from: process.env.GMAIL_USER,
          to: email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        };

        const smtpResult = await transporter.sendMail(mailOptions);
        messageId = smtpResult.messageId;
        console.log("Email sent successfully via SMTP:", messageId);
      }

      // Log email sent
      await verificationRef.update({
        emailSent: true,
        emailSentAt: new Date(),
        messageId: messageId,
      });

      return {
        success: true,
        message: "Verification email sent successfully",
        error: undefined,
      };
    } catch (error) {
      console.error("Error sending verification email:", error);

      return {
        success: false,
        message: "Failed to send verification email",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
);
