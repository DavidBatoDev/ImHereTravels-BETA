import { BookingSheetColumn } from '@/types/booking-sheet-column';

export const useDiscountedTourCostColumn: BookingSheetColumn = {
  id: 'useDiscountedTourCost',
  data: {
    id: 'useDiscountedTourCost',
    columnName: 'Use Discounted Tour Cost?',
    dataType: 'boolean',
    parentTab: 'Reservation Email',
    includeInForms: true,
    color: 'orange',
    width: 242.6666259765625,
  },
};
