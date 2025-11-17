import { BookingSheetColumn } from '@/types/booking-sheet-column';

export const fullPaymentDatePaidColumn: BookingSheetColumn = {
  id: 'fullPaymentDatePaid',
  data: {
    id: 'fullPaymentDatePaid',
    columnName: 'Full Payment Date Paid',
    dataType: 'date',
    parentTab: 'Full Payment',
    order: 48,
    includeInForms: true,
    width: 160,
  },
};
