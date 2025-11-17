import { BookingSheetColumn } from '@/types/booking-sheet-column';

export const generateCancellationEmailDraftColumn: BookingSheetColumn = {
  id: 'generateCancellationEmailDraft',
  data: {
    id: 'generateCancellationEmailDraft',
    columnName: 'Generate Cancellation Email Draft',
    dataType: 'boolean',
    parentTab: 'Cancellation',
    order: 79,
    includeInForms: false,
    color: 'orange',
    width: 200,
  },
};
