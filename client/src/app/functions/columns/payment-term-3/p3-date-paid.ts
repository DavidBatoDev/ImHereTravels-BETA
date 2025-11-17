import { BookingSheetColumn } from '@/types/booking-sheet-column';

export const p3DatePaidColumn: BookingSheetColumn = {
  id: 'p3DatePaid',
  data: {
    id: 'p3DatePaid',
    columnName: 'P3 Date Paid',
    dataType: 'date',
    parentTab: 'Payment Term 3',
    order: 69,
    includeInForms: false,
    color: 'none',
    width: 120,
  },
};
