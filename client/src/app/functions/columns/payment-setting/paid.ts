import { BookingSheetColumn } from "@/types/booking-sheet-column";
import {
  hasPaidDate,
  roundCurrency,
  toNumber,
} from "../payment-calculation-helpers";

export const paidColumn: BookingSheetColumn = {
  id: "paid",
  data: {
    id: "paid",
    columnName: "Paid",
    dataType: "function",
    function: "getTotalPaidAmountFunction",
    parentTab: "Payment Setting",
    includeInForms: false,
    color: "yellow",
    width: 100,
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
        name: "reservationFee",
        type: "string | number",
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
        type: "string | number",
        columnReference: "Manual Credit",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "fullPaymentDate",
        type: "any",
        columnReference: "Full Payment Date Paid",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "fullPaymentAmount",
        type: "string | number",
        columnReference: "Full Payment Amount",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "p1DatePaid",
        type: "any",
        columnReference: "P1 Date Paid",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "p1Amount",
        type: "string | number",
        columnReference: "P1 Amount",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "p2DatePaid",
        type: "any",
        columnReference: "P2 Date Paid",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "p2Amount",
        type: "string | number",
        columnReference: "P2 Amount",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "p3DatePaid",
        type: "any",
        columnReference: "P3 Date Paid",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "p3Amount",
        type: "string | number",
        columnReference: "P3 Amount",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "p4DatePaid",
        type: "any",
        columnReference: "P4 Date Paid",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "p4Amount",
        type: "string | number",
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
export default function getTotalPaidAmountFunction(
  tourPackageName: string,
  reservationFee?: number | string | null,
  creditFrom?: string | null,
  creditAmount?: number | string | null,
  fullPaymentDate?: any,
  fullPaymentAmount?: number | string | null,
  p1DatePaid?: any,
  p1Amount?: number | string | null,
  p2DatePaid?: any,
  p2Amount?: number | string | null,
  p3DatePaid?: any,
  p3Amount?: number | string | null,
  p4DatePaid?: any,
  p4Amount?: number | string | null,
  p1LateFeesPenalty?: number | string | null,
  p2LateFeesPenalty?: number | string | null,
  p3LateFeesPenalty?: number | string | null,
  p4LateFeesPenalty?: number | string | null,
): number | string {
  if (!tourPackageName) return "";

  const creditFromStr = (creditFrom || "").trim();
  const creditAmt = toNumber(creditAmount);
  const hasManualCredit = creditAmt > 0;

  const p1IsPaid = hasPaidDate(p1DatePaid) || (hasManualCredit && creditFromStr === "P1");
  const p2IsPaid = hasPaidDate(p2DatePaid) || (hasManualCredit && creditFromStr === "P2");
  const p3IsPaid = hasPaidDate(p3DatePaid) || (hasManualCredit && creditFromStr === "P3");
  const p4IsPaid = hasPaidDate(p4DatePaid) || (hasManualCredit && creditFromStr === "P4");

  // Reservation Fee
  const resPaid =
    toNumber(reservationFee) +
    (creditFromStr === "Reservation" && hasManualCredit ? creditAmt : 0);

  // Full Payment
  const fullPaid =
    hasPaidDate(fullPaymentDate) || (hasManualCredit && creditFromStr === "Full Payment")
      ? creditFromStr === "Full Payment" && hasManualCredit
        ? creditAmt
        : toNumber(fullPaymentAmount)
      : 0;

  // Partial Payments
  const p1_paid = p1IsPaid
    ? creditFromStr === "P1" && hasManualCredit
      ? creditAmt
      : toNumber(p1Amount)
    : 0;

  const p2_paid = p2IsPaid
    ? creditFromStr === "P2" && hasManualCredit
      ? creditAmt
      : toNumber(p2Amount)
    : 0;

  const p3_paid = p3IsPaid
    ? creditFromStr === "P3" && hasManualCredit
      ? creditAmt
      : toNumber(p3Amount)
    : 0;

  const p4_paid = p4IsPaid
    ? creditFromStr === "P4" && hasManualCredit
      ? creditAmt
      : toNumber(p4Amount)
    : 0;

  // Late fees are counted as paid only when an actual date-paid is present.
  const p1PenaltyPaid = hasPaidDate(p1DatePaid) ? toNumber(p1LateFeesPenalty) : 0;
  const p2PenaltyPaid = hasPaidDate(p2DatePaid) ? toNumber(p2LateFeesPenalty) : 0;
  const p3PenaltyPaid = hasPaidDate(p3DatePaid) ? toNumber(p3LateFeesPenalty) : 0;
  const p4PenaltyPaid = hasPaidDate(p4DatePaid) ? toNumber(p4LateFeesPenalty) : 0;

  const totalPaid =
    resPaid +
    fullPaid +
    p1_paid +
    p2_paid +
    p3_paid +
    p4_paid +
    p1PenaltyPaid +
    p2PenaltyPaid +
    p3PenaltyPaid +
    p4PenaltyPaid;

  return roundCurrency(totalPaid);
}
