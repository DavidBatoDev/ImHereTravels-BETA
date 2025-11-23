import { Timestamp } from "firebase/firestore";

export interface Booking {
  // Core booking fields (matching default columns)
  id: string;
  bookingId: string;
  bookingCode: string;
  tourCode: string;
  reservationDate: Date;
  bookingType: "Individual" | "Group";
  bookingStatus: "Confirmed" | "Pending" | "Cancelled" | "Completed";
  daysBetweenBookingAndTour: number;
  groupId?: string;
  isMainBooker: boolean;

  // Traveller information
  travellerInitials: string;
  firstName: string;
  lastName: string;
  fullName: string;
  emailAddress: string;

  // Tour package details
  tourPackageNameUniqueCounter: number;
  tourPackageName: string;
  formattedDate: string;
  tourDate: Date;
  returnDate?: Date;
  tourDuration: string;

  // Pricing
  useDiscountedTourCost: boolean;
  originalTourCost: number;
  discountedTourCost?: number;

  // Discounts
  eventName?: string;
  discountRate?: number;

  // Email management - Reservation
  reservationEmail?: string;
  includeBccReservation: boolean;
  generateEmailDraft: boolean;
  emailDraftLink?: string;
  subjectLineReservation?: string;
  sendEmail: boolean;
  sentEmailLink?: string;
  reservationEmailSentDate?: Date;

  // Payment terms
  paymentCondition?: "Full Payment" | "Partial Payment" | "Installment";
  eligible2ndOfMonths: boolean;
  availablePaymentTerms?: string;
  paymentPlan?: "Monthly" | "Quarterly" | "Custom";
  paymentMethod?: "Credit Card" | "Bank Transfer" | "Cash" | "PayPal";
  enablePaymentReminder: boolean;
  sentInitialReminderLink?: string;
  paymentProgress: number;

  // Payment details
  fullPayment?: number;
  fullPaymentDueDate?: Date;
  fullPaymentAmount?: number;
  fullPaymentDatePaid?: Date;
  paymentTerm1?: string; // Due Date, Amount, Date Paid, Reminder, Email Link, Calendar Event ID/Link
  paymentTerm2?: string;
  paymentTerm3?: string;
  paymentTerm4?: string;
  reservationFee?: number;
  paid: number;
  remainingBalance: number;
  manualCredit?: number;
  creditFrom?: string;

  // Cancellation management
  reasonForCancellation?: string;
  includeBccCancellation: boolean;
  generateCancellationEmailDraft: boolean;
  cancellationEmailDraftLink?: string;
  subjectLineCancellation?: string;
  sendCancellationEmail: boolean;
  sentCancellationEmailLink?: string;
  cancellationEmailSentDate?: Date;

  // Dynamic fields for any additional columns
  [key: string]: any;
}
