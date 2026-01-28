import { withOrder } from "../column-orders";
import { bookingCodeColumn as _bookingCodeColumn } from "./booking-code";
import { bookingIdColumn as _bookingIdColumn } from "./booking-id";
import { deleteColumn as _deleteColumn } from "./delete";
import { formattedDateColumn as _formattedDateColumn } from "./formatted-date";
import { tourCodeColumn as _tourCodeColumn } from "./tour-code";
import { tourPackageNameUniqueCounterColumn as _tourPackageNameUniqueCounterColumn } from "./tour-package-name-unique-counter";
import { travellerInitialsColumn as _travellerInitialsColumn } from "./traveller-initials";

// Export columns with orders injected from global column-orders.ts
export const bookingCodeColumn = withOrder(_bookingCodeColumn);
export const bookingIdColumn = withOrder(_bookingIdColumn);
export const deleteColumn = withOrder(_deleteColumn);
export const formattedDateColumn = withOrder(_formattedDateColumn);
export const tourCodeColumn = withOrder(_tourCodeColumn);
export const tourPackageNameUniqueCounterColumn = withOrder(_tourPackageNameUniqueCounterColumn);
export const travellerInitialsColumn = withOrder(_travellerInitialsColumn);
