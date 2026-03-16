import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const remainingBalanceColumn: BookingSheetColumn = {
  id: "remainingBalance",
  data: {
    id: "remainingBalance",
    columnName: "Remaining Balance",
    dataType: "function",
    function: "getRemainingBalanceFunction",
    parentTab: "Tour Details",
    includeInForms: false,
    color: "yellow",
    width: 191.33331298828125,
    arguments: [
      {
        name: "tourPackageName",
        type: "string",
        columnReference: "Tour Package Name",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "useDiscountedCost",
        type: "boolean",
        columnReference: "Use Discounted Tour Cost?",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "discountedTourCost",
        type: "number",
        columnReference: "Discounted Tour Cost",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "originalTourCost",
        type: "number",
        columnReference: "Original Tour Cost",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "reservationFee",
        type: "number",
        columnReference: "Reservation Fee",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "creditFrom",
        type: "string",
        columnReference: "Credit From",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "creditAmount",
        type: "number",
        columnReference: "Manual Credit",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "paymentPlan",
        type: "string",
        columnReference: "Payment Plan",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "fullPaymentDate",
        type: "string",
        columnReference: "Full Payment Date Paid",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "fullPaymentAmount",
        type: "number",
        columnReference: "Full Payment Amount",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "p1DatePaid",
        type: "string",
        columnReference: "P1 Date Paid",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "p1Amount",
        type: "number",
        columnReference: "P1 Amount",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "p2DatePaid",
        type: "string",
        columnReference: "P2 Date Paid",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "p2Amount",
        type: "number",
        columnReference: "P2 Amount",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "p3DatePaid",
        type: "string",
        columnReference: "P3 Date Paid",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "p3Amount",
        type: "number",
        columnReference: "P3 Amount",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "p4DatePaid",
        type: "string",
        columnReference: "P4 Date Paid",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "p4Amount",
        type: "number",
        columnReference: "P4 Amount",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "p1LateFeesPenalty",
        type: "number",
        columnReference: "P1 Late Fees Penalty",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "p2LateFeesPenalty",
        type: "number",
        columnReference: "P2 Late Fees Penalty",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "p3LateFeesPenalty",
        type: "number",
        columnReference: "P3 Late Fees Penalty",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "p4LateFeesPenalty",
        type: "number",
        columnReference: "P4 Late Fees Penalty",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
    ],
  },
};

// Column Function Implementation
/**
 * Excel equivalent:
 * =IF(
 *   ISBLANK(M1003),
 *   "",
 *   LET(
 *     total, IF($Y1003,$AG1003,$AF1003) - $AH1003 - IF($AL1003="Reservation", N($AK1003), 0),
 *     plan,  $AM1003,
 *
 *     paid,
 *       IF($AV1003<>"", $AU1003, 0) +
 *       IF($BC1003<>"", $BB1003, 0) +
 *       IF($BJ1003<>"", $BI1003, 0) +
 *       IF($BQ1003<>"", $BP1003, 0) +
 *       IF($BX1003<>"", $BW1003, 0),
 *
 *     rem, total - paid,
 *     IF(AND(plan="P1",$BC1003<>""),0,MAX(rem,0))
 *   )
 * )
 *
 * Description:
 * - Computes the **remaining balance** for a given tour package.
 * - Considers discount usage, reservation fee, credits, and all payments (Full, P1–P4).
 * - If the plan is "P1" and P1 payment has been made, remaining balance becomes 0.
 * - Returns "" if no tourPackageName provided.
 */

export default function getRemainingBalanceFunction(
  tourPackageName: string,
  useDiscountedCost?: boolean | string,
  discountedTourCost?: number | string,
  originalTourCost?: number | string,
  reservationFee?: number | string,
  creditFrom?: string,
  creditAmount?: number | string,
  paymentPlan?: string,
  fullPaymentDate?: string,
  fullPaymentAmount?: number | string,
  p1DatePaid?: string,
  p1Amount?: number | string,
  p2DatePaid?: string,
  p2Amount?: number | string,
  p3DatePaid?: string,
  p3Amount?: number | string,
  p4DatePaid?: string,
  p4Amount?: number | string,
  p1LateFeesPenalty?: number | string,
  p2LateFeesPenalty?: number | string,
  p3LateFeesPenalty?: number | string,
  p4LateFeesPenalty?: number | string,
): number | "" {
  if (!tourPackageName) return "";

  const toNumber = (value: unknown): number => {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : 0;
    }

    if (typeof value === "string") {
      const normalized = value.replace(/[^\d.-]/g, "").trim();
      if (!normalized) return 0;
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
  };

  const isPaid = (value: unknown): boolean => {
    if (value == null) return false;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      return (
        normalized !== "" && normalized !== "null" && normalized !== "undefined"
      );
    }
    return true;
  };

  // Normalize numeric inputs to avoid undefined values
  const origCost = toNumber(originalTourCost);
  const discCost = toNumber(discountedTourCost);
  const resFee = toNumber(reservationFee);
  const credit = toNumber(creditAmount);

  // Determine which total cost to use (discounted or original)
  // Automatically use discounted cost if available (from active discount events)
  const baseCost = discCost > 0 ? discCost : origCost;

  // Subtract reservation fee and any credit from reservation
  const total = baseCost - resFee - (creditFrom === "Reservation" ? credit : 0);

  // Total paid amount so far (treat missing amounts as 0)
  const paid =
    (isPaid(fullPaymentDate) ? toNumber(fullPaymentAmount) : 0) +
    (isPaid(p1DatePaid) ? toNumber(p1Amount) : 0) +
    (isPaid(p2DatePaid) ? toNumber(p2Amount) : 0) +
    (isPaid(p3DatePaid) ? toNumber(p3Amount) : 0) +
    (isPaid(p4DatePaid) ? toNumber(p4Amount) : 0);

  // All applied late fees increase total amount due.
  const totalLateFees =
    toNumber(p1LateFeesPenalty) +
    toNumber(p2LateFeesPenalty) +
    toNumber(p3LateFeesPenalty) +
    toNumber(p4LateFeesPenalty);

  // Only treat a term's late fee as paid when that term is marked paid.
  const paidLateFees =
    (isPaid(p1DatePaid) ? toNumber(p1LateFeesPenalty) : 0) +
    (isPaid(p2DatePaid) ? toNumber(p2LateFeesPenalty) : 0) +
    (isPaid(p3DatePaid) ? toNumber(p3LateFeesPenalty) : 0) +
    (isPaid(p4DatePaid) ? toNumber(p4LateFeesPenalty) : 0);

  const totalDue = total + totalLateFees;

  // Remaining balance - round to 2 decimal places
  const remaining = Math.round((totalDue - (paid + paidLateFees)) * 100) / 100;

  // Special rule for P1 plan
  if (paymentPlan === "P1" && isPaid(p1DatePaid)) {
    return 0;
  }

  // Ensure non-negative balance
  return Math.max(remaining, 0);
}
