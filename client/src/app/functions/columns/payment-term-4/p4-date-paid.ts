import { BookingSheetColumn } from '@/types/booking-sheet-column';

export const p4DatePaidColumn: BookingSheetColumn = {
  id: 'p4DatePaid',
  data: {
    id: 'p4DatePaid',
    columnName: 'P4 Date Paid',
    dataType: 'date',
    parentTab: 'Payment Term 4',
    order: 76,
    includeInForms: false,
    color: 'none',
    width: 120,
  },
};
