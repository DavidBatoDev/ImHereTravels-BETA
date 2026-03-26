import { BookingSheetColumn } from "@/types/booking-sheet-column";
import {
  getCreditOrder,
  roundCurrency,
  toNumber,
} from "../payment-calculation-helpers";

export const p3AmountColumn: BookingSheetColumn = {
  id: "p3Amount",
  data: {
    id: "p3Amount",
    columnName: "P3 Amount",
    dataType: "function",
    function: "getP3AmountFunction",
    parentTab: "Payment Term 3",
    includeInForms: false,
    color: "yellow",
    width: 120,
    arguments: [
      {
        name: "p3DueDate",
        type: "any",
        columnReference: "P3 Due Date",
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
export default function getP3AmountFunction(
  p3DueDate?: string | Date,
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
  p4DatePaid?: string | Date,
  p4Amount?: number
) {
  // =IF($BO1003<>"", ...)
  if (!p3DueDate) return "";

  // total, credit_from, credit_amt
  const discCost = toNumber(discountedTourCost);
  const origCost = toNumber(originalTourCost);
  const baseCost = (discCost > 0) ? discCost : origCost;
  const total = baseCost - toNumber(reservationFee);
  const credit_from = creditFrom ?? "";
  const credit_amt = toNumber(creditAmount);

  // IF(AND($AM1003="", $AN1003=""), ...)
  if (!paymentPlan) {
    // When no payment plan is specified, calculate unpaid balance divided by 3
    const paidSum =
      (fullPaymentDatePaid ? toNumber(fullPaymentAmount) : 0) +
      (p1DatePaid ? toNumber(p1Amount) : 0) +
      (p2DatePaid ? toNumber(p2Amount) : 0) +
      (p4DatePaid ? toNumber(p4Amount) : 0);

    const result = (total - paidSum) / 3;
    return roundCurrency(result);
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
  const creditOrder = getCreditOrder(credit_from, credit_amt);
  const base = total / terms;
  let amount = base;
  if (creditOrder === 0) {
    amount = (total - credit_amt) / terms;
  } else if (creditOrder === 3) {
    amount = credit_amt;
  }

  // IF(terms<3,"", amount)
  if (terms < 3) return "";

  return roundCurrency(amount);
}
