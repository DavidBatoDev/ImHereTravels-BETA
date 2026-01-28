import { withOrder } from "../column-orders";
import { groupIdColumn as _groupIdColumn } from "./group-id";
import { groupIdGroupIdGeneratorColumn as _groupIdGroupIdGeneratorColumn } from "./group-id-group-id-generator";
import { isMainBookerColumn as _isMainBookerColumn } from "./is-main-booker";

// Export columns with orders injected from global column-orders.ts
export const groupIdColumn = withOrder(_groupIdColumn);
export const groupIdGroupIdGeneratorColumn = withOrder(_groupIdGroupIdGeneratorColumn);
export const isMainBookerColumn = withOrder(_isMainBookerColumn);
