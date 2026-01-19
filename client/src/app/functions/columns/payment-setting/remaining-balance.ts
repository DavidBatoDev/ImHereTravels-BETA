import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const remainingBalanceColumn: BookingSheetColumn = {
  id: "remainingBalance",
  data: {
    id: "remainingBalance",
    columnName: "Remaining Balance",
    dataType: "function",
    function: "getRemainingBalanceFunction",
    parentTab: "Payment Setting",
    order: 37,
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
  useDiscountedCost?: boolean,
  discountedTourCost?: number,
  originalTourCost?: number,
  reservationFee?: number,
  creditFrom?: string,
  creditAmount?: number,
  paymentPlan?: string,
  fullPaymentDate?: string,
  fullPaymentAmount?: number,
  p1DatePaid?: string,
  p1Amount?: number,
  p2DatePaid?: string,
  p2Amount?: number,
  p3DatePaid?: string,
  p3Amount?: number,
  p4DatePaid?: string,
  p4Amount?: number
): number | "" {
  if (!tourPackageName) return "";

  // Normalize numeric inputs to avoid undefined values
  const origCost = originalTourCost ?? 0;
  const discCost = discountedTourCost ?? 0;
  const resFee = reservationFee ?? 0;
  const credit = creditAmount ?? 0;

  // Determine which total cost to use (discounted or original)
  // Automatically use discounted cost if available (from active discount events)
  const baseCost = (discCost > 0) ? discCost : origCost;

  // Subtract reservation fee and any credit from reservation
  const total = baseCost - resFee - (creditFrom === "Reservation" ? credit : 0);

  // Total paid amount so far (treat missing amounts as 0)
  const paid =
    (fullPaymentDate ? fullPaymentAmount ?? 0 : 0) +
    (p1DatePaid ? p1Amount ?? 0 : 0) +
    (p2DatePaid ? p2Amount ?? 0 : 0) +
    (p3DatePaid ? p3Amount ?? 0 : 0) +
    (p4DatePaid ? p4Amount ?? 0 : 0);

  // Remaining balance - round to 2 decimal places
  const remaining = Math.round((total - paid) * 100) / 100;

  // Special rule for P1 plan
  if (paymentPlan === "P1" && p1DatePaid) {
    return 0;
  }

  // Ensure non-negative balance
  return Math.max(remaining, 0);
}
