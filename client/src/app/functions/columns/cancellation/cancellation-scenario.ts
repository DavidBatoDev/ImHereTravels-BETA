import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const cancellationScenarioColumn: BookingSheetColumn = {
  id: "cancellationScenario",
  data: {
    id: "cancellationScenario",
    columnName: "Cancellation Scenario",
    dataType: "function",
    function: "getCancellationScenarioFunction",
    parentTab: "Cancellation",
    includeInForms: false,
    showColumn: true,
    color: "purple",
    width: 300,
    arguments: [
      {
        name: "cancellationRequestDate",
        type: "date",
        columnReference: "Cancellation Request Date",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "tourDate",
        type: "date",
        columnReference: "Tour Date",
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
        type: "number",
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
      {
        name: "reasonForCancellation",
        type: "string",
        columnReference: "Reason for Cancellation",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
    ],
  },
};

// Column Function Implementation
/**
 * Determines which cancellation scenario applies based on various factors
 *
 * Returns a human-readable description of the scenario with timing information
 * Example: "Guest Cancel Early (125 days before tour)"
 */
export default function getCancellationScenarioFunction(
  cancellationRequestDate: Date | any,
  tourDate: Date | any,
  paymentPlan: string | null | undefined,
  paidTerms: number,
  fullPaymentDatePaid: Date | any | null | undefined,
  supplierCostsCommitted: number = 0,
  isNoShow: boolean = false,
  reasonForCancellation: string | null | undefined,
): string {
  // Import detection function
  const {
    detectCancellationScenario,
    calculateDaysBeforeTour,
  } = require("./detect-cancellation-scenario");

  // Return empty if not cancelled
  if (!reasonForCancellation || !cancellationRequestDate) {
    return "";
  }

  // Calculate days before tour
  const daysBeforeTour = calculateDaysBeforeTour(
    cancellationRequestDate,
    tourDate,
  );

  // Detect scenario
  const scenario = detectCancellationScenario({
    daysBeforeTour,
    paymentPlan,
    paidTerms,
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

  // Format output with timing info
  if (scenario.timing === "n/a" || scenario.daysBeforeTour === 0) {
    return scenario.description;
  }

  return `${scenario.description} (${scenario.daysBeforeTour} days before tour)`;
}
