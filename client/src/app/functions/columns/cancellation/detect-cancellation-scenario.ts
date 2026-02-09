/**
 * Cancellation Scenario Detection Utility
 *
 * This function determines which of the 12+ cancellation scenarios applies
 * based on who initiated the cancellation, timing, payment type, and special circumstances.
 *
 * Scenarios covered:
 * 1. Guest cancels early (full payment) - ≥100 days
 * 2. Guest cancels mid-range (full payment) - 60-99 days
 * 3. Guest cancels late (full payment) - ≤59 days
 * 4. Guest cancels early (install ment) - ≥100 days
 * 5. Guest cancels mid-range (installment) - 60-99 days
 * 6. Guest cancels late (installment) - ≤59 days
 * 7. Installment default early - ≥100 days
 * 8. Installment default mid-range - 60-99 days
 * 9. Installment default late - ≤59 days
 * 10. Supplier costs committed
 * 11. Guest no-show
 * 12. Tour cancelled by IHT (before start)
 * 13. Tour cancelled by IHT (after start)
 * 14. Force majeure
 */

export interface CancellationScenario {
  scenarioId: string;
  description: string;
  refundPolicy: string;
  timing: "early" | "mid-range" | "late" | "n/a";
  daysBeforeTour: number;
}

interface DetectScenarioParams {
  initiatedBy: string | null | undefined;
  daysBeforeTour: number;
  paymentPlan: string | null | undefined;
  paidTerms: number;
  fullPaymentDatePaid: Date | null | undefined;
  supplierCosts: number;
  tourDate: Date | null | undefined;
  cancellationDate: Date | null | undefined;
  isNoShow: boolean;
  reasonForCancellation: string | null | undefined;
}

export function detectCancellationScenario(
  params: DetectScenarioParams,
): CancellationScenario | null {
  const {
    initiatedBy,
    daysBeforeTour,
    paymentPlan,
    paidTerms,
    fullPaymentDatePaid,
    supplierCosts,
    tourDate,
    cancellationDate,
    isNoShow,
    reasonForCancellation,
  } = params;

  // No scenario if not cancelled
  if (!reasonForCancellation || !cancellationDate) {
    return null;
  }

  // Determine payment type
  const isFullPayment =
    paymentPlan === "Full Payment" || fullPaymentDatePaid !== null;
  const isInstallment = ["P1", "P2", "P3", "P4"].includes(paymentPlan || "");

  // Determine timing bucket
  let timing: "early" | "mid-range" | "late" | "n/a" = "n/a";
  if (daysBeforeTour >= 100) timing = "early";
  else if (daysBeforeTour >= 60) timing = "mid-range";
  else timing = "late";

  // 11. Guest no-show (highest priority)
  if (isNoShow && tourDate && cancellationDate >= tourDate) {
    return {
      scenarioId: "guest-no-show",
      description: "Guest No-Show",
      refundPolicy: "No refund - Guest did not attend tour",
      timing: "n/a",
      daysBeforeTour: 0,
    };
  }

  // 10. Supplier costs committed (overrides other scenarios)
  if (supplierCosts > 0 && initiatedBy !== "IHT") {
    return {
      scenarioId: "supplier-costs",
      description: "Supplier Costs Committed",
      refundPolicy: "Refund minus supplier costs and admin fee",
      timing,
      daysBeforeTour,
    };
  }

  // 12 & 13. IHT cancellations
  if (initiatedBy === "IHT") {
    if (tourDate && cancellationDate < tourDate) {
      return {
        scenarioId: "iht-cancel-before",
        description: "Tour Cancelled by IHT (Before Start)",
        refundPolicy: "100% refund including reservation fee OR travel credit",
        timing: "n/a",
        daysBeforeTour,
      };
    } else {
      return {
        scenarioId: "iht-cancel-after",
        description: "Tour Cancelled by IHT (After Start)",
        refundPolicy: "Partial refund for unused portion OR travel credit",
        timing: "n/a",
        daysBeforeTour,
      };
    }
  }

  // 14. Force majeure (check reason)
  if (
    reasonForCancellation &&
    reasonForCancellation.toLowerCase().includes("force majeure")
  ) {
    return {
      scenarioId: "force-majeure",
      description: "Force Majeure",
      refundPolicy: "Case-by-case (refund OR travel credit)",
      timing: "n/a",
      daysBeforeTour,
    };
  }

  // 7-9. Installment defaults (check if reason mentions default/missed payment)
  const isDefault =
    reasonForCancellation &&
    (reasonForCancellation.toLowerCase().includes("default") ||
      reasonForCancellation.toLowerCase().includes("missed payment"));

  if (isDefault && isInstallment) {
    if (daysBeforeTour >= 100) {
      return {
        scenarioId: "installment-default-early",
        description: "Installment Default (Early)",
        refundPolicy: "Refund after admin fee deduction",
        timing: "early",
        daysBeforeTour,
      };
    } else if (daysBeforeTour >= 60) {
      return {
        scenarioId: "installment-default-mid",
        description: "Installment Default (Mid-Range)",
        refundPolicy: "50% refund after admin fee deduction",
        timing: "mid-range",
        daysBeforeTour,
      };
    } else {
      return {
        scenarioId: "installment-default-late",
        description: "Installment Default (Late)",
        refundPolicy: "No refund",
        timing: "late",
        daysBeforeTour,
      };
    }
  }

  // 1-3. Guest cancels (full payment)
  if (initiatedBy === "Guest" && isFullPayment) {
    if (daysBeforeTour >= 100) {
      return {
        scenarioId: "guest-cancel-full-early",
        description: "Guest Cancel Early (Full Payment)",
        refundPolicy: "100% of non-reservation amount minus admin fee",
        timing: "early",
        daysBeforeTour,
      };
    } else if (daysBeforeTour >= 60) {
      return {
        scenarioId: "guest-cancel-full-mid",
        description: "Guest Cancel Mid-Range (Full Payment)",
        refundPolicy: "50% of non-reservation amount minus admin fee",
        timing: "mid-range",
        daysBeforeTour,
      };
    } else {
      return {
        scenarioId: "guest-cancel-full-late",
        description: "Guest Cancel Late (Full Payment)",
        refundPolicy: "No refund - All amounts forfeited",
        timing: "late",
        daysBeforeTour,
      };
    }
  }

  // 4-6. Guest cancels (installment)
  if (initiatedBy === "Guest" && isInstallment) {
    if (daysBeforeTour >= 100) {
      return {
        scenarioId: "guest-cancel-installment-early",
        description: "Guest Cancel Early (Installment)",
        refundPolicy: "Refund of paid terms minus admin fee",
        timing: "early",
        daysBeforeTour,
      };
    } else if (daysBeforeTour >= 60) {
      return {
        scenarioId: "guest-cancel-installment-mid",
        description: "Guest Cancel Mid-Range (Installment)",
        refundPolicy: "50% of paid terms minus admin fee",
        timing: "mid-range",
        daysBeforeTour,
      };
    } else {
      return {
        scenarioId: "guest-cancel-installment-late",
        description: "Guest Cancel Late (Installment)",
        refundPolicy: "No refund - RF and paid terms forfeited",
        timing: "late",
        daysBeforeTour,
      };
    }
  }

  // Default fallback - treat as guest cancellation if no specific match
  if (paidTerms === 0) {
    return {
      scenarioId: "no-payment",
      description: "Cancellation (No Payment Made)",
      refundPolicy: "No refund - No payments made",
      timing: "n/a",
      daysBeforeTour,
    };
  }

  // Generic guest cancellation
  return {
    scenarioId: "guest-cancel-generic",
    description: "Guest Cancellation",
    refundPolicy:
      timing === "early"
        ? "100% refund minus admin fee"
        : timing === "mid-range"
          ? "50% refund minus admin fee"
          : "No refund",
    timing,
    daysBeforeTour,
  };
}

/**
 * Helper function to calculate days between two dates
 */
export function calculateDaysBeforeTour(
  cancellationDate: Date | any,
  tourDate: Date | any,
): number {
  const toDate = (value: any): Date => {
    if (value instanceof Date) {
      return value;
    }
    // Handle Firestore Timestamp objects with seconds property
    if (value && typeof value === "object" && "seconds" in value) {
      return new Date(value.seconds * 1000);
    }
    // Handle Firestore Timestamp objects with toDate method
    if (value && typeof value.toDate === "function") {
      return value.toDate();
    }
    // Handle string dates
    return new Date(value);
  };

  const cancellationDateObj = toDate(cancellationDate);
  const tourDateObj = toDate(tourDate);

  const diffTime = tourDateObj.getTime() - cancellationDateObj.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
