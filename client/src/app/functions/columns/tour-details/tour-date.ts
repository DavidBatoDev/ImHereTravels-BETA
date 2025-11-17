import { BookingSheetColumn } from '@/types/booking-sheet-column';

export const tourDateColumn: BookingSheetColumn = {
  id: 'tourDate',
  data: {
    id: 'tourDate',
    columnName: 'Tour Date',
    dataType: 'date',
    parentTab: 'Tour Details',
    order: 15,
    includeInForms: true,
    width: 148.666748046875,
  },
};
