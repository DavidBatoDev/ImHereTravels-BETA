import { BookingSheetColumn } from '@/types/booking-sheet-column';

export const reservationDateColumn: BookingSheetColumn = {
  id: 'reservationDate',
  data: {
    id: 'reservationDate',
    columnName: 'Reservation Date',
    dataType: 'date',
    parentTab: 'Tour Details',
    includeInForms: true,
    color: 'none',
    width: 171.333251953125,
  },
};
