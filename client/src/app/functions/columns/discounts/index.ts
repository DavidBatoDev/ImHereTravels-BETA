import { withOrder } from "../column-orders";
import { eventNameColumn as _eventNameColumn } from "./event-name";
import { discountRateColumn as _discountRateColumn } from "./discount-rate";

// Export columns with orders injected from global column-orders.ts
export const eventNameColumn = withOrder(_eventNameColumn);
export const discountRateColumn = withOrder(_discountRateColumn);
