import { BookingSheetColumn } from '@/types/booking-sheet-column';

export const sendEmailColumn: BookingSheetColumn = {
  id: 'sendEmail',
  data: {
    id: 'sendEmail',
    columnName: 'Send Email?',
    dataType: 'boolean',
    parentTab: 'Reservation Email',
    order: 30,
    includeInForms: false,
    color: 'orange',
    width: 173.9791717529297,
  },
};
