/**
 * RevolutPayment types — mirrors stripePayments collection structure
 * with added paymentScreenshot file object
 */

export interface RevolutPaymentScreenshot {
  url: string;
  storagePath: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: any; // Firestore Timestamp
}

export interface RevolutPaymentDocument {
  id?: string;
  bookingId: string;
  bookingDocumentId: string;
  userId: string;
  amount: number;
  currency: string;
  status: "pending" | "approved" | "rejected";
  installmentTerm: "full_payment" | "p1" | "p2" | "p3" | "p4";
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  paymentScreenshot: RevolutPaymentScreenshot;
  customer?: {
    email: string;
    firstName: string;
    lastName: string;
  };
  tour?: {
    packageName: string;
  };
  booking?: {
    id: string;
    documentId: string;
  };
}

// Bank details for Revolut transfer
export const REVOLUT_BANK_DETAILS = {
  accountHolder: "Amer Imhere",
  iban: "GB29 REVO 0099 7036 6579 42",
  bic: "REVOGB21",
  bankName: "Revolut Ltd",
  currency: "GBP",
  sortCode: "00-99-70",
  accountNumber: "36657942",
} as const;
