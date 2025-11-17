import { BookingSheetColumn } from '@/types/booking-sheet-column';

export const sendCancellationEmailColumn: BookingSheetColumn = {
  id: 'sendCancellationEmail',
  data: {
    id: 'sendCancellationEmail',
    columnName: 'Send Cancellation Email?',
    dataType: 'boolean',
    parentTab: 'Cancellation',
    order: 82,
    includeInForms: false,
    color: 'yellow',
    width: 180,
  },
};
