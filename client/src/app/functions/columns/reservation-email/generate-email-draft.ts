import { BookingSheetColumn } from '@/types/booking-sheet-column';

export const generateEmailDraftColumn: BookingSheetColumn = {
  id: 'generateEmailDraft',
  data: {
    id: 'generateEmailDraft',
    columnName: 'Generate Email Draft',
    dataType: 'boolean',
    parentTab: 'Reservation Email',
    includeInForms: true,
    color: 'orange',
    width: 201.3333740234375,
  },
};
