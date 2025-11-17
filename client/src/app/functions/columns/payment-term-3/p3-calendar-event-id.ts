import { BookingSheetColumn } from '@/types/booking-sheet-column';

export const p3CalendarEventIdColumn: BookingSheetColumn = {
  id: 'p3CalendarEventId',
  data: {
    id: 'p3CalendarEventId',
    columnName: 'P3 Calendar Event ID',
    dataType: 'string',
    parentTab: 'Payment Term 3',
    order: 65,
    includeInForms: true,
    color: 'yellow',
    width: 160,
  },
};
