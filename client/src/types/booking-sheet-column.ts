import { SheetColumn } from './sheet-management';

/**
 * Represents a booking sheet column with its configuration
 */
export interface BookingSheetColumn {
  id: string;
  data: SheetColumn;
}

/**
 * Collection of all booking sheet columns organized by category
 */
export interface BookingSheetColumnsCollection {
  identifier: BookingSheetColumn[];
  travelerInformation: BookingSheetColumn[];
  tourDetails: BookingSheetColumn[];
  paymentSetting: BookingSheetColumn[];
  fullPayment: BookingSheetColumn[];
  paymentTerm1: BookingSheetColumn[];
  paymentTerm2: BookingSheetColumn[];
  paymentTerm3: BookingSheetColumn[];
  paymentTerm4: BookingSheetColumn[];
  reservationEmail: BookingSheetColumn[];
  cancellation: BookingSheetColumn[];
  groupBooking: BookingSheetColumn[];
}
