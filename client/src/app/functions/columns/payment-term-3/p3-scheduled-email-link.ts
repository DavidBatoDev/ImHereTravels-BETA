import { BookingSheetColumn } from '@/types/booking-sheet-column';

export const p3ScheduledEmailLinkColumn: BookingSheetColumn = {
  id: 'p3ScheduledEmailLink',
  data: {
    id: 'p3ScheduledEmailLink',
    columnName: 'P3 Scheduled Email Link',
    dataType: 'string',
    parentTab: 'Payment Term 3',
    order: 64,
    includeInForms: true,
    color: 'yellow',
    width: 180,
  },
};
