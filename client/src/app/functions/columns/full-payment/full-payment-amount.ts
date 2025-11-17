import { BookingSheetColumn } from '@/types/booking-sheet-column';

export const fullPaymentAmountColumn: BookingSheetColumn = {
  id: 'fullPaymentAmount',
  data: {
    id: 'fullPaymentAmount',
    columnName: 'Full Payment Amount',
    dataType: 'function',
    function: 'getFullPaymentRemainingFunction',
    parentTab: 'Full Payment',
    order: 47,
    includeInForms: false,
    color: 'yellow',
    width: 160,
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
        name: 'paymentPlan',
        type: 'string',
        columnReference: 'Payment Plan',
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: '',
      },
      {
        name: 'isMainBooker',
        type: 'boolean',
        columnReference: 'Is Main Booker?',
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: '',
      },
      {
        name: 'discountedTourCost',
        type: 'number',
        columnReference: 'Discounted Tour Cost',
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: '',
      },
      {
        name: 'originalTourCost',
        type: 'number',
        columnReference: 'Original Tour Cost',
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: '',
      },
      {
        name: 'reservationFee',
        type: 'number',
        columnReference: 'Reservation Fee',
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: '',
      },
      {
        name: 'creditAmount',
        type: 'number',
        columnReference: 'Manual Credit',
        isOptional: true,
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
 * =IF(
 *   $AT1003<>"",
 *   IF(
 *     $AM1003 = "Full Payment",
 *     ROUND(IF($Y1003, $AG1003, $AF1003) - $AH1003 - N($AK1003), 2),
 *     ""
 *   ),
 *   ""
 * )
 *
 * Description:
 * - Calculates the remaining amount for a **Full Payment** plan.
 * - If not "Full Payment" or tourPackageName is blank, returns "".
 * - Uses discounted cost if user is the main booker, otherwise uses original cost.
 * - Rounds result using Math.round to 2 decimal places.
 */

export default function getFullPaymentRemainingFunction(
  tourPackageName: string, // corresponds to $AT1003
  paymentPlan: string, // $AM1003
  isMainBooker: boolean, // $Y1003
  discountedTourCost?: number, // $AG1003
  originalTourCost?: number, // $AF1003
  reservationFee?: number, // $AH1003
  creditAmount?: number, // $AK1003
): number | string {
  // if no tour package name, return ""
  if (!tourPackageName) return "";

  // HUH
  // only compute for Full Payment plan
  if (paymentPlan !== "Full Payment") return "";

  // choose cost depending on isMainBooker
  const baseCost = isMainBooker ? discountedTourCost || 0 : originalTourCost || 0;

  // handle reservation and credit safely
  const resFee = reservationFee || 0;
  const credit = creditAmount || 0;

  // compute remaining and round to 2 decimals
  const remaining = Math.round((baseCost - resFee - credit) * 100) / 100;

  return remaining;
}
