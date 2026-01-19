import { withOrder } from "../column-orders";
import { p4AmountColumn as _p4AmountColumn } from "./p4-amount";
import { p4CalendarEventIdColumn as _p4CalendarEventIdColumn } from "./p4-calendar-event-id";
import { p4CalendarEventLinkColumn as _p4CalendarEventLinkColumn } from "./p4-calendar-event-link";
import { p4DatePaidColumn as _p4DatePaidColumn } from "./p4-date-paid";
import { p4DueDateColumn as _p4DueDateColumn } from "./p4-due-date";
import { p4ScheduledEmailLinkColumn as _p4ScheduledEmailLinkColumn } from "./p4-scheduled-email-link";
import { p4ScheduledReminderDateColumn as _p4ScheduledReminderDateColumn } from "./p4-scheduled-reminder-date";

// Export columns with orders injected from global column-orders.ts
export const p4AmountColumn = withOrder(_p4AmountColumn);
export const p4CalendarEventIdColumn = withOrder(_p4CalendarEventIdColumn);
export const p4CalendarEventLinkColumn = withOrder(_p4CalendarEventLinkColumn);
export const p4DatePaidColumn = withOrder(_p4DatePaidColumn);
export const p4DueDateColumn = withOrder(_p4DueDateColumn);
export const p4ScheduledEmailLinkColumn = withOrder(_p4ScheduledEmailLinkColumn);
export const p4ScheduledReminderDateColumn = withOrder(_p4ScheduledReminderDateColumn);
