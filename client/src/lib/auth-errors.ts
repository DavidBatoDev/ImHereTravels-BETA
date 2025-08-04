/**
 * Firebase Authentication Error Handler
 * Converts Firebase auth error codes to user-friendly messages
 */

export interface AuthError {
  code: string;
  message: string;
  userFriendlyMessage: string;
}

export const getAuthErrorMessage = (errorCode: string): string => {
  const errorMap: Record<string, string> = {
    // Invalid credentials
    "auth/invalid-credential":
      "Invalid email or password. Please check your credentials and try again.",
    "auth/user-not-found":
      "No account found with this email address. Please check your email or create a new account.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/invalid-email": "Please enter a valid email address.",

    // Account issues
    "auth/user-disabled":
      "This account has been disabled. Please contact support.",
    "auth/account-exists-with-different-credential":
      "An account already exists with this email using a different sign-in method.",
    "auth/email-already-in-use":
      "An account already exists with this email address.",
    "auth/weak-password":
      "Password is too weak. Please choose a stronger password.",

    // Network and server issues
    "auth/network-request-failed":
      "Network error. Please check your internet connection and try again.",
    "auth/too-many-requests":
      "Too many failed attempts. Please try again later.",
    "auth/operation-not-allowed":
      "This sign-in method is not enabled. Please contact support.",

    // Timeout and session issues
    "auth/user-token-expired":
      "Your session has expired. Please sign in again.",
    "auth/invalid-user-token": "Your session is invalid. Please sign in again.",

    // Default error
    "auth/unknown": "An unexpected error occurred. Please try again.",
  };

  return errorMap[errorCode] || errorMap["auth/unknown"];
};

export const parseFirebaseError = (error: Error): AuthError => {
  const code = error?.code || "auth/unknown";
  const message = error?.message || "An unexpected error occurred";
  const userFriendlyMessage = getAuthErrorMessage(code);

  return {
    code,
    message,
    userFriendlyMessage,
  };
};
