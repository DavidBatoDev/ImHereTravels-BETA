"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  CreditCard,
  CalendarPlus,
  CalendarX,
  Clock,
  Info,
  Check,
  Loader2,
  X,
  Mail,
  CalendarClock,
  PackageCheck,
  Filter,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/use-notifications";
import {
  NotificationWithReadStatus,
  NotificationType,
} from "@/types/notifications";

// Icon mapping for notification types
const notificationIcons: Record<NotificationType, React.ElementType> = {
  payment_received: CreditCard,
  new_booking: CalendarPlus,
  booking_cancelled: CalendarX,
  payment_reminder: Clock,
  payment_reminder_created: CalendarClock,
  payment_reminder_sent: Mail,
  payment_plan_selected: CreditCard,
  reservation_email: Mail,
  pre_departure_pack: PackageCheck,
  system: Info,
};

const notificationColors: Record<
  NotificationType,
  { icon: string; bg: string }
> = {
  payment_received: {
    icon: "text-green-600 dark:text-green-400",
    bg: "bg-green-100 dark:bg-green-900/30",
  },
  new_booking: {
    icon: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-900/30",
  },
  booking_cancelled: {
    icon: "text-red-600 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-900/30",
  },
  payment_reminder: {
    icon: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-100 dark:bg-orange-900/30",
  },
  payment_reminder_created: {
    icon: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-100 dark:bg-indigo-900/30",
  },
  payment_reminder_sent: {
    icon: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-100 dark:bg-purple-900/30",
  },
  payment_plan_selected: {
    icon: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  reservation_email: {
    icon: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-100 dark:bg-purple-900/30",
  },
  pre_departure_pack: {
    icon: "text-teal-600 dark:text-teal-400",
    bg: "bg-teal-100 dark:bg-teal-900/30",
  },
  system: {
    icon: "text-gray-600 dark:text-gray-400",
    bg: "bg-gray-100 dark:bg-gray-800",
  },
};

interface NotificationItemProps {
  notification: NotificationWithReadStatus;
  onSelect: () => void;
  onMarkAsRead: () => void;
  onDelete: () => void;
}

function NotificationItem({
  notification,
  onSelect,
  onMarkAsRead,
  onDelete,
}: NotificationItemProps) {
  const Icon = notificationIcons[notification.type] || Info;
  const colors =
    notificationColors[notification.type] || notificationColors.system;

  // Format time ago
  const timeAgo = notification.createdAt?.toDate
    ? formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true })
    : "Just now";

  const handleClick = () => {
    if (!notification.isRead) {
      onMarkAsRead();
    }
    onSelect();
  };

  return (
    <DropdownMenuItem
      onClick={handleClick}
      className={cn(
        "flex items-start gap-3 p-3 cursor-pointer focus:bg-muted/50 group relative",
        !notification.isRead && "bg-primary/5",
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          colors.bg,
        )}
      >
        <Icon className={cn("h-4 w-4", colors.icon)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-6">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm font-medium truncate",
              notification.isRead ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {notification.title}
          </p>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
          {notification.body}
        </p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-muted-foreground/70">{timeAgo}</p>
          {!notification.isRead && (
            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-primary" />
          )}
        </div>
      </div>

      {/* Delete Button */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <Trash2 className="h-3 w-3 text-destructive" />
      </Button>
    </DropdownMenuItem>
  );
}

export default function NotificationDropdown() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<
    NotificationType | "all"
  >("all");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteAllConfirmOpen, setDeleteAllConfirmOpen] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<
    string | null
  >(null);
  const {
    notifications,
    unreadCount,
    isLoading,
    hasMore,
    loadMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
  } = useNotifications();

  // Filter notifications based on selected filter
  const filteredNotifications = useMemo(() => {
    if (selectedFilter === "all") {
      return notifications;
    }
    return notifications.filter((n) => n.type === selectedFilter);
  }, [notifications, selectedFilter]);

  // Handle notification click - navigate to booking if available
  const handleNotificationSelect = useCallback(
    (notification: NotificationWithReadStatus) => {
      if (notification.type === "payment_reminder_created") {
        // Navigate to payment reminders page
        router.push("/mail/payment-reminders");
      } else if (
        (notification.type === "payment_reminder_sent" ||
          notification.type === "reservation_email" ||
          notification.type === "pre_departure_pack") &&
        notification.data?.emailUrl
      ) {
        // Open Gmail sent email in new tab
        window.open(notification.data.emailUrl, "_blank");
      } else if (
        notification.type === "new_booking" &&
        notification.data?.bookingDocumentId
      ) {
        router.push(
          `/bookings?tab=bookings&bookingId=${notification.data.bookingDocumentId}`,
        );
      } else if (notification.data?.bookingDocumentId) {
        router.push(
          `/bookings?highlight=${notification.data.bookingDocumentId}`,
        );
      }
    },
    [router],
  );

  // Handle scroll for infinite loading
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement;
      const { scrollTop, scrollHeight, clientHeight } = target;

      // Load more when scrolled to bottom (with 50px threshold)
      if (
        scrollHeight - scrollTop - clientHeight < 50 &&
        hasMore &&
        !isLoading
      ) {
        loadMore();
      }
    },
    [hasMore, isLoading, loadMore],
  );

  // Handle delete confirmation
  const handleDeleteClick = (notificationId: string) => {
    setNotificationToDelete(notificationId);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (notificationToDelete) {
      deleteNotification(notificationToDelete);
      setNotificationToDelete(null);
    }
    setDeleteConfirmOpen(false);
  };

  const handleCancelDelete = () => {
    setNotificationToDelete(null);
    setDeleteConfirmOpen(false);
  };

  // Handle delete all confirmation
  const handleDeleteAllClick = () => {
    setDeleteAllConfirmOpen(true);
  };

  const handleConfirmDeleteAll = () => {
    deleteAllNotifications();
    setDeleteAllConfirmOpen(false);
  };

  const handleCancelDeleteAll = () => {
    setDeleteAllConfirmOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 rounded-full data-[state=open]:bg-muted focus-visible:ring-0 focus:outline-none"
          >
            <div className="relative flex items-center justify-center h-9 w-9">
              <Bell
                className={cn("h-4 w-4", unreadCount > 0 ? "bell-ring" : "")}
              />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] leading-none px-1.5 py-0.5 min-w-[18px]">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-80">
          {/* Header */}
          <div className="px-3 py-2 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Notifications</div>
                <div className="text-xs text-muted-foreground">
                  {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
                </div>
              </div>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={(e) => {
                    e.preventDefault();
                    markAllAsRead();
                  }}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <ScrollArea
            ref={scrollRef}
            className="max-h-[400px]"
            onScrollCapture={handleScroll}
          >
            {isLoading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No notifications yet
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  You&apos;ll see payment updates here
                </p>
              </div>
            ) : (
              <div className="py-1">
                {notifications.slice(0, 5).map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onSelect={() => handleNotificationSelect(notification)}
                    onMarkAsRead={() => markAsRead(notification.id)}
                    onDelete={() => handleDeleteClick(notification.id)}
                  />
                ))}
                handleDeleteClick
                {/* Show indicator if there are more */}
                {notifications.length > 5 && (
                  <div className="text-center py-2 text-xs text-muted-foreground">
                    +{notifications.length - 5} more notifications
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          {notifications.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <div className="p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-8 text-xs"
                  onClick={() => setIsModalOpen(true)}
                >
                  View all notifications
                </Button>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* All Notifications Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] w-[95vw] sm:w-full p-4 sm:p-6">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base sm:text-lg">
                All Notifications
              </DialogTitle>
              <div className="flex items-center gap-1 sm:gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 sm:h-8 text-xs"
                    onClick={() => markAllAsRead()}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">Mark all read</span>
                    <span className="sm:hidden">Mark read</span>
                  </Button>
                )}
                {notifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 sm:h-8 text-xs text-destructive hover:text-destructive"
                    onClick={handleDeleteAllClick}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">Delete all</span>
                    <span className="sm:hidden">Delete</span>
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {unreadCount > 0
                ? `${unreadCount} unread notification${
                    unreadCount > 1 ? "s" : ""
                  }`
                : "All caught up!"}
            </p>

            {/* Filter Badges */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3">
              <button
                onClick={() => setSelectedFilter("all")}
                className={cn(
                  "inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-medium transition-colors",
                  selectedFilter === "all"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                <Filter className="h-3 w-3" />
                All
              </button>
              <button
                onClick={() => setSelectedFilter("new_booking")}
                className={cn(
                  "inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-medium transition-colors",
                  selectedFilter === "new_booking"
                    ? "bg-blue-600 text-white dark:bg-blue-500"
                    : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50",
                )}
              >
                <CalendarPlus className="h-3 w-3" />
                <span className="hidden sm:inline">New Booking</span>
                <span className="sm:hidden">Booking</span>
              </button>
              <button
                onClick={() => setSelectedFilter("payment_plan_selected")}
                className={cn(
                  "inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-medium transition-colors",
                  selectedFilter === "payment_plan_selected"
                    ? "bg-emerald-600 text-white dark:bg-emerald-500"
                    : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50",
                )}
              >
                <CreditCard className="h-3 w-3" />
                <span className="hidden sm:inline">Payment Plan</span>
                <span className="sm:hidden">Plan</span>
              </button>
              <button
                onClick={() => setSelectedFilter("payment_reminder_created")}
                className={cn(
                  "inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-medium transition-colors",
                  selectedFilter === "payment_reminder_created"
                    ? "bg-indigo-600 text-white dark:bg-indigo-500"
                    : "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50",
                )}
              >
                <CalendarClock className="h-3 w-3" />
                <span className="hidden sm:inline">Reminder Created</span>
                <span className="sm:hidden">Created</span>
              </button>
              <button
                onClick={() => setSelectedFilter("payment_reminder_sent")}
                className={cn(
                  "inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-medium transition-colors",
                  selectedFilter === "payment_reminder_sent"
                    ? "bg-purple-600 text-white dark:bg-purple-500"
                    : "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50",
                )}
              >
                <Mail className="h-3 w-3" />
                <span className="hidden sm:inline">Reminder Sent</span>
                <span className="sm:hidden">Sent</span>
              </button>
              <button
                onClick={() => setSelectedFilter("reservation_email")}
                className={cn(
                  "hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  selectedFilter === "reservation_email"
                    ? "bg-purple-600 text-white dark:bg-purple-500"
                    : "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50",
                )}
              >
                <Mail className="h-3 w-3" />
                Reservation Email
              </button>
              <button
                onClick={() => setSelectedFilter("pre_departure_pack")}
                className={cn(
                  "hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  selectedFilter === "pre_departure_pack"
                    ? "bg-teal-600 text-white dark:bg-teal-500"
                    : "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400 hover:bg-teal-200 dark:hover:bg-teal-900/50",
                )}
              >
                <PackageCheck className="h-3 w-3" />
                Pre-Departure Pack
              </button>
              <button
                onClick={() => setSelectedFilter("system")}
                className={cn(
                  "hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  selectedFilter === "system"
                    ? "bg-gray-600 text-white dark:bg-gray-500"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700",
                )}
              >
                <Info className="h-3 w-3" />
                System
              </button>
            </div>
          </DialogHeader>

          <ScrollArea
            className="h-[55vh] sm:h-[60vh] pr-2 sm:pr-4"
            onScrollCapture={handleScroll}
          >
            {isLoading && filteredNotifications.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {selectedFilter === "all"
                    ? "No notifications yet"
                    : `No ${selectedFilter.replace(/_/g, " ")} notifications`}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {selectedFilter === "all"
                    ? "You'll see payment updates here"
                    : "Try selecting a different filter"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredNotifications.map((notification) => {
                  const Icon = notificationIcons[notification.type] || Info;
                  const colors =
                    notificationColors[notification.type] ||
                    notificationColors.system;
                  const timeAgo = notification.createdAt?.toDate
                    ? formatDistanceToNow(notification.createdAt.toDate(), {
                        addSuffix: true,
                      })
                    : "Just now";

                  return (
                    <div
                      key={notification.id}
                      className={cn(
                        "flex items-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 group relative",
                        !notification.isRead &&
                          "bg-primary/5 border-primary/20",
                      )}
                    >
                      <div
                        onClick={() => {
                          if (!notification.isRead) {
                            markAsRead(notification.id);
                          }
                          handleNotificationSelect(notification);
                          setIsModalOpen(false);
                        }}
                        className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0"
                      >
                        {/* Icon */}
                        <div
                          className={cn(
                            "flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center",
                            colors.bg,
                          )}
                        >
                          <Icon
                            className={cn("h-4 w-4 sm:h-5 sm:w-5", colors.icon)}
                          />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pr-10">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={cn(
                                "text-xs sm:text-sm",
                                notification.isRead
                                  ? "text-muted-foreground font-medium"
                                  : "text-foreground font-bold",
                              )}
                            >
                              {notification.title}
                            </p>
                          </div>
                          <p
                            className={cn(
                              "text-xs sm:text-sm mt-1",
                              notification.isRead
                                ? "text-muted-foreground"
                                : "text-foreground font-semibold",
                            )}
                          >
                            {notification.body}
                          </p>
                          <div className="flex items-center justify-between mt-1.5 sm:mt-2">
                            <p className="text-[11px] sm:text-xs text-muted-foreground/70">
                              {timeAgo}
                            </p>
                            {!notification.isRead && (
                              <span className="flex-shrink-0 w-2 h-2 rounded-full bg-primary" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Delete Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 h-7 w-7 sm:h-8 sm:w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 z-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(notification.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
                      </Button>
                    </div>
                  );
                })}

                {/* Loading more indicator */}
                {isLoading && notifications.length > 0 && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}

                {/* End of list */}
                {!hasMore && notifications.length > 0 && (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">
                      You&apos;ve seen all notifications
                    </p>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Notification</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this notification? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCancelDelete}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete All Confirmation Dialog */}
      <Dialog
        open={deleteAllConfirmOpen}
        onOpenChange={setDeleteAllConfirmOpen}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete All Notifications</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete all {notifications.length}{" "}
              notification{notifications.length > 1 ? "s" : ""}? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCancelDeleteAll}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDeleteAll}>
              Delete All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
