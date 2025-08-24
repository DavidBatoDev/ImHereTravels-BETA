import { Timestamp } from "firebase/firestore";

// ============================================================================
// PAYMENT TERMS CONFIGURATION TYPES
// ============================================================================

export interface PaymentTermConfiguration {
  id: string;
  name: string;
  description: string;

  // New flexible payment system fields
  paymentPlanType: PaymentPlanType; // The specific payment plan type
  paymentType: "full_payment" | "monthly_scheduled" | "invalid_booking"; // Payment processing type
  daysRequired?: number; // Days required for full payment or invalid booking threshold
  monthsRequired?: number; // Months required for scheduled payment
  monthlyPercentages?: number[]; // Percentage for each month (only for monthly_scheduled type)
  depositPercentage: number; // Standard 15% deposit for all plans

  // Common fields
  isActive: boolean;
  percentage?: number; // Legacy percentage field for backward compatibility
  sortOrder: number;
  color: string;
  metadata: PaymentTermMetadata;
}

// New flexible payment plan type enum
export type PaymentPlanType =
  | "invalid_booking"
  | "full_payment_48hrs"
  | "p1_single_installment"
  | "p2_two_installments"
  | "p3_three_installments"
  | "p4_four_installments"
  | "custom"; // For custom payment plans

export interface PaymentTermMetadata {
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string; // Reference to users
}

// ============================================================================
// PAYMENT TERMS FORM TYPES
// ============================================================================

export interface PaymentTermFormData {
  name: string;
  description: string;
  paymentPlanType: PaymentPlanType;
  paymentType: "full_payment" | "monthly_scheduled" | "invalid_booking";
  daysRequired?: number;
  monthsRequired?: number;
  monthlyPercentages?: number[];
  depositPercentage: number;
  color?: string;
}

export interface PaymentTermCreateRequest {
  name: string;
  description: string;
  paymentPlanType: PaymentPlanType;
  paymentType: "full_payment" | "monthly_scheduled" | "invalid_booking";
  daysRequired?: number;
  monthsRequired?: number;
  monthlyPercentages?: number[];
  depositPercentage: number;
  color: string;
  isActive: boolean;
  percentage?: number;
  sortOrder: number;
}

export interface PaymentTermUpdateRequest {
  id: string;
  name?: string;
  description?: string;
  paymentPlanType?: PaymentPlanType;
  paymentType?: "full_payment" | "monthly_scheduled" | "invalid_booking";
  daysRequired?: number;
  monthsRequired?: number;
  monthlyPercentages?: number[];
  depositPercentage?: number;
  color?: string;
  isActive?: boolean;
  percentage?: number;
}

// ============================================================================
// PAYMENT TERMS CALCULATION TYPES
// ============================================================================

export interface PaymentTermEvaluationResult {
  applicableTerm: string;
  daysDifference: number;
  isValid: boolean;
  message?: string;
  paymentPlanType: PaymentPlanType;
}

// ============================================================================
// DEFAULT PAYMENT TERMS CONFIGURATION
// ============================================================================

export const DEFAULT_PAYMENT_TERMS: Omit<
  PaymentTermConfiguration,
  "id" | "metadata"
>[] = [
  {
    name: "Invalid Booking",
    description:
      "To handle bookings that cannot be processed due to scheduling constraints. Tour date is within 2 days of booking date.",
    paymentPlanType: "invalid_booking",
    paymentType: "invalid_booking",
    daysRequired: 2,
    depositPercentage: 0,
    isActive: true,
    sortOrder: 1,
    color: "#ef4444", // red
  },
  {
    name: "Full Payment Required Within 2 Days",
    description:
      "Capture last-minute bookings while ensuring immediate payment. Tour date is 2-30 days away with no eligible instalment dates available.",
    paymentPlanType: "full_payment_48hrs",
    paymentType: "full_payment",
    daysRequired: 2, // Changed from 48 hours to 2 days for consistency
    depositPercentage: 0, // Changed from 15 to 0 - full payment means no deposit
    isActive: true,
    percentage: 100, // Legacy percentage for full payment
    sortOrder: 2,
    color: "#f59e0b", // amber
  },
  {
    name: "P1 - Single Instalment",
    description:
      "Simplified payment for shorter lead times. Only 1 eligible payment date available, tour date 30-60 days away.",
    paymentPlanType: "p1_single_installment",
    paymentType: "monthly_scheduled",
    daysRequired: undefined,
    monthsRequired: 1,
    depositPercentage: 0, // Changed from 15 to 0 - no deposit required
    monthlyPercentages: [100], // Changed from [85] to [100] - full amount in single payment
    isActive: true,
    percentage: 100, // Legacy percentage
    sortOrder: 3,
    color: "#3b82f6", // blue
  },
  {
    name: "P2 - Two Instalments",
    description:
      "Balance affordability with business cash flow needs. 2 eligible payment dates available, tour date 60-90 days away.",
    paymentPlanType: "p2_two_installments",
    paymentType: "monthly_scheduled",
    daysRequired: undefined,
    monthsRequired: 2,
    depositPercentage: 0, // Changed from 15 to 0 - no deposit required
    monthlyPercentages: [50, 50], // Changed from [42.5, 42.5] to [50, 50] - full amount split evenly
    isActive: true,
    percentage: 100, // Legacy percentage
    sortOrder: 4,
    color: "#8b5cf6", // violet
  },
  {
    name: "P3 - Three Instalments",
    description:
      "Make longer-term bookings more affordable. 3 eligible payment dates available, tour date 90-120 days away.",
    paymentPlanType: "p3_three_installments",
    paymentType: "monthly_scheduled",
    daysRequired: undefined,
    monthsRequired: 3,
    depositPercentage: 0, // Changed from 15 to 0 - no deposit required
    monthlyPercentages: [33.33, 33.33, 33.34], // Changed from [28.3, 28.3, 28.3] to [33.33, 33.33, 33.34] - full amount split evenly
    isActive: true,
    percentage: 100, // Legacy percentage
    sortOrder: 5,
    color: "#10b981", // emerald
  },
  {
    name: "P4 - Four Instalments",
    description:
      "Maximum flexibility for early planners. 4+ eligible payment dates available, tour date 120+ days away.",
    paymentPlanType: "p4_four_installments",
    paymentType: "monthly_scheduled",
    daysRequired: undefined,
    monthsRequired: 4,
    depositPercentage: 0, // Changed from 15 to 0 - no deposit required
    monthlyPercentages: [25, 25, 25, 25], // Changed from [21.25, 21.25, 21.25, 21.25] to [25, 25, 25, 25] - full amount split evenly
    isActive: true,
    percentage: 100, // Legacy percentage
    sortOrder: 6,
    color: "#06b6d4", // cyan
  },
];

// ============================================================================
// PAYMENT PLAN TYPE HELPERS
// ============================================================================

export const PAYMENT_PLAN_TYPE_LABELS: Record<PaymentPlanType, string> = {
  invalid_booking: "Invalid Booking",
  full_payment_48hrs: "Full Payment (2 Days)", // Updated from 48hrs to 2 Days
  p1_single_installment: "P1 - Single Instalment",
  p2_two_installments: "P2 - Two Instalments",
  p3_three_installments: "P3 - Three Instalments",
  p4_four_installments: "P4 - Four Instalments",
  custom: "Custom Plan",
};

export const PAYMENT_PLAN_TYPE_DESCRIPTIONS: Record<PaymentPlanType, string> = {
  invalid_booking:
    "Booking not allowed - Less than 2 days between reservation and tour date",
  full_payment_48hrs:
    "Immediate full payment required within 2 days of booking", // Updated from 48 hours to 2 days
  p1_single_installment:
    "15% deposit + 85% single payment on next 2nd of month",
  p2_two_installments:
    "15% deposit + 42.5% × 2 payments on consecutive 2nd-of-month dates",
  p3_three_installments:
    "15% deposit + 28.3% × 3 payments on consecutive 2nd-of-month dates",
  p4_four_installments:
    "15% deposit + 21.25% × 4 payments on consecutive 2nd-of-month dates",
  custom: "Custom payment plan configuration",
};

// Helper function to get default configuration for a payment plan type
export function getDefaultConfigForPlanType(
  planType: PaymentPlanType
): Partial<PaymentTermFormData> {
  switch (planType) {
    case "invalid_booking":
      return {
        paymentType: "invalid_booking",
        daysRequired: 2,
        depositPercentage: 0,
        monthsRequired: undefined,
        monthlyPercentages: undefined,
      };

    case "full_payment_48hrs":
      return {
        paymentType: "full_payment",
        daysRequired: 2, // Changed from 48 hours to 2 days
        depositPercentage: 0,
        monthsRequired: undefined,
        monthlyPercentages: undefined,
      };

    case "p1_single_installment":
      return {
        paymentType: "monthly_scheduled",
        daysRequired: undefined,
        depositPercentage: 0, // Changed from 15 to 0
        monthsRequired: 1,
        monthlyPercentages: [100], // Changed from [85] to [100]
      };
    case "p2_two_installments":
      return {
        paymentType: "monthly_scheduled",
        daysRequired: undefined,
        depositPercentage: 0, // Changed from 15 to 0
        monthsRequired: 2,
        monthlyPercentages: [50, 50], // Changed from [42.5, 42.5] to [50, 50]
      };
    case "p3_three_installments":
      return {
        paymentType: "monthly_scheduled",
        daysRequired: undefined,
        depositPercentage: 0, // Changed from 15 to 0
        monthsRequired: 3,
        monthlyPercentages: [33.33, 33.33, 33.34], // Changed from [28.3, 28.3, 28.4] to [33.33, 33.33, 33.34]
      };
    case "p4_four_installments":
      return {
        paymentType: "monthly_scheduled",
        daysRequired: undefined,
        depositPercentage: 0, // Changed from 15 to 0
        monthsRequired: 4,
        monthlyPercentages: [25, 25, 25, 25], // Changed from [21.25, 21.25, 21.25, 21.25] to [25, 25, 25, 25]
      };

    case "custom":
      return {
        paymentType: "monthly_scheduled",
        daysRequired: undefined,
        depositPercentage: 15,
        monthsRequired: 2,
        monthlyPercentages: [50, 50],
      };

    default:
      return {
        paymentType: "full_payment",
        daysRequired: 30,
        depositPercentage: 15,
        monthsRequired: undefined,
        monthlyPercentages: undefined,
      };
  }
}
