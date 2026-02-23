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
  payment: {
    amount: number;
    currency: string;
    status: "pending" | "approved" | "rejected";
    installmentTerm: "full_payment" | "p1" | "p2" | "p3" | "p4";
    type?: string; 
  };
  timestamps: {
    createdAt: any; // Firestore Timestamp
    updatedAt: any; // Firestore Timestamp
    approvedAt?: any;
    rejectedAt?: any;
  };
  paymentScreenshot: RevolutPaymentScreenshot;
  customer: {
    email: string;
    firstName: string;
    lastName: string;
  };
  tour?: {
    packageName: string;
  };
  booking: {
    id: string; // Display ID e.g., SB-TXP-123
    documentId: string; // Firestore document ID
  };
  // Legacy fields for backward compatibility during migration
  bookingId?: string;
  bookingDocumentId?: string;
  userId?: string;
  amount?: number;
  currency?: string;
  status?: "pending" | "approved" | "rejected";
  installmentTerm?: "full_payment" | "p1" | "p2" | "p3" | "p4";
  createdAt?: any;
  updatedAt?: any;
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
