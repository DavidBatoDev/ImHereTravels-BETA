import { Timestamp } from "firebase/firestore";

// ============================================================================
// PAYMENT TERMS CONFIGURATION TYPES
// ============================================================================

export interface PaymentTermConfiguration {
  id: string;
  name: string;
  description: string;
  
  // New payment system fields
  paymentType: "full_payment" | "monthly_scheduled"; // Required for new system
  daysRequired?: number; // Days required for full payment (only for full_payment type)
  monthsRequired?: number; // Months required for scheduled payment (only for monthly_scheduled type)
  monthlyPercentages?: number[]; // Percentage for each month (only for monthly_scheduled type)
  
  // Common fields
  isActive: boolean;
  percentage?: number; // Legacy percentage field for backward compatibility
  sortOrder: number;
  color: string; // Make required with default value
  metadata: PaymentTermMetadata;
}

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
  paymentType: "full_payment" | "monthly_scheduled";
  daysRequired?: number;
  monthsRequired?: number;
  monthlyPercentages?: number[];
  color?: string;
}

export interface PaymentTermCreateRequest {
  name: string;
  description: string;
  paymentType: "full_payment" | "monthly_scheduled"; // Required for new payment term logic
  daysRequired?: number;
  monthsRequired?: number;
  monthlyPercentages?: number[];
  color: string; // Required to match PaymentTermConfiguration
  isActive: boolean;
  percentage?: number;
  sortOrder: number;
}

export interface PaymentTermUpdateRequest {
  id: string;
  name?: string;
  description?: string;
  paymentType?: "full_payment" | "monthly_scheduled";
  daysRequired?: number;
  monthsRequired?: number;
  monthlyPercentages?: number[];
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
}

// ============================================================================
// DEFAULT PAYMENT TERMS CONFIGURATION
// ============================================================================

export const DEFAULT_PAYMENT_TERMS: Omit<PaymentTermConfiguration, 'id' | 'metadata'>[] = [
  {
    name: "Invalid Booking",
    description: "Booking not allowed - Less than 3 days between reservation and tour date",
    paymentType: "full_payment",
    daysRequired: 3,
    isActive: true,
    sortOrder: 1,
    color: "#ef4444", // red
  },
  {
    name: "Full Payment Required",
    description: "Immediate full payment - Only 3 days gap between reservation and tour date",
    paymentType: "full_payment",
    daysRequired: 30,
    isActive: true,
    percentage: 100,
    sortOrder: 2,
    color: "#f59e0b", // amber
  },
  {
    name: "Payment Plan P1",
    description: "2-Payment Schedule - Reserve 3 days before 2nd of month, tour 3+ days after 2nd of next month. 50% upfront, 50% on 2nd of tour month",
    paymentType: "monthly_scheduled",
    monthsRequired: 2,
    monthlyPercentages: [50, 50],
    isActive: true,
    percentage: 50,
    sortOrder: 3,
    color: "#3b82f6", // blue
  },
  {
    name: "Payment Plan P2",
    description: "3-Payment Schedule - Reserve 3 days before 2nd of month, tour 3+ days after 2nd of 2nd month ahead. 40% upfront, 30% on 2nd of each month",
    paymentType: "monthly_scheduled",
    monthsRequired: 3,
    monthlyPercentages: [40, 30, 30],
    isActive: true,
    percentage: 40,
    sortOrder: 4,
    color: "#8b5cf6", // violet
  },
  {
    name: "Payment Plan P3",
    description: "4-Payment Schedule - Reserve 3 days before 2nd of month, tour 3+ days after 2nd of 3rd month ahead. Payments: 30%, 25%, 25%, 20% on 2nd of each month",
    paymentType: "monthly_scheduled",
    monthsRequired: 4,
    monthlyPercentages: [30, 25, 25, 20],
    isActive: true,
    percentage: 30,
    sortOrder: 5,
    color: "#10b981", // emerald
  },
  {
    name: "Payment Plan P4",
    description: "5-Payment Schedule - Reserve 3 days before 2nd of month, tour 3+ days after 2nd of 4th month ahead. Payments: 25%, 20%, 20%, 20%, 15% on 2nd of each month",
    paymentType: "monthly_scheduled",
    monthsRequired: 5,
    monthlyPercentages: [25, 20, 20, 20, 15],
    isActive: true,
    percentage: 25,
    sortOrder: 6,
    color: "#06b6d4", // cyan
  },
];
