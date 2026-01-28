import { withOrder } from "../column-orders";
import { eventNameColumn as _eventNameColumn } from "./event-name";
import { discountTypeColumn as _discountTypeColumn } from "./discount-type";
import { discountRateColumn as _discountRateColumn } from "./discount-rate";

// Export columns with orders injected from global column-orders.ts
export const eventNameColumn = withOrder(_eventNameColumn);
export const discountTypeColumn = withOrder(_discountTypeColumn);
export const discountRateColumn = withOrder(_discountRateColumn);
