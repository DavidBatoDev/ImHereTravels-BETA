import { BookingSheetColumn } from '@/types/booking-sheet-column';

export const paidColumn: BookingSheetColumn = {
  id: 'paid',
  data: {
    id: 'paid',
    columnName: 'Paid',
    dataType: 'function',
    function: 'getTotalPaidAmountFunction',
    parentTab: 'Payment Setting',
    includeInForms: false,
    color: 'yellow',
    width: 100,
    arguments: [
      {
        name: 'tourPackageName',
        type: 'string',
        columnReference: 'Tour Package Name',
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: '',
      },
      {
        name: 'reservationFee',
        type: 'string | number',
        columnReference: 'Reservation Fee',
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: '',
      },
      {
        name: 'creditFrom',
        type: 'string',
        columnReference: 'Credit From',
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: '',
      },
      {
        name: 'creditAmount',
        type: 'string | number',
        columnReference: 'Manual Credit',
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: '',
      },
      {
        name: 'fullPaymentDate',
        type: 'any',
        columnReference: 'Full Payment Date Paid',
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: '',
      },
      {
        name: 'fullPaymentAmount',
        type: 'string | number',
        columnReference: 'Full Payment Amount',
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: '',
      },
      {
        name: 'p1DatePaid',
        type: 'any',
        columnReference: 'P1 Date Paid',
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: '',
      },
      {
        name: 'p1Amount',
        type: 'string | number',
        columnReference: 'P1 Amount',
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: '',
      },
      {
        name: 'p2DatePaid',
        type: 'any',
        columnReference: 'P2 Date Paid',
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: '',
      },
      {
        name: 'p2Amount',
        type: 'string | number',
        columnReference: 'P2 Amount',
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: '',
      },
      {
        name: 'p3DatePaid',
        type: 'any',
        columnReference: 'P3 Date Paid',
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: '',
      },
      {
        name: 'p3Amount',
        type: 'string | number',
        columnReference: 'P3 Amount',
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: '',
      },
      {
        name: 'p4DatePaid',
        type: 'any',
        columnReference: 'P4 Date Paid',
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: '',
      },
      {
        name: 'p4Amount',
        type: 'string | number',
        columnReference: 'P4 Amount',
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: '',
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
  p4Amount?: number | string | null
): number | string {
  if (!tourPackageName) return "";

  const isPaid = (d: any): boolean => {
    if (!d) return false;
    if (typeof d === "object" && d?.type === "firestore/timestamp/1.0") return true;
    if (typeof d?.seconds === "number") return true;
    if (d instanceof Date && !isNaN(d.getTime())) return true;
    if (typeof d === "string" && d.trim() !== "") return true;
    return false;
  };

  const num = (n: any) => {
    const parsed = parseFloat(n);
    return !isNaN(parsed) ? parsed : 0;
  };

  const creditFromStr = (creditFrom || "").trim();

  // Reservation Fee
  const resPaid =
    num(reservationFee) +
    (creditFromStr === "Reservation" ? num(creditAmount) : 0);

  // Full Payment
  const fullPaid =
    isPaid(fullPaymentDate) || creditFromStr === "Full Payment"
      ? creditFromStr === "Full Payment"
        ? num(creditAmount)
        : num(fullPaymentAmount)
      : 0;

  // Partial Payments
  const p1_paid =
    isPaid(p1DatePaid) || creditFromStr === "P1"
      ? creditFromStr === "P1"
        ? num(creditAmount)
        : num(p1Amount)
      : 0;

  const p2_paid =
    isPaid(p2DatePaid) || creditFromStr === "P2"
      ? creditFromStr === "P2"
        ? num(creditAmount)
        : num(p2Amount)
      : 0;

  const p3_paid =
    isPaid(p3DatePaid) || creditFromStr === "P3"
      ? creditFromStr === "P3"
        ? num(creditAmount)
        : num(p3Amount)
      : 0;

  const p4_paid =
    isPaid(p4DatePaid) || creditFromStr === "P4"
      ? creditFromStr === "P4"
        ? num(creditAmount)
        : num(p4Amount)
      : 0;

  const totalPaid = resPaid + fullPaid + p1_paid + p2_paid + p3_paid + p4_paid;

  return Number(totalPaid.toFixed(2));
}
