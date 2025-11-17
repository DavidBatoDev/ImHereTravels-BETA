import { BookingSheetColumn } from '@/types/booking-sheet-column';

export const deleteColumn: BookingSheetColumn = {
  id: 'delete',
  data: {
    id: 'delete',
    columnName: 'Delete',
    dataType: 'function',
    parentTab: 'Identifier',
    order: 85,
    includeInForms: false,
    color: 'red',
    width: 110.666748046875,
  },
};
