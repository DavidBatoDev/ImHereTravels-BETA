import { BookingSheetColumn } from '@/types/booking-sheet-column';

export const groupIdColumn: BookingSheetColumn = {
  id: 'groupId',
  data: {
    id: 'groupId',
    columnName: 'Group ID',
    dataType: 'string',
    parentTab: 'If Duo or Group Booking',
    order: 24,
    includeInForms: false,
  },
};
