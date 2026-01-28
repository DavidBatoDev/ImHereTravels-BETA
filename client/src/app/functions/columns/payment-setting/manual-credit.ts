import { BookingSheetColumn } from '@/types/booking-sheet-column';

export const manualCreditColumn: BookingSheetColumn = {
  id: 'manualCredit',
  data: {
    id: 'manualCredit',
    columnName: 'Manual Credit',
    dataType: 'currency',
    parentTab: 'Payment Setting',
    includeInForms: true,
    width: 162,
  },
};
