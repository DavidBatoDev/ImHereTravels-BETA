import { Timestamp } from "firebase/firestore";

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export type NotificationType =
  | "payment_received"
  | "new_booking"
  | "booking_cancelled"
  | "payment_reminder"
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
  system: {
    icon: "Info",
    color: "text-gray-600",
    bgColor: "bg-gray-100",
  },
};
