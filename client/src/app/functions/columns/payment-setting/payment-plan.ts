import { BookingSheetColumn } from '@/types/booking-sheet-column';

export const paymentPlanColumn: BookingSheetColumn = {
  id: 'paymentPlan',
  data: {
    id: 'paymentPlan',
    columnName: 'Payment Plan',
    dataType: 'select',
    parentTab: 'Payment Setting',
    order: 40,
    includeInForms: true,
    width: 162.6666259765625,
    options: ['Full Payment', 'P1', 'P2', 'P3', 'P4'],
  },
};
