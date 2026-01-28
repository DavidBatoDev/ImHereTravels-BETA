import { withOrder } from "../column-orders";
import { emailAddressColumn as _emailAddressColumn } from "./email-address";
import { firstNameColumn as _firstNameColumn } from "./first-name";
import { fullNameColumn as _fullNameColumn } from "./full-name";
import { lastNameColumn as _lastNameColumn } from "./last-name";

// Export columns with orders injected from global column-orders.ts
export const emailAddressColumn = withOrder(_emailAddressColumn);
export const firstNameColumn = withOrder(_firstNameColumn);
export const fullNameColumn = withOrder(_fullNameColumn);
export const lastNameColumn = withOrder(_lastNameColumn);
