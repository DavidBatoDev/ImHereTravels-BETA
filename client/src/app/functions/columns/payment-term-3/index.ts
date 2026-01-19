import { withOrder } from "../column-orders";
import { p3AmountColumn as _p3AmountColumn } from "./p3-amount";
import { p3CalendarEventIdColumn as _p3CalendarEventIdColumn } from "./p3-calendar-event-id";
import { p3CalendarEventLinkColumn as _p3CalendarEventLinkColumn } from "./p3-calendar-event-link";
import { p3DatePaidColumn as _p3DatePaidColumn } from "./p3-date-paid";
import { p3DueDateColumn as _p3DueDateColumn } from "./p3-due-date";
import { p3ScheduledEmailLinkColumn as _p3ScheduledEmailLinkColumn } from "./p3-scheduled-email-link";
import { p3ScheduledReminderDateColumn as _p3ScheduledReminderDateColumn } from "./p3-scheduled-reminder-date";

// Export columns with orders injected from global column-orders.ts
export const p3AmountColumn = withOrder(_p3AmountColumn);
export const p3CalendarEventIdColumn = withOrder(_p3CalendarEventIdColumn);
export const p3CalendarEventLinkColumn = withOrder(_p3CalendarEventLinkColumn);
export const p3DatePaidColumn = withOrder(_p3DatePaidColumn);
export const p3DueDateColumn = withOrder(_p3DueDateColumn);
export const p3ScheduledEmailLinkColumn = withOrder(_p3ScheduledEmailLinkColumn);
export const p3ScheduledReminderDateColumn = withOrder(_p3ScheduledReminderDateColumn);
