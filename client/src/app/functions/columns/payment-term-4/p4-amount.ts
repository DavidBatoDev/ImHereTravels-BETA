import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const p4AmountColumn: BookingSheetColumn = {
  id: "p4Amount",
  data: {
    id: "p4Amount",
    columnName: "P4 Amount",
    dataType: "function",
    function: "getP4AmountFunction",
    parentTab: "Payment Term 4",
    order: 76,
    includeInForms: false,
    color: "yellow",
    width: 120,
    arguments: [
      {
        name: "p4DueDate",
        type: "any",
        columnReference: "P4 Due Date",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "useDiscountedTourCost",
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
        name: "paymentMethod",
        type: "string",
        columnReference: "Payment Method",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "fullPaymentDatePaid",
        type: "any",
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
        type: "any",
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
        type: "any",
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
        type: "any",
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
    ],
  },
};

// Column Function Implementation
export default function getP4AmountFunction(
  p4DueDate?: string | Date,
  useDiscountedTourCost?: boolean,
  discountedTourCost?: number,
  originalTourCost?: number,
  reservationFee?: number,
  creditFrom?: string,
  creditAmount?: number,
  paymentPlan?: string,
  paymentMethod?: string,
  fullPaymentDatePaid?: string | Date,
  fullPaymentAmount?: number,
  p1DatePaid?: string | Date,
  p1Amount?: number,
  p2DatePaid?: string | Date,
  p2Amount?: number,
  p3DatePaid?: string | Date,
  p3Amount?: number
) {
  // =IF($BV1003<>"", ...)
  if (!p4DueDate) return "";

  // total, credit_from, credit_amt
  const total =
    (useDiscountedTourCost ? discountedTourCost ?? 0 : originalTourCost ?? 0) -
    (reservationFee ?? 0);
  const credit_from = creditFrom ?? "";
  const credit_amt = creditAmount ?? 0;

  // IF(AND($AM1003="", $AN1003=""), ...)
  if (!paymentPlan && !paymentMethod) {
    // When no payment plan is specified, split total into 4 equal payments
    // Don't subtract already paid amounts - P4 amount is fixed
    const result = total / 4;
    return Math.round(result * 100) / 100;
  }

  // LET(terms, SWITCH(...))
  const termsMap: Record<string, number> = {
    "": 1,
    P1: 1,
    P2: 2,
    P3: 3,
    P4: 4,
  };
  const terms = termsMap[paymentPlan ?? ""] ?? 1;

  // cf, pFour, paid1..paid4
  const cf = `,${credit_from},`;
  const pFour = cf.includes(",P4,");
  const paid1 = !!p1DatePaid;
  const paid2 = !!p2DatePaid;
  const paid3 = !!p3DatePaid;
  const paid4 = !!p4DueDate; // GSheet $BX1003<>"" check

  // credited, unpaidCount, adjustedDenom
  const credited = Math.min(terms, Number(pFour) + Number(paid4));
  const unpaidCount =
    terms - Number(paid1) - Number(paid2) - Number(paid3) - Number(paid4);
  const adjustedDenom = Math.max(1, unpaidCount - credited);

  // k, base
  // Only set k if there's an actual credit amount, otherwise treat as no credit
  const k =
    credit_amt > 0 && credit_from === "Reservation"
      ? 0
      : credit_amt > 0 && credit_from === "P1"
      ? 1
      : credit_amt > 0 && credit_from === "P2"
      ? 2
      : credit_amt > 0 && credit_from === "P3"
      ? 3
      : credit_amt > 0 && credit_from === "P4"
      ? 4
      : 0;
  const base = total / terms;

  // amount
  let amount: number;
  if (k === 0 && credit_amt > 0) {
    amount = (total - credit_amt) / terms;
  } else if (k === 4 && credit_amt > 0) {
    amount = credit_amt;
  } else if (k > 4 && credit_amt > 0) {
    amount = base;
  } else if (credit_amt > 0) {
    amount = (total - base * (k - 1) - credit_amt) / Math.max(1, terms - k);
  } else {
    // No credit applied, just divide total by terms
    amount = total / terms;
  }

  // IF(terms<4,"", amount)
  if (terms < 4) return "";

  return Math.round((isNaN(amount) ? 0 : amount) * 100) / 100;
}
