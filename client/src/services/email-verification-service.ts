import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/lib/firebase";

export interface SendVerificationEmailRequest {
  email: string;
  firstName: string;
  userId: string;
}

export interface SendVerificationEmailResponse {
  success: boolean;
  message: string;
  error?: string;
}

export interface VerifyEmailRequest {
  token: string;
  userId: string;
}

export interface VerifyEmailResponse {
  success: boolean;
  message: string;
  error?: string;
}

export class EmailVerificationService {
  private static functions = getFunctions(app, "asia-southeast1");

  /**
   * Send verification email to user
   */
  static async sendVerificationEmail(
    data: SendVerificationEmailRequest
  ): Promise<SendVerificationEmailResponse> {
    try {
      const sendVerificationEmail = httpsCallable<
        SendVerificationEmailRequest,
        SendVerificationEmailResponse
      >(this.functions, "sendVerificationEmail");

      const result = await sendVerificationEmail(data);
      return result.data;
    } catch (error) {
      console.error("Error sending verification email:", error);
      return {
        success: false,
        message: "Failed to send verification email",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Verify email using token from verification link
   */
  static async verifyEmail(
    data: VerifyEmailRequest
  ): Promise<VerifyEmailResponse> {
    try {
      const verifyEmail = httpsCallable<
        VerifyEmailRequest,
        VerifyEmailResponse
      >(this.functions, "verifyEmail");

      const result = await verifyEmail(data);
      return result.data;
    } catch (error) {
      console.error("Error verifying email:", error);
      return {
        success: false,
        message: "Failed to verify email",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
