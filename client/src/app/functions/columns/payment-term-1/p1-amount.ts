import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const p1AmountColumn: BookingSheetColumn = {
  id: "p1Amount",
  data: {
    id: "p1Amount",
    columnName: "P1 Amount",
    dataType: "function",
    function: "getP1AmountFunction",
    parentTab: "Payment Term 1",
    order: 55,
    includeInForms: false,
    color: "yellow",
    width: 120,
    arguments: [
      {
        name: "p1DueDate",
        type: "any",
        columnReference: "P1 Due Date",
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
        name: "paymentCondition",
        type: "string",
        columnReference: "Available Payment Terms",
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
/**
 * Excel equivalent:
 * =ArrayFormula(IF($BA1003<>"", ... ))
 *
 * Description:
 * - Calculates the P1 amount based on tour cost, reservation fee,
 *   credits, payment plan, and which payments were already made.
 * - Handles proportional installment allocation with credit deduction.
 */

export default function getP1AmountFunction(
  p1DueDate?: string | Date,
  useDiscountedTourCost?: boolean,
  discountedTourCost?: number,
  originalTourCost?: number,
  reservationFee?: number,
  creditFrom?: string,
  creditAmount?: number,
  paymentPlan?: string,
  paymentCondition?: string,
  fullPaymentDatePaid?: string | Date,
  fullPaymentAmount?: number,
  p2DatePaid?: string | Date,
  p2Amount?: number,
  p3DatePaid?: string | Date,
  p3Amount?: number,
  p4DatePaid?: string | Date,
  p4Amount?: number
) {
  if (!p1DueDate) return "";

  const total =
    (useDiscountedTourCost ? discountedTourCost ?? 0 : originalTourCost ?? 0) -
    (reservationFee ?? 0);
  const cf = creditFrom ?? "";
  const ca = creditAmount ?? 0;

  // Case: No payment plan or condition → return unpaid balance
  if (!paymentPlan && !paymentCondition) {
    const paidSum =
      (fullPaymentDatePaid ? fullPaymentAmount ?? 0 : 0) +
      (p2DatePaid ? p2Amount ?? 0 : 0) +
      (p3DatePaid ? p3Amount ?? 0 : 0) +
      (p4DatePaid ? p4Amount ?? 0 : 0);

    return total - paidSum;
  }

  // Determine number of terms (P1–P4)
  const termsMap: Record<string, number> = {
    "": 1,
    P1: 1,
    P2: 2,
    P3: 3,
    P4: 4,
  };
  const terms = termsMap[paymentPlan ?? ""] ?? 1;

  // Detect credits and payments
  const creditFlags = {
    P1: cf.includes("P1"),
    P2: cf.includes("P2"),
    P3: cf.includes("P3"),
    P4: cf.includes("P4"),
  };
  const paidFlags = {
    P1: false,
    P2: !!p2DatePaid,
    P3: !!p3DatePaid,
    P4: !!p4DatePaid,
  };

  const creditedCount = Math.min(
    terms,
    Object.values(creditFlags).filter(Boolean).length +
      Object.values(paidFlags).filter(Boolean).length
  );
  const denom = Math.max(1, terms - creditedCount);

  // Assign numeric order to credit source
  // Only set k if there's an actual credit amount, otherwise treat as no credit
  const k =
    ca > 0 && cf === "Reservation"
      ? 0
      : ca > 0 && cf === "P1"
      ? 1
      : ca > 0 && cf === "P2"
      ? 2
      : ca > 0 && cf === "P3"
      ? 3
      : ca > 0 && cf === "P4"
      ? 4
      : 0;

  const base = total / terms;

  let amount: number;
  if (k === 0 && ca > 0) {
    amount = (total - ca) / terms;
  } else if (k === 1 && ca > 0) {
    amount = ca;
  } else if (k > 1 && ca > 0) {
    amount = base;
  } else if (ca > 0) {
    amount = (total - base * (k - 1) - ca) / Math.max(1, terms - k);
  } else {
    // No credit applied, just divide total by terms
    amount = total / terms;
  }

  return Math.round((isNaN(amount) ? 0 : amount) * 100) / 100;
}
