import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const eligibleRefundColumn: BookingSheetColumn = {
  id: "eligibleRefund",
  data: {
    id: "eligibleRefund",
    columnName: "Eligible Refund",
    dataType: "function",
    function: "getEligibleRefundFunction",
    parentTab: "Cancellation",
    includeInForms: false,
    color: "none",
    width: 300,
    arguments: [
      {
        name: "cancellationRequestDate",
        type: "date | string",
        columnReference: "Cancellation Request Date",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "tourDate",
        type: "date | string",
        columnReference: "Tour Date",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "reasonForCancellation",
        type: "string",
        columnReference: "Reason for Cancellation",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "paymentPlan",
        type: "string",
        columnReference: "Payment Plan",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "paidTerms",
        type: "number | string",
        columnReference: "Paid Terms",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "fullPaymentDatePaid",
        type: "date",
        columnReference: "Full Payment Date Paid",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "supplierCostsCommitted",
        type: "number",
        columnReference: "Supplier Costs Committed",
        isOptional: false,
        hasDefault: true,
        isRest: false,
        value: "0",
      },
      {
        name: "isNoShow",
        type: "boolean",
        columnReference: "No-Show",
        isOptional: false,
        hasDefault: true,
        isRest: false,
        value: "false",
      },
    ],
  },
};

// Column Function Implementation
/**
 * Determines refund eligibility based on cancellation scenario
 *
 * Implements comprehensive refund logic for all scenarios:
 *
 * Guest Cancellations (Full Payment):
 * - ≥100 days: "100% of NRA minus admin fee"
 * - 60-99 days: "50% of NRA minus admin fee"
 * - ≤59 days: "No refund"
 *
 * Guest Cancellations (Installment):
 * - ≥100 days: "100% of paid terms minus admin fee"
 * - 60-99 days: "50% of paid terms minus admin fee"
 * - ≤59 days: "No refund"
 *
 * Special Cases:
 * - Supplier costs: "Refund minus supplier costs and admin fee"
 * - No-show: "No refund"
 * - IHT cancels (before): "100% refund including RF OR travel credit"
 * - IHT cancels (after): "Partial refund OR travel credit"
 * - Force majeure: "Case-by-case (refund OR TC)"
 *
 * Parameters:
 * - cancellationRequestDate → Date cancellation was requested
 * - tourDate → Date of the tour
 * - reasonForCancellation → Reason provided (with "Guest -" or "IHT -" prefix)
 * - paymentPlan → Selected payment plan
 * - paidTerms → Total amount paid (installments only)
 * - fullPaymentDatePaid → Date full payment was made (optional)
 * - supplierCostsCommitted → Supplier costs incurred (default 0)
 * - isNoShow → Whether guest marked as no-show (default false)
 *
 * Returns:
 * - string → Refund eligibility status
 * - "" → if not cancelled or no reason provided
 */

export default async function getEligibleRefund(
  cancellationRequestDate: Date | string,
  tourDate: Date | string,
  reasonForCancellation: string,
  paymentPlan: string,
  paidTerms: number | string,
  fullPaymentDatePaid: Date | any | null | undefined = null,
  supplierCostsCommitted: number = 0,
  isNoShow: boolean = false,
): Promise<string> {
  // Import scenario detection
  const {
    detectCancellationScenario,
    calculateDaysBeforeTour,
  } = require("./detect-cancellation-scenario");

  // Return empty if not cancelled
  if (!reasonForCancellation || !cancellationRequestDate) {
    return "";
  }

  // Valid payment plans
  const validPlans = ["Full Payment", "P1", "P2", "P3", "P4"];
  if (!validPlans.includes(paymentPlan)) {
    return "";
  }

  // Convert paidTerms to number
  const paidAmount =
    typeof paidTerms === "string" ? parseFloat(paidTerms) : paidTerms;

  // Calculate days before tour
  const daysBeforeTour = calculateDaysBeforeTour(
    cancellationRequestDate,
    tourDate,
  );

  // Detect scenario
  const scenario = detectCancellationScenario({
    daysBeforeTour,
    paymentPlan,
    paidTerms: paidAmount,
    fullPaymentDatePaid,
    supplierCosts: supplierCostsCommitted,
    tourDate,
    cancellationDate: cancellationRequestDate,
    isNoShow,
    reasonForCancellation,
  });

  if (!scenario) {
    return "";
  }

  // Return the refund policy from the scenario
  return scenario.refundPolicy;
}
