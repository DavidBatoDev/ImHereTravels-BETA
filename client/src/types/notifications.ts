import { Timestamp } from "firebase/firestore";

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export type NotificationType =
  | "new_booking"
  | "payment_received"
  | "payment_plan_selected"
  | "booking_cancelled"
  | "payment_reminder"
  | "payment_reminder_created"
  | "payment_reminder_sent"
  | "reservation_email"
  | "pre_departure_pack"
  | "system";

export type NotificationTargetType = "global" | "specific";

export interface NotificationData {
  bookingId?: string;
  bookingDocumentId?: string;
  amount?: number;
  currency?: string;
  travelerName?: string;
  tourPackageName?: string;
  paymentPlan?: string;
  [key: string]: any; // Allow additional custom data
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: NotificationData;
  targetType: NotificationTargetType;
  targetUserIds?: string[]; // Only used when targetType is "specific"
  createdAt: Timestamp;
  readBy: Record<string, Timestamp>; // userId -> timestamp when read
}

// ============================================================================
// NOTIFICATION CREATE/UPDATE TYPES
// ============================================================================

export interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  body: string;
  data: NotificationData;
  targetType: NotificationTargetType;
  targetUserIds?: string[];
}

// ============================================================================
// NOTIFICATION UI TYPES
// ============================================================================

export interface NotificationWithReadStatus extends Notification {
  isRead: boolean;
  readAt?: Timestamp;
}

export interface NotificationState {
  notifications: NotificationWithReadStatus[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
}

// ============================================================================
// NOTIFICATION ICON MAPPING
// ============================================================================

export const notificationTypeConfig: Record<
  NotificationType,
  {
    icon: string;
    color: string;
    bgColor: string;
  }
> = {
  payment_received: {
    icon: "CreditCard",
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  new_booking: {
    icon: "CalendarPlus",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  booking_cancelled: {
    icon: "CalendarX",
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
  payment_reminder: {
    icon: "Clock",
    color: "text-orange-600",
    bgColor: "bg-orange-100",
  },
  payment_reminder_created: {
    icon: "CalendarClock",
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
  },
  payment_reminder_sent: {
    icon: "Mail",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  payment_plan_selected: {
    icon: "CreditCard",
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
  },
  reservation_email: {
    icon: "Mail",
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
  pre_departure_pack: {
    icon: "PackageCheck",
    color: "text-indigo-600",
    bgColor: "bg-indigo-100",
  },
  system: {
    icon: "Info",
    color: "text-gray-600",
    bgColor: "bg-gray-100",
  },
};
