"use client";

import { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  writeBatch,
  limit,
  startAfter,
  getDocs,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/auth-store";
import {
  Notification,
  NotificationWithReadStatus,
} from "@/types/notifications";

const NOTIFICATIONS_PER_PAGE = 20;

interface UseNotificationsReturn {
  notifications: NotificationWithReadStatus[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const { user, userProfile } = useAuthStore();
  const [notifications, setNotifications] = useState<
    NotificationWithReadStatus[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  const userId = user?.uid;

  // Check if user has payment notifications enabled
  const hasPaymentNotificationsEnabled =
    userProfile?.preferences?.notifications?.payments !== false;

  // Transform notification with read status for current user
  const transformNotification = useCallback(
    (notification: Notification): NotificationWithReadStatus => {
      const readTimestamp = userId ? notification.readBy?.[userId] : undefined;
      return {
        ...notification,
        isRead: !!readTimestamp,
        readAt: readTimestamp,
      };
    },
    [userId],
  );

  // Real-time listener for notifications
  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    // Don't load if user has disabled payment notifications
    if (!hasPaymentNotificationsEnabled) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Query for global notifications (all users see these)
    // For now, we'll query all notifications and filter client-side
    // since Firestore doesn't support OR queries well
    const notificationsRef = collection(db, "notifications");
    const q = query(
      notificationsRef,
      orderBy("createdAt", "desc"),
      limit(NOTIFICATIONS_PER_PAGE),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notificationsData: NotificationWithReadStatus[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data() as Omit<Notification, "id">;
          const notification: Notification = {
            id: doc.id,
            ...data,
          };

          // Filter: include if global OR if user is in targetUserIds
          const isGlobal = notification.targetType === "global";
          const isTargeted =
            notification.targetType === "specific" &&
            notification.targetUserIds?.includes(userId);

          if (isGlobal || isTargeted) {
            notificationsData.push(transformNotification(notification));
          }
        });

        setNotifications(notificationsData);
        setIsLoading(false);

        // Track last document for pagination
        if (snapshot.docs.length > 0) {
          setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        }
        setHasMore(snapshot.docs.length === NOTIFICATIONS_PER_PAGE);
      },
      (err) => {
        console.error("Error fetching notifications:", err);
        setError("Failed to load notifications");
        setIsLoading(false);
      },
    );

    return () => unsubscribe();
  }, [userId, hasPaymentNotificationsEnabled, transformNotification]);

  // Calculate unread count
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Load more notifications (pagination)
  const loadMore = useCallback(async () => {
    if (!userId || !lastDoc || !hasMore) return;

    try {
      const notificationsRef = collection(db, "notifications");
      const q = query(
        notificationsRef,
        orderBy("createdAt", "desc"),
        startAfter(lastDoc),
        limit(NOTIFICATIONS_PER_PAGE),
      );

      const snapshot = await getDocs(q);
      const newNotifications: NotificationWithReadStatus[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data() as Omit<Notification, "id">;
        const notification: Notification = {
          id: doc.id,
          ...data,
        };

        const isGlobal = notification.targetType === "global";
        const isTargeted =
          notification.targetType === "specific" &&
          notification.targetUserIds?.includes(userId);

        if (isGlobal || isTargeted) {
          newNotifications.push(transformNotification(notification));
        }
      });

      setNotifications((prev) => [...prev, ...newNotifications]);

      if (snapshot.docs.length > 0) {
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      }
      setHasMore(snapshot.docs.length === NOTIFICATIONS_PER_PAGE);
    } catch (err) {
      console.error("Error loading more notifications:", err);
      setError("Failed to load more notifications");
    }
  }, [userId, lastDoc, hasMore, transformNotification]);

  // Mark a single notification as read
  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!userId) return;

      try {
        const notificationRef = doc(db, "notifications", notificationId);
        await updateDoc(notificationRef, {
          [`readBy.${userId}`]: Timestamp.now(),
        });

        // Update local state immediately for optimistic UI
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? { ...n, isRead: true, readAt: Timestamp.now() }
              : n,
          ),
        );
      } catch (err) {
        console.error("Error marking notification as read:", err);
        setError("Failed to mark notification as read");
      }
    },
    [userId],
  );

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    try {
      const unreadNotifications = notifications.filter((n) => !n.isRead);

      if (unreadNotifications.length === 0) return;

      const batch = writeBatch(db);
      const now = Timestamp.now();

      unreadNotifications.forEach((notification) => {
        const notificationRef = doc(db, "notifications", notification.id);
        batch.update(notificationRef, {
          [`readBy.${userId}`]: now,
        });
      });

      await batch.commit();

      // Update local state immediately
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: now })),
      );
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
      setError("Failed to mark all notifications as read");
    }
  }, [userId, notifications]);

  // Delete a single notification
  const deleteNotification = useCallback(
    async (notificationId: string) => {
      if (!userId) return;

      try {
        // Optimistically update UI
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

        // Delete from Firestore
        const notificationRef = doc(db, "notifications", notificationId);
        await deleteDoc(notificationRef);
      } catch (err) {
        console.error("Error deleting notification:", err);
        setError("Failed to delete notification");
        // Revert optimistic update on error - refetch would happen via snapshot
      }
    },
    [userId],
  );

  // Delete all notifications
  const deleteAllNotifications = useCallback(async () => {
    if (!userId) return;

    try {
      if (notifications.length === 0) return;

      // Optimistically update UI
      const notificationsCopy = [...notifications];
      setNotifications([]);

      // Delete all in batch
      const batch = writeBatch(db);

      notificationsCopy.forEach((notification) => {
        const notificationRef = doc(db, "notifications", notification.id);
        batch.delete(notificationRef);
      });

      await batch.commit();
    } catch (err) {
      console.error("Error deleting all notifications:", err);
      setError("Failed to delete all notifications");
    }
  }, [userId, notifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    hasMore,
    loadMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
  };
}
