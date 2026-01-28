import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const paidTermsColumn: BookingSheetColumn = {
  id: "paidTerms",
  data: {
    id: "paidTerms",
    columnName: "Paid Terms",
    dataType: "function",
    function: "getPaidTermsFunction",
    parentTab: "Payment Setting",
    includeInForms: false,
    color: "gray",
    width: 150,
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
        name: "creditFrom",
        type: "string",
        columnReference: "Credit From",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "manualCredit",
        type: "number | string",
        columnReference: "Manual Credit",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "fullPaymentDatePaid",
        type: "date | string",
        columnReference: "Full Payment Date Paid",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "fullPaymentAmount",
        type: "number | string",
        columnReference: "Full Payment Amount",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "p1DatePaid",
        type: "date | string",
        columnReference: "P1 Date Paid",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "p1Amount",
        type: "number | string",
        columnReference: "P1 Amount",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "p2DatePaid",
        type: "date | string",
        columnReference: "P2 Date Paid",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "p2Amount",
        type: "number | string",
        columnReference: "P2 Amount",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "p3DatePaid",
        type: "date | string",
        columnReference: "P3 Date Paid",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "p3Amount",
        type: "number | string",
        columnReference: "P3 Amount",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "p4DatePaid",
        type: "date | string",
        columnReference: "P4 Date Paid",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "p4Amount",
        type: "number | string",
        columnReference: "P4 Amount",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "reservationFee",
        type: "number | string",
        columnReference: "Reservation Fee",
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
 * Excel equivalent:
 * =IF(
 *   ISBLANK(M1003),
 *   "",
 *   LET(
 *     credit_from,   IFNA(AQ1003,""),
 *     credit_amt,    N(AP1003),
 *
 *     full_paid, IF(BA1003<>"", AZ1003, 0),
 *     p1_paid,   IF(BJ1003<>"", IF(credit_from="P1", credit_amt, BI1003), 0),
 *     p2_paid,   IF(BS1003<>"", IF(credit_from="P2", credit_amt, BR1003), 0),
 *     p3_paid,   IF(CB1003<>"", IF(credit_from="P3", credit_amt, CA1003), 0),
 *     p4_paid,   IF(CK1003<>"", IF(credit_from="P4", credit_amt, CJ1003), 0),
 *
 *     res_paid, resfee + IF(credit_from="Reservation", credit_amt, 0),
 *
 *     full_paid + p1_paid + p2_paid + p3_paid + p4_paid
 *   )
 * )
 *
 * Description:
 * - Calculates total amount paid across all payment terms
 * - Sums Full Payment, P1-P4 payments, and reservation fee
 * - Accounts for manual credits applied to specific payment terms
 * - Returns empty string if no tour package selected
 *
 * Parameters:
 * - tourPackageName → Name of selected tour package (triggers calculation)
 * - creditFrom → Which payment term received the credit ("Reservation", "P1", "P2", "P3", "P4")
 * - manualCredit → Amount of manual credit applied
 * - fullPaymentDatePaid → Date full payment was made (triggers inclusion)
 * - fullPaymentAmount → Full payment amount
 * - p1DatePaid → Date P1 was paid
 * - p1Amount → P1 amount
 * - p2DatePaid → Date P2 was paid
 * - p2Amount → P2 amount
 * - p3DatePaid → Date P3 was paid
 * - p3Amount → P3 amount
 * - p4DatePaid → Date P4 was paid
 * - p4Amount → P4 amount
 * - reservationFee → Reservation fee amount
 *
 * Returns:
 * - number → Total paid amount
 * - "" → if no tour package selected
 */

export default async function getPaidTerms(
  tourPackageName: string,
  creditFrom: string,
  manualCredit: number | string,
  fullPaymentDatePaid: Date | string,
  fullPaymentAmount: number | string,
  p1DatePaid: Date | string,
  p1Amount: number | string,
  p2DatePaid: Date | string,
  p2Amount: number | string,
  p3DatePaid: Date | string,
  p3Amount: number | string,
  p4DatePaid: Date | string,
  p4Amount: number | string,
  reservationFee: number | string,
): Promise<number | string> {
  // Return empty if no tour package selected
  if (!tourPackageName) return "";

  // Helper to convert to number
  const toNumber = (value: any): number => {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  // Get credit amount (default to 0 if invalid)
  const creditAmt = toNumber(manualCredit);

  // Calculate each payment term (only if date paid exists)
  const fullPaid = fullPaymentDatePaid ? toNumber(fullPaymentAmount) : 0;

  const p1Paid = p1DatePaid
    ? creditFrom === "P1"
      ? creditAmt
      : toNumber(p1Amount)
    : 0;

  const p2Paid = p2DatePaid
    ? creditFrom === "P2"
      ? creditAmt
      : toNumber(p2Amount)
    : 0;

  const p3Paid = p3DatePaid
    ? creditFrom === "P3"
      ? creditAmt
      : toNumber(p3Amount)
    : 0;

  const p4Paid = p4DatePaid
    ? creditFrom === "P4"
      ? creditAmt
      : toNumber(p4Amount)
    : 0;

  // Calculate reservation paid (reservation fee + credit if applied to reservation)
  const resFee = toNumber(reservationFee);
  const resPaid = resFee + (creditFrom === "Reservation" ? creditAmt : 0);

  // Sum all payments
  const totalPaid = fullPaid + p1Paid + p2Paid + p3Paid + p4Paid;

  return totalPaid;
}
