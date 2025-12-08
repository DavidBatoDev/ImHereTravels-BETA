import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const p2AmountColumn: BookingSheetColumn = {
  id: "p2Amount",
  data: {
    id: "p2Amount",
    columnName: "P2 Amount",
    dataType: "function",
    function: "getP2AmountFunction",
    parentTab: "Payment Term 2",
    order: 62,
    includeInForms: false,
    color: "yellow",
    width: 120,
    arguments: [
      {
        name: "p2DueDate",
        type: "any",
        columnReference: "P2 Due Date",
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
export default function getP2AmountFunction(
  p2DueDate?: string | Date,
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
  p3DatePaid?: string | Date,
  p3Amount?: number,
  p4DatePaid?: string | Date,
  p4Amount?: number
) {
  // =IF($BH1003<>"", ...)
  if (!p2DueDate) return "";

  // total, credit_from, credit_amt
  const total =
    (useDiscountedTourCost ? discountedTourCost ?? 0 : originalTourCost ?? 0) -
    (reservationFee ?? 0);
  const credit_from = creditFrom ?? "";
  const credit_amt = creditAmount ?? 0;

  // IF(AND($AM1003="", $AN1003=""), ...)
  if (!paymentPlan) {
    // When no payment plan is specified, calculate unpaid balance divided by 2
    const paidSum =
      (fullPaymentDatePaid ? fullPaymentAmount ?? 0 : 0) +
      (p1DatePaid ? p1Amount ?? 0 : 0) +
      (p3DatePaid ? p3Amount ?? 0 : 0) +
      (p4DatePaid ? p4Amount ?? 0 : 0);

    const result = (total - paidSum) / 2;
    return Math.round(result * 100) / 100;
  }

  // LET(
  //   terms, SWITCH($AM1003,"",1,"P1",1,"P2",2,"P3",3,"P4",4,""),
  const termsMap: Record<string, number> = {
    "": 1,
    P1: 1,
    P2: 2,
    P3: 3,
    P4: 4,
  };
  const terms = termsMap[paymentPlan ?? ""] ?? 1;

  // cf, pTwo, paid1, paid2
  const cf = `,${credit_from},`;
  const pTwo = cf.includes(",P2,");
  const paid1 = !!p1DatePaid;
  const paid2 = !!p2DatePaid;

  // credited, unpaidCount, adjustedDenom
  const credited = Math.min(terms, Number(pTwo) + Number(paid2));
  const unpaidCount = terms - Number(paid1) - Number(paid2);
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
  } else if (k === 2 && credit_amt > 0) {
    amount = credit_amt;
  } else if (k > 2 && credit_amt > 0) {
    amount = base;
  } else if (credit_amt > 0) {
    amount = (total - base * (k - 1) - credit_amt) / Math.max(1, terms - k);
  } else {
    // No credit applied, just divide total by terms
    amount = total / terms;
  }

  // IF(terms<2,"", amount)
  if (terms < 2) return "";

  return Math.round((isNaN(amount) ? 0 : amount) * 100) / 100;
}
