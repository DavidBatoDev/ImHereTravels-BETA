import { BookingSheetColumn } from '@/types/booking-sheet-column';

export const includeBccReservationColumn: BookingSheetColumn = {
  id: 'includeBccReservation',
  data: {
    id: 'includeBccReservation',
    columnName: 'Include BCC (Reservation)',
    dataType: 'boolean',
    parentTab: 'Reservation Email',
    includeInForms: true,
    color: 'orange',
    width: 258,
  },
};
