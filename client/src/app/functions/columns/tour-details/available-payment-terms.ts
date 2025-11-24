import { BookingSheetColumn } from '@/types/booking-sheet-column';

export const availablePaymentTermsColumn: BookingSheetColumn = {
  id: 'availablePaymentTerms',
  data: {
    id: 'availablePaymentTerms',
    columnName: 'Available Payment Terms',
    dataType: 'function',
    function: 'availablePaymentTermFunction',
    parentTab: 'Tour Details',
    order: 21,
    includeInForms: false,
    color: 'yellow',
    width: 262,
    arguments: [
      {
        name: 'cancelMarker',
        type: 'unknown',
        columnReference: 'Reason for Cancellation',
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: '',
      },
      {
        name: 'paymentCondition',
        type: 'string',
        columnReference: 'Payment Condition',
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: '',
      },
    ],
  },
};

// Column Function Implementation
/**
 * Excel equivalent:
 * =IF(ISBLANK(BY),
 *     IFERROR(VLOOKUP(Q, PaymentTerms, "Available Payment Terms"), ""),
 *     "Cancelled")
 *
 * @param cancelMarker   (BY column) if non-blank => "Cancelled"
 * @param paymentCondition (Q column) one of "Invalid Booking", "Last Minute Booking", "Standard Booking, P1-4"
 * @returns string: Available Payment Term, "" if not found, or "Cancelled" if cancelled
 */

const paymentTerms = [
  { condition: "Invalid Booking", available: "Invalid" },
  { condition: "Last Minute Booking", available: "Full payment required within 48hrs" },
  { condition: "Standard Booking, P1", available: "P1" },
  { condition: "Standard Booking, P2", available: "P2" },
  { condition: "Standard Booking, P3", available: "P3" },
  { condition: "Standard Booking, P4", available: "P4" },
];

export default function availablePaymentTermFunction(
  cancelMarker: unknown,
  paymentCondition: string | null | undefined
): string {
  const isBlankLike = (v: unknown) =>
    v === null || v === undefined || (typeof v === "string" && v.trim() === "");

  // If BY is not blank → "Cancelled"
  if (!isBlankLike(cancelMarker)) return "Cancelled";

  // If payment condition is blank
  if (!paymentCondition || paymentCondition.trim() === "") return "";

  const target = paymentCondition.trim().toLowerCase();

  const found = paymentTerms.find(
    t => t.condition.trim().toLowerCase() === target
  );

  return found ? found.available : "";
}
