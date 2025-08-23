import { onCall } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

export const verifyEmail = onCall(
  {
    region: "asia-southeast1",
    maxInstances: 10,
  },
  async (request) => {
    try {
      const { token, userId } = request.data;

      if (!token || !userId) {
        throw new Error("Missing required fields: token or userId");
      }

      // Get verification record from Firestore
      const verificationRef = db.collection("emails").doc(userId);
      const verificationDoc = await verificationRef.get();

      if (!verificationDoc.exists) {
        return {
          success: false,
          message: "Verification record not found",
          error: "Invalid verification link",
        };
      }

      const verificationData = verificationDoc.data();

      // Check if token matches
      if (verificationData?.verificationToken !== token) {
        return {
          success: false,
          message: "Invalid verification token",
          error: "Token mismatch",
        };
      }

      // Check if already used
      if (verificationData?.isUsed) {
        return {
          success: false,
          message: "Email already verified",
          error: "Token already used",
        };
      }

      // Check if expired
      if (
        verificationData?.expiresAt &&
        new Date(verificationData.expiresAt.toDate()) < new Date()
      ) {
        return {
          success: false,
          message: "Verification link expired",
          error: "Token expired",
        };
      }

      // Update user document to mark email as verified
      const userRef = db.collection("users").doc(userId);
      await userRef.update({
        isEmailVerified: true,
        "metadata.updatedAt": new Date(),
      });

      // Mark verification token as used
      await verificationRef.update({
        isUsed: true,
        usedAt: new Date(),
      });

      return {
        success: true,
        message: "Email verified successfully!",
      };
    } catch (error) {
      console.error("Error verifying email:", error);

      return {
        success: false,
        message: "Failed to verify email",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
);
