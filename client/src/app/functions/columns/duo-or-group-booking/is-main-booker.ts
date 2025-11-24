import { BookingSheetColumn } from '@/types/booking-sheet-column';

export const isMainBookerColumn: BookingSheetColumn = {
  id: 'isMainBooker',
  data: {
    id: 'isMainBooker',
    columnName: 'Is Main Booker?',
    dataType: 'boolean',
    parentTab: 'If Duo or Group Booking',
    order: 22,
    includeInForms: true,
    color: 'orange',
    width: 272,
  },
};
