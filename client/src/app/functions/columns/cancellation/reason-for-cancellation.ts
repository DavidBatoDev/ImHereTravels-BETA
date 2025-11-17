import { BookingSheetColumn } from '@/types/booking-sheet-column';

export const reasonForCancellationColumn: BookingSheetColumn = {
  id: 'reasonForCancellation',
  data: {
    id: 'reasonForCancellation',
    columnName: 'Reason for Cancellation',
    dataType: 'string',
    parentTab: 'Cancellation',
    order: 77,
    includeInForms: false,
    color: 'none',
    width: 200,
  },
};
