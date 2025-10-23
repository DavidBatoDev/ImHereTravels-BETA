"use client";

import React, { useState, useEffect, memo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  FaUser,
  FaMapMarkerAlt,
  FaPlane,
  FaPhone,
  FaCalendarAlt,
  FaWallet,
  FaEuroSign,
  FaClock,
  FaFileInvoice,
  FaHashtag,
  FaTag,
  FaCode,
  FaEye,
  FaEyeSlash,
  FaCopy,
  FaEdit,
  FaTrash,
} from "react-icons/fa";
import { MdEmail } from "react-icons/md";
import {
  BsCalendarEvent,
  BsPersonCheck,
  BsGrid3X3Gap,
  BsListUl,
} from "react-icons/bs";
import { HiTrendingUp } from "react-icons/hi";
import type { Booking } from "@/types/bookings";
import { SheetColumn } from "@/types/sheet-management";
import { bookingSheetColumnService } from "@/services/booking-sheet-columns-service";
import { bookingService } from "@/services/booking-service";
import { useToast } from "@/hooks/use-toast";
import EditBookingModal from "./EditBookingModal";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { debounce } from "lodash";

interface BookingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onBookingUpdate?: (updatedBooking: Booking) => void;
}

export default function BookingDetailModal({
  isOpen,
  onClose,
  booking,
  onBookingUpdate,
}: BookingDetailModalProps) {
  const { toast } = useToast();
  const [columns, setColumns] = useState<SheetColumn[]>([]);
  const [isLoadingColumns, setIsLoadingColumns] = useState(true);
  const [showEmptyFields, setShowEmptyFields] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("");
  const [viewMode, setViewMode] = useState<"card" | "list">("list");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Real-time booking data state (similar to EditBookingModal)
  const [realtimeBooking, setRealtimeBooking] = useState<Booking | null>(null);

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const isScrollingProgrammatically = React.useRef(false);

  // Use real-time booking data if available, otherwise fall back to prop
  const currentBooking = realtimeBooking || booking;

  // Real-time Firebase listener for booking updates (like EditBookingModal)
  useEffect(() => {
    if (!booking?.id || !isOpen) {
      setRealtimeBooking(booking);
      return;
    }

    console.log(
      "🔍 [BOOKING DETAIL MODAL] Setting up real-time booking listener for:",
      booking.id
    );

    const unsubscribe = onSnapshot(
      doc(db, "bookings", booking.id),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const updatedBooking = {
            id: docSnapshot.id,
            ...docSnapshot.data(),
          } as Booking;

          console.log(
            "📄 [BOOKING DETAIL MODAL] Real-time booking update received"
          );

          setRealtimeBooking(updatedBooking);

          // Call the onBookingUpdate callback if provided
          if (onBookingUpdate) {
            onBookingUpdate(updatedBooking);
          }
        }
      },
      (error) => {
        console.error(
          "🚨 [BOOKING DETAIL MODAL] Real-time listener error:",
          error
        );
        // Fallback to the original booking data on error
        setRealtimeBooking(booking);
      }
    );

    return () => {
      console.log(
        "🧹 [BOOKING DETAIL MODAL] Cleaning up real-time booking listener"
      );
      unsubscribe();
    };
  }, [booking?.id, isOpen, booking, onBookingUpdate]);

  // Fetch booking sheet columns
  useEffect(() => {
    if (!isOpen) return;

    console.log("🔍 [BOOKING DETAIL MODAL] Fetching columns...");
    setIsLoadingColumns(true);

    const unsubscribe = bookingSheetColumnService.subscribeToColumns(
      (fetchedColumns) => {
        console.log(
          `✅ [BOOKING DETAIL MODAL] Received ${fetchedColumns.length} columns`
        );
        setColumns(fetchedColumns);
        setIsLoadingColumns(false);
      }
    );

    return () => {
      console.log("🧹 [BOOKING DETAIL MODAL] Cleaning up column subscription");
      unsubscribe();
    };
  }, [isOpen]);

  // Set first tab as active on load - must be unconditional and placed with other hooks
  useEffect(() => {
    if (!currentBooking || !isOpen) return;

    // Group columns by parentTab
    const groupedColumns = columns.reduce((groups, column) => {
      const parentTab = column.parentTab || "General";
      if (!groups[parentTab]) {
        groups[parentTab] = [];
      }
      groups[parentTab].push(column);
      return groups;
    }, {} as Record<string, SheetColumn[]>);

    // Sort parentTabs by the order they first appear in the columns
    const sortedParentTabs = Object.keys(groupedColumns).sort((a, b) => {
      const aFirstOrder = Math.min(
        ...groupedColumns[a].map((col) => col.order)
      );
      const bFirstOrder = Math.min(
        ...groupedColumns[b].map((col) => col.order)
      );
      return aFirstOrder - bFirstOrder;
    });

    if (sortedParentTabs.length > 0 && !activeTab) {
      setActiveTab(sortedParentTabs[0]);
    }
  }, [isOpen, columns, currentBooking, activeTab]);

  // Debounced scroll handler for better performance
  const debouncedScrollHandler = React.useCallback(
    debounce(() => {
      // Handle any scroll-related updates here if needed
    }, 16), // ~60fps
    []
  );

  // Track active section on scroll
  useEffect(() => {
    if (!isOpen || isLoadingColumns) return;

    const handleScroll = () => {
      // Skip if we're scrolling programmatically
      if (isScrollingProgrammatically.current) return;

      if (!scrollContainerRef.current) return;

      // Get all section elements
      const sections =
        scrollContainerRef.current.querySelectorAll('[id^="tab-"]');
      if (sections.length === 0) return;

      const container = scrollContainerRef.current;
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      const containerRect = container.getBoundingClientRect();
      const headerHeight = 120; // Account for sticky header

      // Check if we're at the very bottom
      const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 10;

      // Check if we're at the very top
      const isAtTop = scrollTop < 10;

      let mostVisibleSection = "";
      let maxVisibleArea = 0;

      sections.forEach((section, index) => {
        const rect = section.getBoundingClientRect();

        // If at the bottom, select the last section
        if (isAtBottom && index === sections.length - 1) {
          mostVisibleSection = section.id.replace("tab-", "");
          maxVisibleArea = 1000; // Force this to be selected
          return;
        }

        // If at the top, select the first section
        if (isAtTop && index === 0) {
          mostVisibleSection = section.id.replace("tab-", "");
          maxVisibleArea = 1000; // Force this to be selected
          return;
        }

        // Calculate visible area of the section relative to scroll container
        const visibleTop = Math.max(rect.top, containerRect.top + headerHeight);
        const visibleBottom = Math.min(rect.bottom, containerRect.bottom);
        const visibleHeight = Math.max(0, visibleBottom - visibleTop);

        if (visibleHeight > maxVisibleArea) {
          maxVisibleArea = visibleHeight;
          mostVisibleSection = section.id.replace("tab-", "");
        }
      });

      if (mostVisibleSection && mostVisibleSection !== activeTab) {
        setActiveTab(mostVisibleSection);
      }
    };

    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", handleScroll);
      // Also listen to wheel events for when at boundaries
      scrollContainer.addEventListener("wheel", handleScroll);

      // Initial check
      setTimeout(handleScroll, 100);

      return () => {
        scrollContainer.removeEventListener("scroll", handleScroll);
        scrollContainer.removeEventListener("wheel", handleScroll);
      };
    }
  }, [isOpen, isLoadingColumns, activeTab]);

  // Prevent rendering if modal is closed or no booking data
  if (!isOpen || !currentBooking) {
    console.log(
      "🚫 [BOOKING DETAIL MODAL] Preventing render - isOpen:",
      isOpen,
      "currentBooking:",
      !!currentBooking
    );
    return null;
  }

  // Safe date conversion for Firebase Timestamps
  const safeDate = (value: any): Date => {
    if (value instanceof Date) {
      return value;
    }

    if (
      value &&
      typeof value === "object" &&
      value.toDate &&
      typeof value.toDate === "function"
    ) {
      return value.toDate();
    }

    if (typeof value === "string" || typeof value === "number") {
      const date = new Date(value);
      return isNaN(date.getTime()) ? new Date() : date;
    }

    return new Date();
  };

  // Safe number conversion with fallback
  const safeNumber = (value: any, fallback: number = 0): number => {
    const num = Number(value);
    return isNaN(num) ? fallback : num;
  };

  // Get total cost for a booking with validation
  const getTotalCost = (booking: Booking | null) => {
    if (!booking) return 0;

    const originalCost = Number(booking.originalTourCost) || 0;
    const discountedCost = Number(booking.discountedTourCost) || 0;

    if (booking.useDiscountedTourCost && discountedCost > 0) {
      return discountedCost;
    }
    return originalCost;
  };

  // Calculate payment progress dynamically
  const calculatePaymentProgress = (booking: Booking | null) => {
    if (!booking) return 0;

    const totalCost = getTotalCost(booking);
    const paid = safeNumber(booking.paid, 0);

    if (totalCost === 0) return 0;

    const progress = Math.round((paid / totalCost) * 100);
    return Math.min(progress, 100);
  };

  // Helper function to determine booking status category
  const getBookingStatusCategory = (
    status: string | null | undefined
  ): string => {
    if (!status) return "Pending";

    const statusLower = status.toLowerCase();
    if (statusLower.includes("confirmed")) return "Confirmed";
    if (statusLower.includes("cancelled")) return "Cancelled";
    if (statusLower.includes("installment")) return "Pending";
    if (statusLower.includes("completed")) return "Completed";

    return "Pending";
  };

  // Get payment plan code
  const getPaymentPlanCode = (booking: Booking | null) => {
    if (!booking) return null;

    if (booking.paymentPlan) {
      return booking.paymentPlan.substring(0, 2).toUpperCase();
    }

    if (booking.availablePaymentTerms) {
      const terms = booking.availablePaymentTerms.trim();
      return terms.substring(0, 2).toUpperCase();
    }

    return null;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const getStatusBgColor = (booking: Booking | null) => {
    if (!booking) return "bg-gray-100";

    const category = getBookingStatusCategory(booking.bookingStatus);
    switch (category) {
      case "Confirmed":
        return "bg-spring-green/20";
      case "Pending":
        return "bg-sunglow-yellow/20";
      case "Cancelled":
        return "bg-crimson-red/20";
      case "Completed":
        return "bg-blue-500/20";
      default:
        return "bg-gray-200";
    }
  };

  const getBookingTypeBgColor = (type: string) => {
    switch (type) {
      case "Individual":
        return "bg-crimson-red/20";
      case "Group":
        return "bg-blue-500/20";
      default:
        return "bg-gray-200";
    }
  };

  const totalCost = getTotalCost(currentBooking);
  const paid = safeNumber(currentBooking?.paid, 0);
  const remaining = Math.max(0, totalCost - paid);
  const progress = calculatePaymentProgress(currentBooking);

  // Group columns by parentTab
  const groupedColumns = columns.reduce((groups, column) => {
    const parentTab = column.parentTab || "General";
    if (!groups[parentTab]) {
      groups[parentTab] = [];
    }
    groups[parentTab].push(column);
    return groups;
  }, {} as Record<string, SheetColumn[]>);

  // Sort parentTabs by the order they first appear in the columns
  const sortedParentTabs = Object.keys(groupedColumns).sort((a, b) => {
    const aFirstOrder = Math.min(...groupedColumns[a].map((col) => col.order));
    const bFirstOrder = Math.min(...groupedColumns[b].map((col) => col.order));
    return aFirstOrder - bFirstOrder;
  });

  // Sort columns within each group by order
  sortedParentTabs.forEach((parentTab) => {
    groupedColumns[parentTab].sort((a, b) => a.order - b.order);
  });

  // Scroll to a specific parent tab
  const scrollToTab = (parentTab: string) => {
    const element = document.getElementById(`tab-${parentTab}`);
    if (element) {
      // Set flag to prevent tracking during programmatic scroll
      isScrollingProgrammatically.current = true;
      setActiveTab(parentTab);

      element.scrollIntoView({ behavior: "smooth", block: "start" });

      // Re-enable tracking after scroll animation completes
      setTimeout(() => {
        isScrollingProgrammatically.current = false;
      }, 1000); // Smooth scroll typically takes ~500-800ms
    }
  };

  // Copy email to clipboard
  const copyEmailToClipboard = async () => {
    if (currentBooking?.emailAddress) {
      try {
        await navigator.clipboard.writeText(currentBooking.emailAddress);
        // You could add a toast notification here if desired
      } catch (err) {
        console.error("Failed to copy email:", err);
      }
    }
  };

  // Handle booking deletion
  const handleDeleteBooking = async () => {
    if (!currentBooking?.id) return;

    try {
      setIsDeleting(true);
      await bookingService.deleteBookingWithRowShift(currentBooking.id);

      toast({
        title: "🗑️ Booking Deleted",
        description: "Booking deleted and subsequent rows shifted down",
        variant: "default",
      });

      // Close the modal after successful deletion
      onClose();
    } catch (error) {
      console.error("Failed to delete booking:", error);
      toast({
        title: "❌ Delete Failed",
        description: `Failed to delete booking: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  // Get icon for parent tab
  const getParentTabIcon = (parentTab: string) => {
    if (parentTab.includes("Identifier") || parentTab.includes("🆔"))
      return FaHashtag;
    if (parentTab.includes("Traveler") || parentTab.includes("👤"))
      return FaUser;
    if (parentTab.includes("Tour") || parentTab.includes("🗺️"))
      return FaMapMarkerAlt;
    if (parentTab.includes("Group") || parentTab.includes("👥")) return FaUser;
    if (parentTab.includes("Email") || parentTab.includes("📧")) return MdEmail;
    if (parentTab.includes("Payment") || parentTab.includes("💰"))
      return FaWallet;
    if (parentTab.includes("Cancellation") || parentTab.includes("❌"))
      return FaTag;
    return HiTrendingUp;
  };

  // Get value for a column from booking data
  const getColumnValue = (column: SheetColumn) => {
    if (!currentBooking) return null;

    const value = (currentBooking as any)[column.id];
    if (value === null || value === undefined) return null;

    if (column.dataType === "date") {
      return safeDate(value).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }

    if (column.dataType === "currency") {
      return formatCurrency(safeNumber(value, 0));
    }

    if (column.dataType === "boolean") {
      return value ? "Yes" : "No";
    }

    const stringValue = String(value).trim();
    return stringValue === "" ? null : stringValue;
  };

  // Memoized column value component for better performance
  const MemoizedColumnValue = memo(({ column }: { column: SheetColumn }) => {
    const value = getColumnValue(column);
    return <span>{value || "N/A"}</span>;
  });

  // Check if column should be displayed (skip certain columns)
  const shouldDisplayColumn = (column: SheetColumn) => {
    // Skip columns that are not meant to be displayed in detail view
    if (column.columnName.toLowerCase().includes("delete")) return false;
    if (column.columnName.toLowerCase().includes("action")) return false;

    // If showEmptyFields is true, show all columns
    if (showEmptyFields) return true;

    // Skip if value is empty/null/undefined
    const value = getColumnValue(column);
    if (value === null || value === undefined) return false;

    return true;
  };

  // Check if a column is empty (for graying out)
  const isColumnEmpty = (column: SheetColumn) => {
    const value = getColumnValue(column);
    return value === null || value === undefined;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] bg-[#F2F0EE] p-0 rounded-full overflow-hidden">
        <DialogHeader className="sticky top-0 z-50 bg-white shadow-md border-b border-border/50 pb-3 pt-6 px-6">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-crimson-red to-crimson-red/80 rounded-full rounded-br-none shadow-sm">
                <FaUser className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="block text-base">Booking Details</span>
                <span className="text-2xl font-mono font-semibold text-crimson-red block">
                  {currentBooking?.bookingId}
                </span>
              </div>
            </DialogTitle>
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex border border-border rounded-md bg-background shadow-sm">
                <Button
                  variant={viewMode === "card" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("card")}
                  className={`rounded-r-none border-r border-border transition-colors ${
                    viewMode === "card"
                      ? "bg-crimson-red hover:bg-crimson-red/90 text-white shadow shadow-crimson-red/25"
                      : "hover:bg-crimson-red/10"
                  }`}
                  title="Card view"
                >
                  <BsGrid3X3Gap className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className={`rounded-l-none transition-colors ${
                    viewMode === "list"
                      ? "bg-crimson-red hover:bg-crimson-red/90 text-white shadow shadow-crimson-red/25"
                      : "hover:bg-crimson-red/10"
                  }`}
                  title="List view"
                >
                  <BsListUl className="h-4 w-4" />
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEmptyFields(!showEmptyFields)}
                className="h-8 px-3 hover:bg-muted flex items-center gap-2"
                title={
                  showEmptyFields ? "Hide empty fields" : "Show empty fields"
                }
              >
                {showEmptyFields ? (
                  <>
                    <FaEyeSlash className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Hide empty fields
                    </span>
                  </>
                ) : (
                  <>
                    <FaEye className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Show empty fields
                    </span>
                  </>
                )}
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={() => setIsEditModalOpen(true)}
                className="h-8 px-4 bg-crimson-red hover:bg-crimson-red/90 text-white shadow shadow-crimson-red/25 flex items-center gap-2"
                title="Edit booking"
              >
                <FaEdit className="h-4 w-4" />
                <span className="text-xs font-medium">Edit</span>
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="h-8 px-4 bg-red-600 hover:bg-red-700 text-white shadow shadow-red-600/25 flex items-center gap-2"
                title="Delete booking"
              >
                <FaTrash className="h-4 w-4" />
                <span className="text-xs font-medium">Delete</span>
              </Button>
            </div>
          </div>
          <div className="mt-2 ml-[56px] space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">
                {currentBooking?.emailAddress}
              </p>
              <button
                onClick={copyEmailToClipboard}
                className="p-1 hover:bg-muted rounded transition-colors"
                title="Copy email"
              >
                <FaCopy className="h-3 w-3 text-muted-foreground hover:text-crimson-red" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Row #:{" "}
              <span className="font-mono font-semibold text-crimson-red">
                {currentBooking?.id}
              </span>
            </p>
          </div>
        </DialogHeader>

        <div className="flex overflow-hidden max-h-[calc(90vh-120px)]">
          {/* Main Content */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto h-[95%] pl-6 pb-6 scrollbar-hide scroll-optimized"
          >
            <div className="space-y-3 pt-4">
              {/* Summary Section */}
              <div
                id="tab-Summary"
                className="scroll-mt-4 pb-4 mb-4 border-b-2 border-border/30"
              >
                <h2 className="text-lg font-bold text-foreground flex items-center gap-3 mb-4">
                  <div className="p-2 bg-crimson-red/20 rounded-full rounded-br-none shadow-sm">
                    <HiTrendingUp className="h-5 w-5 text-crimson-red" />
                  </div>
                  <span>Booking Summary</span>
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Full Name */}
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1 uppercase">
                      Traveler
                    </p>
                    <p className="text-base font-bold text-foreground">
                      {currentBooking?.fullName}
                    </p>
                  </div>

                  {/* Booking Type */}
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1 uppercase">
                      Type
                    </p>
                    <Badge
                      variant="outline"
                      className={`text-sm font-medium border-0 text-foreground px-2.5 py-1 rounded-full rounded-br-none ${getBookingTypeBgColor(
                        currentBooking?.bookingType
                      )}`}
                    >
                      {currentBooking?.bookingType}
                    </Badge>
                  </div>

                  {/* Tour Package */}
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1 uppercase">
                      Tour Package
                    </p>
                    <p className="text-base font-bold text-foreground">
                      {currentBooking?.tourPackageName}
                    </p>
                  </div>

                  {/* Booking Status */}
                  {currentBooking?.bookingStatus && (
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-1 uppercase">
                        Status
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-sm font-medium border-0 text-foreground px-2.5 py-1 rounded-full rounded-br-none ${getStatusBgColor(
                          currentBooking
                        )}`}
                      >
                        {getBookingStatusCategory(
                          currentBooking?.bookingStatus
                        )}
                      </Badge>
                    </div>
                  )}

                  {/* Dates */}
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1 uppercase">
                      Dates
                    </p>
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <BsCalendarEvent className="h-3.5 w-3.5 text-crimson-red" />
                        <span className="font-bold">
                          {safeDate(
                            currentBooking?.reservationDate
                          ).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FaPlane className="h-3.5 w-3.5 text-crimson-red" />
                        <span className="font-bold">
                          {safeDate(
                            currentBooking?.tourDate
                          ).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Plan */}
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1 uppercase">
                      Payment Plan
                    </p>
                    <p className="text-base font-bold text-foreground">
                      {currentBooking?.paymentPlan ||
                        currentBooking?.availablePaymentTerms ||
                        "N/A"}
                    </p>
                  </div>

                  {/* Payment Progress */}
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground font-medium mb-2 uppercase">
                      Payment Progress
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-spring-green font-bold">
                          Paid: {formatCurrency(paid)}
                        </span>
                        <span
                          className={`font-bold ${
                            progress === 100
                              ? "text-spring-green"
                              : "text-crimson-red"
                          }`}
                        >
                          {progress}%
                        </span>
                      </div>
                      <Progress
                        value={progress}
                        className={`h-2.5 ${
                          progress === 100
                            ? "[&>div]:bg-gradient-to-r [&>div]:from-spring-green [&>div]:to-spring-green/80"
                            : "[&>div]:bg-gradient-to-r [&>div]:from-crimson-red [&>div]:to-crimson-red/80"
                        }`}
                      />
                      {remaining > 0 && (
                        <p className="text-sm text-crimson-red font-bold">
                          Due: {formatCurrency(remaining)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Columns by Parent Tab */}
              {isLoadingColumns ? (
                <Card className="bg-white shadow-sm">
                  <CardContent className="p-6 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-crimson-red mx-auto mb-2"></div>
                    <p className="text-xs text-muted-foreground">Loading...</p>
                  </CardContent>
                </Card>
              ) : (
                sortedParentTabs.map((parentTab) => {
                  const IconComponent = getParentTabIcon(parentTab);
                  const filteredColumns =
                    groupedColumns[parentTab].filter(shouldDisplayColumn);

                  if (filteredColumns.length === 0) return null;

                  return (
                    <Card
                      key={parentTab}
                      id={`tab-${parentTab}`}
                      className="bg-white shadow-sm border border-border/50 scroll-mt-4"
                    >
                      <CardHeader className="pb-2 bg-crimson-red/10 border-b border-crimson-red/20 py-2">
                        <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                          <div className="p-1 bg-crimson-red/10 rounded-full rounded-br-none">
                            <IconComponent className="h-4 w-4 text-crimson-red" />
                          </div>
                          {parentTab}
                        </CardTitle>
                      </CardHeader>
                      <CardContent
                        className={viewMode === "card" ? "pt-3 pb-3" : "p-0"}
                      >
                        {viewMode === "card" ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                            {filteredColumns.map((column) => {
                              const isEmpty = isColumnEmpty(column);
                              return (
                                <div
                                  key={column.id}
                                  className={`flex items-start gap-2 p-2 rounded-lg border transition-all hover:shadow-sm ${
                                    isEmpty
                                      ? "bg-muted/10 border-purple-200/50 opacity-50"
                                      : column.dataType === "function"
                                      ? "bg-purple-50 border-purple-200 hover:border-purple-300"
                                      : "bg-muted/20 border-purple-300 hover:border-purple-400"
                                  }`}
                                >
                                  <div className="flex-shrink-0 mt-0.5">
                                    <div
                                      className={`p-1 rounded-full rounded-br-none ${
                                        column.dataType === "function"
                                          ? "bg-purple-500/10"
                                          : "bg-crimson-red/10"
                                      }`}
                                    >
                                      {column.dataType === "function" && (
                                        <FaCode className="h-3 w-3 text-purple-600" />
                                      )}
                                      {column.dataType === "date" && (
                                        <FaCalendarAlt className="h-3 w-3 text-crimson-red" />
                                      )}
                                      {column.dataType === "currency" && (
                                        <FaEuroSign className="h-3 w-3 text-crimson-red" />
                                      )}
                                      {column.dataType === "boolean" && (
                                        <BsPersonCheck className="h-3 w-3 text-crimson-red" />
                                      )}
                                      {column.dataType === "string" &&
                                        column.columnName
                                          .toLowerCase()
                                          .includes("email") && (
                                          <MdEmail className="h-3 w-3 text-crimson-red" />
                                        )}
                                      {column.dataType === "string" &&
                                        column.columnName
                                          .toLowerCase()
                                          .includes("name") && (
                                          <FaUser className="h-3 w-3 text-crimson-red" />
                                        )}
                                      {![
                                        "date",
                                        "currency",
                                        "boolean",
                                        "function",
                                      ].includes(column.dataType) &&
                                        !column.columnName
                                          .toLowerCase()
                                          .includes("email") &&
                                        !column.columnName
                                          .toLowerCase()
                                          .includes("name") && (
                                          <FaTag className="h-3 w-3 text-crimson-red" />
                                        )}
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[10px] text-muted-foreground font-medium mb-0.5 uppercase tracking-wide">
                                      {column.columnName}
                                    </p>
                                    <p className="text-xs font-semibold text-foreground break-words">
                                      <MemoizedColumnValue column={column} />
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="divide-y divide-border/50">
                            {filteredColumns.map((column) => {
                              const isEmpty = isColumnEmpty(column);
                              return (
                                <div
                                  key={column.id}
                                  className={`flex items-center justify-between px-4 py-2 hover:bg-muted/20 transition-colors ${
                                    isEmpty ? "opacity-50" : ""
                                  } ${
                                    column.dataType === "function"
                                      ? "bg-purple-50/50"
                                      : ""
                                  }`}
                                >
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="flex-shrink-0">
                                      <div
                                        className={`p-1 rounded-full rounded-br-none ${
                                          column.dataType === "function"
                                            ? "bg-purple-500/10"
                                            : "bg-crimson-red/10"
                                        }`}
                                      >
                                        {column.dataType === "function" && (
                                          <FaCode className="h-3 w-3 text-purple-600" />
                                        )}
                                        {column.dataType === "date" && (
                                          <FaCalendarAlt className="h-3 w-3 text-crimson-red" />
                                        )}
                                        {column.dataType === "currency" && (
                                          <FaEuroSign className="h-3 w-3 text-crimson-red" />
                                        )}
                                        {column.dataType === "boolean" && (
                                          <BsPersonCheck className="h-3 w-3 text-crimson-red" />
                                        )}
                                        {column.dataType === "string" &&
                                          column.columnName
                                            .toLowerCase()
                                            .includes("email") && (
                                            <MdEmail className="h-3 w-3 text-crimson-red" />
                                          )}
                                        {column.dataType === "string" &&
                                          column.columnName
                                            .toLowerCase()
                                            .includes("name") && (
                                            <FaUser className="h-3 w-3 text-crimson-red" />
                                          )}
                                        {![
                                          "date",
                                          "currency",
                                          "boolean",
                                          "function",
                                        ].includes(column.dataType) &&
                                          !column.columnName
                                            .toLowerCase()
                                            .includes("email") &&
                                          !column.columnName
                                            .toLowerCase()
                                            .includes("name") && (
                                            <FaTag className="h-3 w-3 text-crimson-red" />
                                          )}
                                      </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                                      {column.columnName}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-semibold text-foreground">
                                      <MemoizedColumnValue column={column} />
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>

          {/* Navigation Sidebar */}
          {!isLoadingColumns && sortedParentTabs.length > 0 && (
            <div className="w-48 border-l border-border/50 p-4 overflow-y-auto scrollbar-hide">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Sections
              </h3>
              <nav className="space-y-1">
                {/* Summary Navigation Button */}
                <button
                  onClick={() => scrollToTab("Summary")}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all ${
                    activeTab === "Summary"
                      ? "bg-crimson-red text-white shadow-sm"
                      : "text-foreground hover:bg-muted/50"
                  }`}
                >
                  <HiTrendingUp
                    className={`h-3 w-3 flex-shrink-0 ${
                      activeTab === "Summary"
                        ? "text-white"
                        : "text-crimson-red"
                    }`}
                  />
                  <span className="text-xs font-medium truncate">Summary</span>
                </button>
                {sortedParentTabs.map((parentTab) => {
                  const IconComponent = getParentTabIcon(parentTab);
                  const filteredColumns =
                    groupedColumns[parentTab].filter(shouldDisplayColumn);

                  if (filteredColumns.length === 0 && !showEmptyFields)
                    return null;

                  return (
                    <button
                      key={parentTab}
                      onClick={() => scrollToTab(parentTab)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all ${
                        activeTab === parentTab
                          ? "bg-crimson-red text-white shadow-sm"
                          : "text-foreground hover:bg-muted/50"
                      }`}
                    >
                      <IconComponent
                        className={`h-3 w-3 flex-shrink-0 ${
                          activeTab === parentTab
                            ? "text-white"
                            : "text-crimson-red"
                        }`}
                      />
                      <span className="text-xs font-medium truncate">
                        {parentTab}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Edit Booking Modal */}
      <EditBookingModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        booking={currentBooking}
        onSave={(updatedBooking) => {
          // Call the parent callback to refresh the booking data
          if (onBookingUpdate) {
            onBookingUpdate(updatedBooking);
          }
          setIsEditModalOpen(false);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this booking? This action cannot
              be undone.
              <br />
              <br />
              <strong>Booking Details:</strong>
              <br />• Row: {currentBooking?.row || "N/A"}
              <br />• Name: {currentBooking?.fullName || "N/A"}
              <br />• Email: {currentBooking?.emailAddress || "N/A"}
              <br />
              <br />
              <span className="text-red-600 font-semibold">
                This will also shift all subsequent rows down by one position.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBooking}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? "Deleting..." : "Delete Booking"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
