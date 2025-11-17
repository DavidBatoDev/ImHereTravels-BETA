import { BookingSheetColumn } from '@/types/booking-sheet-column';

export const creditFromColumn: BookingSheetColumn = {
  id: 'creditFrom',
  data: {
    id: 'creditFrom',
    columnName: 'Credit From',
    dataType: 'select',
    parentTab: 'Payment Setting',
    order: 39,
    includeInForms: true,
    width: 156,
    options: ['Reservation', 'P1', 'P2', 'P3'],
  },
};
