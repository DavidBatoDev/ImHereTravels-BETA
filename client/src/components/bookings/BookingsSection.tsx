"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Search, Filter, X, User, Grid3X3, List } from "lucide-react";
import {
  FaUser,
  FaMapMarkerAlt,
  FaPlus,
  FaPlane,
  FaPhone,
  FaHashtag,
  FaCalendarAlt,
  FaEuroSign,
} from "react-icons/fa";
import { MdEmail, MdTextFields } from "react-icons/md";
import { BsCalendar3, BsCalendarEvent, BsPersonCheck } from "react-icons/bs";
import { IoWallet } from "react-icons/io5";
import { HiTrendingUp } from "react-icons/hi";
import type { Booking } from "@/types/bookings";
import { SheetColumn } from "@/types/sheet-management";
import { bookingSheetColumnService } from "@/services/booking-sheet-columns-service";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query } from "firebase/firestore";
import { Timestamp } from "firebase/firestore";
import BookingDetailModal from "./BookingDetailModal";

// Mock data for demonstration - replace with real data
const mockBookings: Booking[] = [
  {
    id: "1",
    bookingId: "BK-2024-001",
    bookingCode: "BK001",
    tourCode: "EC-001",
    reservationDate: new Date("2024-01-15"),
    bookingType: "Individual",
    bookingStatus: "Confirmed",
    daysBetweenBookingAndTour: 45,
    isMainBooker: true,
    travellerInitials: "JD",
    firstName: "John",
    lastName: "Doe",
    fullName: "John Doe",
    emailAddress: "john.doe@example.com",
    tourPackageNameUniqueCounter: 1,
    tourPackageName: "Ecuador Adventure Tour",
    formattedDate: "Mar 1, 2024",
    tourDate: new Date("2024-03-01"),
    tourDuration: 7,
    useDiscountedTourCost: false,
    originalTourCost: 2500,
    includeBccReservation: false,
    generateEmailDraft: false,
    sendEmail: false,
    eligible2ndOfMonths: false,
    availablePaymentTerms: "FU - Full Payment",
    enablePaymentReminder: true,
    paymentProgress: 100,
    paid: 2500,
    remainingBalance: 0,
    includeBccCancellation: false,
    generateCancellationEmailDraft: false,
    sendCancellationEmail: false,
  },
  {
    id: "2",
    bookingId: "BK-2024-002",
    bookingCode: "BK002",
    tourCode: "PE-002",
    reservationDate: new Date("2024-01-20"),
    bookingType: "Group",
    bookingStatus: "Pending",
    daysBetweenBookingAndTour: 60,
    groupId: "GRP-001",
    isMainBooker: true,
    travellerInitials: "SW",
    firstName: "Sarah",
    lastName: "Wilson",
    fullName: "Sarah Wilson",
    emailAddress: "sarah.wilson@example.com",
    tourPackageNameUniqueCounter: 1,
    tourPackageName: "Peru Cultural Experience",
    formattedDate: "Mar 20, 2024",
    tourDate: new Date("2024-03-20"),
    tourDuration: 10,
    useDiscountedTourCost: true,
    originalTourCost: 3200,
    discountedTourCost: 2800,
    includeBccReservation: false,
    generateEmailDraft: false,
    sendEmail: false,
    paymentCondition: "Partial Payment",
    eligible2ndOfMonths: true,
    availablePaymentTerms: "P2 - 2 Months",
    enablePaymentReminder: true,
    paymentProgress: 50,
    paid: 1400,
    remainingBalance: 1400,
    includeBccCancellation: false,
    generateCancellationEmailDraft: false,
    sendCancellationEmail: false,
  },
  {
    id: "3",
    bookingId: "BK-2024-003",
    bookingCode: "BK003",
    tourCode: "CL-003",
    reservationDate: new Date("2024-01-25"),
    bookingType: "Individual",
    bookingStatus: "Confirmed",
    daysBetweenBookingAndTour: 90,
    isMainBooker: true,
    travellerInitials: "MJ",
    firstName: "Michael",
    lastName: "Johnson",
    fullName: "Michael Johnson",
    emailAddress: "michael.johnson@company.com",
    tourPackageNameUniqueCounter: 1,
    tourPackageName: "Chile Patagonia Trek",
    formattedDate: "Apr 25, 2024",
    tourDate: new Date("2024-04-25"),
    tourDuration: 14,
    useDiscountedTourCost: false,
    originalTourCost: 4500,
    includeBccReservation: false,
    generateEmailDraft: false,
    sendEmail: false,
    paymentCondition: "Installment",
    eligible2ndOfMonths: false,
    availablePaymentTerms: "P4 - 4 Months",
    enablePaymentReminder: true,
    paymentProgress: 25,
    paid: 1125,
    remainingBalance: 3375,
    includeBccCancellation: false,
    generateCancellationEmailDraft: false,
    sendCancellationEmail: false,
  },
  {
    id: "4",
    bookingId: "BK-2024-004",
    bookingCode: "BK004",
    tourCode: "AR-004",
    reservationDate: new Date("2024-02-01"),
    bookingType: "Individual",
    bookingStatus: "Pending",
    daysBetweenBookingAndTour: 30,
    isMainBooker: true,
    travellerInitials: "AB",
    firstName: "Anna",
    lastName: "Brown",
    fullName: "Anna Brown",
    emailAddress: "anna.brown@example.com",
    tourPackageNameUniqueCounter: 1,
    tourPackageName: "Argentina Wine Tour",
    formattedDate: "Mar 1, 2024",
    tourDate: new Date("2024-03-01"),
    tourDuration: 5,
    useDiscountedTourCost: false,
    originalTourCost: 1100,
    includeBccReservation: false,
    generateEmailDraft: false,
    sendEmail: false,
    eligible2ndOfMonths: false,
    availablePaymentTerms: "P1 - 1 Month",
    enablePaymentReminder: true,
    paymentProgress: 14, // 150/1100 = 13.6% rounded to 14%
    paid: 150,
    remainingBalance: 950,
    includeBccCancellation: false,
    generateCancellationEmailDraft: false,
    sendCancellationEmail: false,
  },
];

export default function BookingsSection() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [columns, setColumns] = useState<SheetColumn[]>([]);

  // Advanced filtering state
  const [columnFilters, setColumnFilters] = useState<Record<string, any>>({});
  const [dateRangeFilters, setDateRangeFilters] = useState<
    Record<string, { from?: Date; to?: Date }>
  >({});
  const [currencyRangeFilters, setCurrencyRangeFilters] = useState<
    Record<string, { min?: number; max?: number }>
  >({});

  // Temporary filter states (for modal preview before applying)
  const [tempColumnFilters, setTempColumnFilters] = useState<
    Record<string, any>
  >({});
  const [tempDateRangeFilters, setTempDateRangeFilters] = useState<
    Record<string, { from?: Date; to?: Date }>
  >({});
  const [tempCurrencyRangeFilters, setTempCurrencyRangeFilters] = useState<
    Record<string, { min?: number; max?: number }>
  >({});

  // Card layout configuration - which column to show in each card section
  const [cardFieldMappings, setCardFieldMappings] = useState({
    field1: "fullName", // Traveler section
    field2: "tourPackageName", // Tour Package section
    field3_left: "reservationDate", // Left date
    field3_right: "tourDate", // Right date
    field4: "paid", // Payment section
  });

  // Temporary mappings for preview (before applying)
  const [tempCardFieldMappings, setTempCardFieldMappings] = useState({
    field1: "fullName",
    field2: "tourPackageName",
    field3_left: "reservationDate",
    field3_right: "tourDate",
    field4: "paid",
  });

  const [fieldSelectorOpen, setFieldSelectorOpen] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isFilterSticky, setIsFilterSticky] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Fetch booking sheet columns
  useEffect(() => {
    const unsubscribe = bookingSheetColumnService.subscribeToColumns(
      (fetchedColumns) => {
        setColumns(fetchedColumns);
      }
    );
    return () => unsubscribe();
  }, []);

  // Subscribe to real-time bookings data
  useEffect(() => {
    console.log(
      "🔍 [BOOKINGS SECTION] Setting up real-time booking subscription..."
    );

    const unsubscribe = onSnapshot(
      query(collection(db, "bookings")),
      (querySnapshot) => {
        const fetchedBookings = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Booking[];

        // Sort bookings numerically by ID
        const sortedBookings = fetchedBookings.sort((a, b) => {
          const aId = parseInt(a.id);
          const bId = parseInt(b.id);
          if (isNaN(aId) && isNaN(bId)) return 0;
          if (isNaN(aId)) return 1;
          if (isNaN(bId)) return -1;
          return aId - bId;
        });

        console.log(
          `✅ [BOOKINGS SECTION] Received ${sortedBookings.length} bookings from Firestore`
        );

        // Debug: Log first booking's payment and date data
        if (sortedBookings.length > 0) {
          const firstBooking = sortedBookings[0];
          console.log("🔍 [DEBUG] First booking payment data:", {
            id: firstBooking.id,
            paid: firstBooking.paid,
            paidType: typeof firstBooking.paid,
            originalTourCost: firstBooking.originalTourCost,
            originalTourCostType: typeof firstBooking.originalTourCost,
            discountedTourCost: firstBooking.discountedTourCost,
            discountedTourCostType: typeof firstBooking.discountedTourCost,
            useDiscountedTourCost: firstBooking.useDiscountedTourCost,
          });

          console.log("🔍 [DEBUG] First booking date data:", {
            id: firstBooking.id,
            reservationDate: firstBooking.reservationDate,
            reservationDateType: typeof firstBooking.reservationDate,
            reservationDateIsTimestamp:
              firstBooking.reservationDate &&
              typeof firstBooking.reservationDate === "object" &&
              (firstBooking.reservationDate as any).toDate,
            tourDate: firstBooking.tourDate,
            tourDateType: typeof firstBooking.tourDate,
            tourDateIsTimestamp:
              firstBooking.tourDate &&
              typeof firstBooking.tourDate === "object" &&
              (firstBooking.tourDate as any).toDate,
          });
        }

        // Use real data if available, otherwise fall back to mock data
        if (sortedBookings.length > 0) {
          setBookings(sortedBookings);
        } else {
          console.log(
            "📝 [BOOKINGS SECTION] No real data found, using mock data"
          );
          setBookings(mockBookings);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error("❌ Error listening to bookings:", error);
        console.log(
          "📝 [BOOKINGS SECTION] Error occurred, falling back to mock data"
        );
        setBookings(mockBookings);
        setIsLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => {
      console.log("🧹 [BOOKINGS SECTION] Cleaning up booking subscription");
      unsubscribe();
    };
  }, []);

  // Track scroll position to detect when filter becomes sticky
  useEffect(() => {
    const handleScroll = () => {
      const filterSection = document.querySelector("[data-filter-section]");
      if (filterSection) {
        const rect = filterSection.getBoundingClientRect();
        setIsFilterSticky(rect.top <= 16); // 16px is the top-4 offset
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Get total cost for a booking with validation
  const getTotalCost = (booking: Booking) => {
    const originalCost = Number(booking.originalTourCost) || 0;
    const discountedCost = Number(booking.discountedTourCost) || 0;

    if (booking.useDiscountedTourCost && discountedCost > 0) {
      return discountedCost;
    }
    return originalCost;
  };

  // Safe number conversion with fallback
  const safeNumber = (value: any, fallback: number = 0): number => {
    const num = Number(value);
    return isNaN(num) ? fallback : num;
  };

  // Safe date conversion for Firebase Timestamps
  const safeDate = (value: any): Date => {
    // If it's already a Date object, return it
    if (value instanceof Date) {
      return value;
    }

    // If it's a Firebase Timestamp, convert to Date
    if (
      value &&
      typeof value === "object" &&
      value.toDate &&
      typeof value.toDate === "function"
    ) {
      return value.toDate();
    }

    // If it's a string or number, try to create a Date
    if (typeof value === "string" || typeof value === "number") {
      const date = new Date(value);
      return isNaN(date.getTime()) ? new Date() : date;
    }

    // Fallback to current date
    return new Date();
  };

  // Helper function to determine booking status category
  const getBookingStatusCategory = (
    status: string | null | undefined
  ): string => {
    if (!status) return "Pending";

    const statusLower = status.toLowerCase();
    if (statusLower.includes("confirmed")) return "Confirmed";
    if (statusLower.includes("cancelled")) return "Cancelled";
    if (statusLower.includes("installment")) return "Pending"; // Installments are pending payments
    if (statusLower.includes("completed")) return "Completed";

    return "Pending"; // Default fallback
  };

  // Calculate statistics with validation
  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter(
    (b) => getBookingStatusCategory(b.bookingStatus) === "Confirmed"
  ).length;
  const pendingBookings = bookings.filter(
    (b) => getBookingStatusCategory(b.bookingStatus) === "Pending"
  ).length;
  const cancelledBookings = bookings.filter(
    (b) => getBookingStatusCategory(b.bookingStatus) === "Cancelled"
  ).length;
  const completedBookings = bookings.filter(
    (b) => getBookingStatusCategory(b.bookingStatus) === "Completed"
  ).length;

  // Debug: Log statistics calculation
  console.log("🔍 [DEBUG] Booking statistics:", {
    totalBookings,
    confirmedBookings,
    pendingBookings,
    cancelledBookings,
    completedBookings,
    bookingStatuses: bookings.map((b) => ({
      id: b.id,
      status: b.bookingStatus,
    })),
  });

  const totalRevenue = bookings.reduce((sum, booking) => {
    const paid = safeNumber(booking.paid, 0);
    return sum + paid;
  }, 0);

  const pendingPayments = bookings.reduce((sum, booking) => {
    const totalCost = getTotalCost(booking);
    const paid = safeNumber(booking.paid, 0);
    const remaining = Math.max(0, totalCost - paid);
    return sum + remaining;
  }, 0);

  const getStatusBgColor = (booking: Booking) => {
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

  const getPaymentPlanCode = (booking: Booking) => {
    // If paymentPlan exists, use it
    if (booking.paymentPlan) {
      return booking.paymentPlan.substring(0, 2).toUpperCase();
    }

    // Otherwise, extract from availablePaymentTerms
    if (booking.availablePaymentTerms) {
      const terms = booking.availablePaymentTerms.trim();
      // Get first 2 characters
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

  // Calculate payment progress dynamically
  const calculatePaymentProgress = (booking: Booking) => {
    const totalCost = getTotalCost(booking);
    const paid = safeNumber(booking.paid, 0);

    if (totalCost === 0) return 0;

    const progress = Math.round((paid / totalCost) * 100);
    return Math.min(progress, 100); // Cap at 100%
  };

  // Get active filters count
  const getActiveFiltersCount = () => {
    let count = 0;
    count += Object.keys(columnFilters).length;
    count += Object.keys(dateRangeFilters).length;
    count += Object.keys(currencyRangeFilters).length;
    return count;
  };

  // Clear specific column filter
  const clearColumnFilter = (columnId: string) => {
    setColumnFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[columnId];
      return newFilters;
    });
    setDateRangeFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[columnId];
      return newFilters;
    });
    setCurrencyRangeFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[columnId];
      return newFilters;
    });
  };

  // Clear specific column filter (temp state for modal)
  const clearTempColumnFilter = (columnId: string) => {
    setTempColumnFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[columnId];
      return newFilters;
    });
    setTempDateRangeFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[columnId];
      return newFilters;
    });
    setTempCurrencyRangeFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[columnId];
      return newFilters;
    });
  };

  // Clear all filters
  const clearAllFilters = () => {
    setColumnFilters({});
    setDateRangeFilters({});
    setCurrencyRangeFilters({});
  };

  // Clear all temp filters (for modal)
  const clearAllTempFilters = () => {
    setTempColumnFilters({});
    setTempDateRangeFilters({});
    setTempCurrencyRangeFilters({});
  };

  // Get active temp filters count (for modal display)
  const getTempActiveFiltersCount = () => {
    let count = 0;
    count += Object.keys(tempColumnFilters).length;
    count += Object.keys(tempDateRangeFilters).length;
    count += Object.keys(tempCurrencyRangeFilters).length;
    return count;
  };

  // Handle booking card click
  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsDetailModalOpen(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsDetailModalOpen(false);
    setSelectedBooking(null);
  };

  // Get column label from column ID
  const getColumnLabel = (columnId: string) => {
    const column = columns.find((col) => col.id === columnId);
    return column?.columnName || columnId;
  };

  // Get sample preview value for a column
  const getSamplePreviewValue = (columnId: string) => {
    const column = columns.find((col) => col.id === columnId);
    if (!column) return "Sample Data";

    // Return appropriate sample based on data type
    if (column.dataType === "date") return "Jan 15";
    if (column.dataType === "currency") return "€1,250";
    if (column.dataType === "boolean") return "Yes";
    if (columnId === "bookingId") return "BOOK-001";
    if (columnId === "emailAddress") return "traveler@example.com";
    if (columnId === "fullName") return "John Doe";
    if (columnId === "tourPackageName") return "Europe Adventure";
    if (columnId.toLowerCase().includes("phone")) return "+1 234 567 8900";
    if (columnId.toLowerCase().includes("code")) return "ABC123";

    return `<${column.columnName}>`;
  };

  // Get icon component for a column
  const getFieldIcon = (columnId: string) => {
    const column = columns.find((col) => col.id === columnId);
    if (!column) return MdTextFields;

    // Return appropriate icon based on column type and name
    if (column.dataType === "date") return FaCalendarAlt;
    if (column.dataType === "currency") return FaEuroSign;
    if (column.dataType === "boolean") return BsPersonCheck;

    // Specific field icons
    if (
      columnId === "tourPackageName" ||
      columnId.toLowerCase().includes("tour")
    )
      return FaMapMarkerAlt;
    if (columnId === "fullName" || columnId.toLowerCase().includes("name"))
      return FaUser;
    if (columnId === "emailAddress" || columnId.toLowerCase().includes("email"))
      return MdEmail;
    if (columnId.toLowerCase().includes("phone")) return FaPhone;
    if (
      columnId.toLowerCase().includes("id") ||
      columnId.toLowerCase().includes("code")
    )
      return FaHashtag;
    if (columnId === "reservationDate") return BsCalendarEvent;
    if (columnId === "tourDate") return FaPlane;

    // Default icon for unknown fields
    return MdTextFields;
  };

  // Handle field selection (updates preview only)
  const handleFieldSelect = (fieldKey: string, columnId: string) => {
    setTempCardFieldMappings((prev) => ({
      ...prev,
      [fieldKey]: columnId,
    }));
    setFieldSelectorOpen(null);
  };

  // Apply card field changes
  const handleApplyCardChanges = () => {
    setCardFieldMappings(tempCardFieldMappings);
    setShowFilters(false);
  };

  // Apply all changes (both filters and card mappings)
  const handleApplyAllChanges = () => {
    // Apply filter changes
    setColumnFilters(tempColumnFilters);
    setDateRangeFilters(tempDateRangeFilters);
    setCurrencyRangeFilters(tempCurrencyRangeFilters);

    // Apply card field changes
    setCardFieldMappings(tempCardFieldMappings);

    // Close modal
    setShowFilters(false);
  };

  // Reset temp mappings and filters when opening filter dialog
  useEffect(() => {
    if (showFilters) {
      setTempCardFieldMappings(cardFieldMappings);
      setTempColumnFilters(columnFilters);
      setTempDateRangeFilters(dateRangeFilters);
      setTempCurrencyRangeFilters(currencyRangeFilters);
    }
  }, [
    showFilters,
    cardFieldMappings,
    columnFilters,
    dateRangeFilters,
    currencyRangeFilters,
  ]);

  // Get field value from booking based on column ID
  const getFieldValue = (booking: Booking, columnId: string) => {
    const value = (booking as any)[columnId];
    const column = columns.find((col) => col.id === columnId);

    if (value === null || value === undefined) return "N/A";

    if (column?.dataType === "date") {
      return safeDate(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }

    if (column?.dataType === "currency") {
      return formatCurrency(safeNumber(value, 0));
    }

    if (column?.dataType === "boolean") {
      return value ? "Yes" : "No";
    }

    return String(value);
  };

  // Filter bookings based on search and filters
  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      searchTerm === "" ||
      (booking.bookingId &&
        booking.bookingId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      booking.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.emailAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.tourPackageName.toLowerCase().includes(searchTerm.toLowerCase());

    // Apply column-specific filters
    const matchesColumnFilters = columns.every((col) => {
      const columnKey = col.id;
      const cellValue = (booking as any)[columnKey];

      // Date range filters
      if (col.dataType === "date" && dateRangeFilters[columnKey]) {
        const { from, to } = dateRangeFilters[columnKey];
        if (!cellValue) return !from && !to; // Show empty values if no filter

        let date: Date | null = null;
        if (
          cellValue &&
          typeof cellValue === "object" &&
          "toDate" in cellValue
        ) {
          date = (cellValue as any).toDate();
        } else if (typeof cellValue === "number") {
          date = new Date(
            cellValue > 1000000000000 ? cellValue : cellValue * 1000
          );
        } else if (typeof cellValue === "string") {
          date = new Date(cellValue);
        } else if (cellValue instanceof Date) {
          date = cellValue;
        }

        if (!date) return !from && !to;

        if (from && date < from) return false;
        if (to && date > to) return false;
      }

      // Currency range filters
      if (col.dataType === "currency" && currencyRangeFilters[columnKey]) {
        const { min, max } = currencyRangeFilters[columnKey];
        const numericValue =
          typeof cellValue === "number"
            ? cellValue
            : parseFloat(cellValue?.toString() || "0") || 0;

        if (min !== undefined && numericValue < min) return false;
        if (max !== undefined && numericValue > max) return false;
      }

      // Text filters for other column types
      if (columnFilters[columnKey]) {
        const filterValue = columnFilters[columnKey].toLowerCase();
        const cellString = cellValue?.toString().toLowerCase() || "";
        return cellString.includes(filterValue);
      }

      return true;
    });

    return matchesSearch && matchesColumnFilters;
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="border border-border">
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-crimson-red mx-auto mb-4"></div>
            <p className="text-muted-foreground text-lg">Loading bookings...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards with Add Button */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4">
        {/* Total Bookings */}
        <Card className="border border-border hover:border-crimson-red transition-all duration-300 hover:shadow-md">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">
                  Total Bookings
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {totalBookings}
                </p>
                {/* Breakdown */}
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {confirmedBookings > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-spring-green"></div>
                      <p className="text-xs text-muted-foreground">
                        Confirmed:{" "}
                        <span className="text-spring-green font-bold">
                          {confirmedBookings}
                        </span>
                      </p>
                    </div>
                  )}
                  {pendingBookings > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-vivid-orange"></div>
                      <p className="text-xs text-muted-foreground">
                        Pending:{" "}
                        <span className="text-vivid-orange font-bold">
                          {pendingBookings}
                        </span>
                      </p>
                    </div>
                  )}
                  {completedBookings > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <p className="text-xs text-muted-foreground">
                        Completed:{" "}
                        <span className="text-blue-500 font-bold">
                          {completedBookings}
                        </span>
                      </p>
                    </div>
                  )}
                  {cancelledBookings > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-crimson-red"></div>
                      <p className="text-xs text-muted-foreground">
                        Cancelled:{" "}
                        <span className="text-crimson-red font-bold">
                          {cancelledBookings}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 bg-gradient-to-br from-blue-500/20 to-blue-500/10 rounded-full rounded-br-none">
                <BsCalendar3 className="h-6 w-6 text-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue & Pending */}
        <Card className="border border-border hover:border-crimson-red transition-all duration-300 hover:shadow-md">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">
                  Revenue
                </p>
                <p className="text-2xl font-bold text-spring-green">
                  {formatCurrency(totalRevenue)}
                </p>
                {pendingPayments > 0 && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <div className="w-2 h-2 rounded-full bg-crimson-red"></div>
                    <p className="text-xs text-muted-foreground">
                      Pending:{" "}
                      <span className="text-crimson-red font-bold">
                        {formatCurrency(pendingPayments)}
                      </span>
                    </p>
                  </div>
                )}
              </div>
              <div className="p-4 bg-gradient-to-br from-crimson-red/20 to-crimson-red/10 rounded-full rounded-br-none">
                <HiTrendingUp className="h-6 w-6 text-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add Booking Button */}
        <div className="flex items-center justify-center">
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="group h-20 w-20 rounded-full rounded-br-none bg-crimson-red hover:bg-royal-purple text-white transition-all duration-300 hover:scale-105 shadow-lg relative"
            title="Add New Booking"
          >
            <FaPlus className="h-10 w-10 absolute group-hover:opacity-0 group-hover:scale-0 transition-all duration-300" />
            <span className="text-[9px] font-medium opacity-0 scale-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 whitespace-nowrap font-hk-grotesk">
              ADD BOOKING
            </span>
          </Button>
        </div>
      </div>

      {/* Search and Filters Section */}
      <Card
        data-filter-section
        className={`sticky top-4 z-50 border border-border bg-white backdrop-blur-sm transition-all duration-300 ${
          isFilterSticky
            ? "shadow-[0_-12px_60px_0px_rgba(0,0,0,0.6)]"
            : "shadow-lg"
        }`}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by booking ID, name, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-border focus:border-crimson-red focus:ring-crimson-red/20"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Filters Button */}
            <Dialog open={showFilters} onOpenChange={setShowFilters}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 border-border hover:bg-crimson-red/10 hover:border-crimson-red hover:text-crimson-red"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                  {getActiveFiltersCount() > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-1 bg-crimson-red text-white"
                    >
                      {getActiveFiltersCount()}
                    </Badge>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <DialogTitle className="text-lg font-semibold text-foreground">
                      Advanced Filters & Card Customization
                    </DialogTitle>
                    <div className="flex items-center gap-3">
                      {getTempActiveFiltersCount() > 0 && (
                        <>
                          <span className="text-sm text-muted-foreground">
                            {getTempActiveFiltersCount()} filter
                            {getTempActiveFiltersCount() !== 1 ? "s" : ""}{" "}
                            configured
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={clearAllTempFilters}
                            className="text-xs border-border hover:bg-crimson-red/10 hover:border-crimson-red hover:text-crimson-red"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Clear All
                          </Button>
                        </>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTempColumnFilters({});
                          setTempDateRangeFilters({});
                          setTempCurrencyRangeFilters({});
                          setTempCardFieldMappings({
                            field1: "fullName",
                            field2: "tourPackageName",
                            field3_left: "reservationDate",
                            field3_right: "tourDate",
                            field4: "paid",
                          });
                        }}
                        className="text-xs border-crimson-red/30 text-crimson-red hover:bg-crimson-red/10 hover:border-crimson-red"
                      >
                        Reset to Default
                      </Button>
                    </div>
                  </div>
                </DialogHeader>

                <div className="flex flex-col lg:flex-row gap-6 pt-4">
                  {/* Left Side - Filters (70%) */}
                  <div className="flex-1 lg:w-[60%] space-y-6">
                    {/* Advanced Column Filters */}
                    <div className="space-y-4">
                      <Label className="text-sm font-medium text-foreground">
                        Advanced Column Filters
                      </Label>
                      <div className="h-96 overflow-y-auto border border-border rounded-lg p-4 bg-muted/20 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-crimson-red/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-crimson-red/40">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {columns.map((col) => {
                            if (col.dataType === "date") {
                              return (
                                <div key={col.id} className="space-y-2">
                                  <Label className="text-xs font-medium text-foreground">
                                    {col.columnName} (Date Range)
                                  </Label>
                                  <div className="flex gap-2">
                                    <Input
                                      type="date"
                                      value={
                                        tempDateRangeFilters[col.id]?.from
                                          ? tempDateRangeFilters[col.id].from
                                              .toISOString()
                                              .split("T")[0]
                                          : ""
                                      }
                                      onChange={(e) =>
                                        setTempDateRangeFilters((prev) => ({
                                          ...prev,
                                          [col.id]: {
                                            ...prev[col.id],
                                            from: e.target.value
                                              ? new Date(e.target.value)
                                              : undefined,
                                          },
                                        }))
                                      }
                                      className="text-xs bg-white flex-1 h-8 px-2"
                                      placeholder="From"
                                    />
                                    <Input
                                      type="date"
                                      value={
                                        tempDateRangeFilters[col.id]?.to
                                          ? tempDateRangeFilters[col.id].to
                                              .toISOString()
                                              .split("T")[0]
                                          : ""
                                      }
                                      onChange={(e) =>
                                        setTempDateRangeFilters((prev) => ({
                                          ...prev,
                                          [col.id]: {
                                            ...prev[col.id],
                                            to: e.target.value
                                              ? new Date(e.target.value)
                                              : undefined,
                                          },
                                        }))
                                      }
                                      className="text-xs bg-white flex-1 h-8 px-2"
                                      placeholder="To"
                                    />
                                    {(tempDateRangeFilters[col.id]?.from ||
                                      tempDateRangeFilters[col.id]?.to) && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          clearTempColumnFilter(col.id)
                                        }
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            }

                            if (col.dataType === "currency") {
                              return (
                                <div key={col.id} className="space-y-2">
                                  <Label className="text-xs font-medium text-foreground">
                                    {col.columnName} (Range)
                                  </Label>
                                  <div className="flex gap-2">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      placeholder="Min"
                                      value={
                                        tempCurrencyRangeFilters[col.id]?.min ||
                                        ""
                                      }
                                      onChange={(e) =>
                                        setTempCurrencyRangeFilters((prev) => ({
                                          ...prev,
                                          [col.id]: {
                                            ...prev[col.id],
                                            min: e.target.value
                                              ? parseFloat(e.target.value)
                                              : undefined,
                                          },
                                        }))
                                      }
                                      className="text-xs bg-white h-8 px-2"
                                    />
                                    <Input
                                      type="number"
                                      step="0.01"
                                      placeholder="Max"
                                      value={
                                        tempCurrencyRangeFilters[col.id]?.max ||
                                        ""
                                      }
                                      onChange={(e) =>
                                        setTempCurrencyRangeFilters((prev) => ({
                                          ...prev,
                                          [col.id]: {
                                            ...prev[col.id],
                                            max: e.target.value
                                              ? parseFloat(e.target.value)
                                              : undefined,
                                          },
                                        }))
                                      }
                                      className="text-xs bg-white h-8 px-2"
                                    />
                                    {(tempCurrencyRangeFilters[col.id]?.min !==
                                      undefined ||
                                      tempCurrencyRangeFilters[col.id]?.max !==
                                        undefined) && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          clearTempColumnFilter(col.id)
                                        }
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            }

                            // Text filter for other column types
                            return (
                              <div key={col.id} className="space-y-2">
                                <Label className="text-xs font-medium text-foreground">
                                  {col.columnName}
                                </Label>
                                <div className="flex gap-2">
                                  <Input
                                    placeholder={`Filter ${col.columnName}...`}
                                    value={tempColumnFilters[col.id] || ""}
                                    onChange={(e) =>
                                      setTempColumnFilters((prev) => ({
                                        ...prev,
                                        [col.id]: e.target.value,
                                      }))
                                    }
                                    className="text-xs bg-white h-8 px-2"
                                  />
                                  {tempColumnFilters[col.id] && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        clearTempColumnFilter(col.id)
                                      }
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Side - Card Preview (30%) */}
                  <div className="lg:w-[40%] space-y-4">
                    <h3 className="text-sm font-semibold text-foreground">
                      Card Preview
                    </h3>

                    {/* Scaled Card Preview */}
                    <div
                      className="transform scale-90 origin-top-left"
                      style={{ width: "111%", height: "auto" }}
                    >
                      <Card className="group border border-border overflow-hidden relative pointer-events-none">
                        {/* Document ID - Upper Left */}
                        <div className="absolute top-2 left-2 z-10">
                          <div className="bg-crimson-red/90 text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded rounded-br-none shadow-sm">
                            ID-001
                          </div>
                        </div>

                        {/* Card Header */}
                        <CardHeader className="p-3 pb-2 border-b border-border/50">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 mb-1 pl-8">
                                <Badge
                                  variant="outline"
                                  className="text-xs font-medium border-0 text-foreground px-1.5 py-0 rounded-full bg-spring-green/20"
                                >
                                  Confirmed
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className="text-xs font-medium border-0 text-foreground px-1.5 py-0 rounded-full bg-blue-500/20"
                                >
                                  Group
                                </Badge>
                              </div>
                              <h3 className="font-bold text-lg text-foreground truncate font-mono">
                                BOOK-001
                              </h3>
                              <div className="text-xs flex items-center gap-1 mt-0.5 truncate text-muted-foreground">
                                <MdEmail className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">
                                  traveler@example.com
                                </span>
                              </div>
                            </div>
                            <div className="text-2xl bg-crimson-red/10 font-bold text-crimson-red font-mono px-2 py-1 rounded-full rounded-br-none">
                              P2
                            </div>
                          </div>
                        </CardHeader>

                        {/* Card Content */}
                        <CardContent className="p-3 pt-2 space-y-2 pointer-events-auto">
                          {/* Field 1 - Traveler */}
                          {(() => {
                            const IconComponent = getFieldIcon(
                              tempCardFieldMappings.field1
                            );
                            return (
                              <Popover
                                open={fieldSelectorOpen === "field1"}
                                onOpenChange={(open) =>
                                  setFieldSelectorOpen(open ? "field1" : null)
                                }
                              >
                                <PopoverTrigger asChild>
                                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-crimson-red/10 cursor-pointer border-2 border-dashed border-transparent hover:border-crimson-red/50 transition-all">
                                    <IconComponent className="h-4 w-4 text-foreground flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[10px] text-muted-foreground font-medium">
                                        {getColumnLabel(
                                          tempCardFieldMappings.field1
                                        )}
                                      </p>
                                      <p className="text-sm font-semibold text-foreground truncate">
                                        {getSamplePreviewValue(
                                          tempCardFieldMappings.field1
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent
                                  className="w-64 p-2"
                                  onWheel={(e) => e.stopPropagation()}
                                >
                                  <div className="space-y-1 max-h-64 overflow-y-auto scrollbar-hide">
                                    <p className="text-xs font-semibold text-muted-foreground px-2 py-1">
                                      Select Field
                                    </p>
                                    <p className="text-[10px] text-crimson-red font-medium px-2 py-0.5 bg-crimson-red/5 rounded mb-1">
                                      💡 Recommended: Full Name
                                    </p>
                                    {columns
                                      .filter(
                                        (col) =>
                                          !col.columnName
                                            .toLowerCase()
                                            .includes("delete")
                                      )
                                      .map((col) => (
                                        <button
                                          key={col.id}
                                          onClick={() =>
                                            handleFieldSelect("field1", col.id)
                                          }
                                          className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted transition-colors ${
                                            tempCardFieldMappings.field1 ===
                                            col.id
                                              ? "bg-crimson-red/10 font-semibold"
                                              : ""
                                          }`}
                                        >
                                          {col.columnName}
                                        </button>
                                      ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            );
                          })()}

                          {/* Field 2 - Tour Package */}
                          {(() => {
                            const IconComponent = getFieldIcon(
                              tempCardFieldMappings.field2
                            );
                            return (
                              <Popover
                                open={fieldSelectorOpen === "field2"}
                                onOpenChange={(open) =>
                                  setFieldSelectorOpen(open ? "field2" : null)
                                }
                              >
                                <PopoverTrigger asChild>
                                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-crimson-red/10 cursor-pointer border-2 border-dashed border-transparent hover:border-crimson-red/50 transition-all">
                                    <IconComponent className="h-4 w-4 text-foreground flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[10px] text-muted-foreground font-medium">
                                        {getColumnLabel(
                                          tempCardFieldMappings.field2
                                        )}
                                      </p>
                                      <p className="text-sm font-semibold text-foreground truncate">
                                        {getSamplePreviewValue(
                                          tempCardFieldMappings.field2
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent
                                  className="w-64 p-2"
                                  onWheel={(e) => e.stopPropagation()}
                                >
                                  <div className="space-y-1 max-h-64 overflow-y-auto scrollbar-hide">
                                    <p className="text-xs font-semibold text-muted-foreground px-2 py-1">
                                      Select Field
                                    </p>
                                    <p className="text-[10px] text-crimson-red font-medium px-2 py-0.5 bg-crimson-red/5 rounded mb-1">
                                      💡 Recommended: Tour Package Name
                                    </p>
                                    {columns
                                      .filter(
                                        (col) =>
                                          !col.columnName
                                            .toLowerCase()
                                            .includes("delete")
                                      )
                                      .map((col) => (
                                        <button
                                          key={col.id}
                                          onClick={() =>
                                            handleFieldSelect("field2", col.id)
                                          }
                                          className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted transition-colors ${
                                            tempCardFieldMappings.field2 ===
                                            col.id
                                              ? "bg-crimson-red/10 font-semibold"
                                              : ""
                                          }`}
                                        >
                                          {col.columnName}
                                        </button>
                                      ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            );
                          })()}

                          {/* Field 3 - Dates (Grid with two fields) */}
                          <div className="grid grid-cols-2 gap-2">
                            {(() => {
                              const IconComponentLeft = getFieldIcon(
                                tempCardFieldMappings.field3_left
                              );
                              return (
                                <Popover
                                  open={fieldSelectorOpen === "field3_left"}
                                  onOpenChange={(open) =>
                                    setFieldSelectorOpen(
                                      open ? "field3_left" : null
                                    )
                                  }
                                >
                                  <PopoverTrigger asChild>
                                    <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/30 hover:bg-crimson-red/10 cursor-pointer border-2 border-dashed border-transparent hover:border-crimson-red/50 transition-all">
                                      <IconComponentLeft className="h-4 w-4 text-foreground flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[10px] text-muted-foreground font-medium">
                                          {getColumnLabel(
                                            tempCardFieldMappings.field3_left
                                          )}
                                        </p>
                                        <p className="text-xs font-semibold text-foreground">
                                          {getSamplePreviewValue(
                                            tempCardFieldMappings.field3_left
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    className="w-64 p-2"
                                    onWheel={(e) => e.stopPropagation()}
                                  >
                                    <div className="space-y-1 max-h-64 overflow-y-auto scrollbar-hide">
                                      <p className="text-xs font-semibold text-muted-foreground px-2 py-1">
                                        Select Field
                                      </p>
                                      <p className="text-[10px] text-crimson-red font-medium px-2 py-0.5 bg-crimson-red/5 rounded mb-1">
                                        💡 Recommended: Reservation Date
                                      </p>
                                      {columns
                                        .filter(
                                          (col) =>
                                            !col.columnName
                                              .toLowerCase()
                                              .includes("delete")
                                        )
                                        .map((col) => (
                                          <button
                                            key={col.id}
                                            onClick={() =>
                                              handleFieldSelect(
                                                "field3_left",
                                                col.id
                                              )
                                            }
                                            className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted transition-colors ${
                                              tempCardFieldMappings.field3_left ===
                                              col.id
                                                ? "bg-crimson-red/10 font-semibold"
                                                : ""
                                            }`}
                                          >
                                            {col.columnName}
                                          </button>
                                        ))}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              );
                            })()}

                            {(() => {
                              const IconComponentRight = getFieldIcon(
                                tempCardFieldMappings.field3_right
                              );
                              return (
                                <Popover
                                  open={fieldSelectorOpen === "field3_right"}
                                  onOpenChange={(open) =>
                                    setFieldSelectorOpen(
                                      open ? "field3_right" : null
                                    )
                                  }
                                >
                                  <PopoverTrigger asChild>
                                    <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/30 hover:bg-crimson-red/10 cursor-pointer border-2 border-dashed border-transparent hover:border-crimson-red/50 transition-all">
                                      <IconComponentRight className="h-4 w-4 text-foreground flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[10px] text-muted-foreground font-medium">
                                          {getColumnLabel(
                                            tempCardFieldMappings.field3_right
                                          )}
                                        </p>
                                        <p className="text-xs font-semibold text-foreground">
                                          {getSamplePreviewValue(
                                            tempCardFieldMappings.field3_right
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    className="w-64 p-2"
                                    onWheel={(e) => e.stopPropagation()}
                                  >
                                    <div className="space-y-1 max-h-64 overflow-y-auto scrollbar-hide">
                                      <p className="text-xs font-semibold text-muted-foreground px-2 py-1">
                                        Select Field
                                      </p>
                                      <p className="text-[10px] text-crimson-red font-medium px-2 py-0.5 bg-crimson-red/5 rounded mb-1">
                                        💡 Recommended: Tour Date
                                      </p>
                                      {columns
                                        .filter(
                                          (col) =>
                                            !col.columnName
                                              .toLowerCase()
                                              .includes("delete")
                                        )
                                        .map((col) => (
                                          <button
                                            key={col.id}
                                            onClick={() =>
                                              handleFieldSelect(
                                                "field3_right",
                                                col.id
                                              )
                                            }
                                            className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted transition-colors ${
                                              tempCardFieldMappings.field3_right ===
                                              col.id
                                                ? "bg-crimson-red/10 font-semibold"
                                                : ""
                                            }`}
                                          >
                                            {col.columnName}
                                          </button>
                                        ))}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              );
                            })()}
                          </div>

                          {/* Field 4 - Payment (Non-interactive, always shows payment) */}
                          <div className="p-2.5 rounded-lg bg-muted/30 opacity-60">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-1.5">
                                <IoWallet className="h-4 w-4 text-foreground" />
                                <span className="text-xs font-semibold text-foreground">
                                  Payment Status
                                </span>
                              </div>
                              <span className="text-xs font-bold text-crimson-red">
                                50%
                              </span>
                            </div>
                            <div className="w-full bg-background/50 rounded-full h-2 mb-1.5 border border-border/30">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-crimson-red to-crimson-red/80"
                                style={{ width: "50%" }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground text-[10px]">
                                Fixed payment section
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>

                {/* Modal Footer with Apply Changes button */}
                <div className="flex items-center justify-end pt-4 border-t border-border mt-6">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowFilters(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleApplyAllChanges}
                      className="bg-crimson-red hover:bg-crimson-red/90 text-white"
                    >
                      Apply Changes
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* View Mode Toggle */}
            <div className="flex border border-border rounded-md bg-background shadow-sm">
              <Button
                variant={viewMode === "cards" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("cards")}
                className={`rounded-r-none border-r border-border transition-colors ${
                  viewMode === "cards"
                    ? "bg-primary hover:bg-primary/90 text-white shadow shadow-primary/25"
                    : "hover:bg-crimson-red/10"
                }`}
                title="Card view"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className={`rounded-l-none transition-colors ${
                  viewMode === "list"
                    ? "bg-primary hover:bg-primary/90 text-white shadow shadow-primary/25"
                    : "hover:bg-crimson-red/10"
                }`}
                title="List view"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Display */}
      {filteredBookings.length === 0 ? (
        <Card className="border-2 border-dashed border-border">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 bg-muted rounded-full mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No bookings found
            </h3>
            <p className="text-muted-foreground mb-4 max-w-sm">
              No bookings match your search criteria. Try adjusting your
              filters.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("All");
                setTypeFilter("All");
              }}
              className="border-border hover:bg-crimson-red/10 hover:border-crimson-red hover:text-crimson-red"
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {filteredBookings.map((booking) => {
            const isInvalid = !booking.bookingId;
            return (
              <Card
                key={booking.id}
                onClick={() => handleBookingClick(booking)}
                className={`group border transition-all duration-300 cursor-pointer overflow-hidden relative ${
                  isInvalid
                    ? "border-crimson-red bg-crimson-red/5 hover:border-crimson-red hover:bg-crimson-red/10"
                    : "border-border hover:border-crimson-red/50"
                }`}
              >
                {/* Document ID - Upper Left */}
                <div className="absolute top-2 left-2 z-10">
                  <div className="bg-crimson-red/90 text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded rounded-br-none shadow-sm">
                    {booking.id}
                  </div>
                </div>

                {/* Card Header */}
                <CardHeader className="p-3 pb-2 border-b border-border/50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 mb-1 pl-8">
                        <Badge
                          variant="outline"
                          className={`text-xs font-medium border-0 text-foreground px-1.5 py-0 rounded-full truncate max-w-[80px] ${getStatusBgColor(
                            booking
                          )}`}
                          title={booking.bookingStatus || "Pending"}
                        >
                          {getBookingStatusCategory(booking.bookingStatus)}
                        </Badge>
                        {booking.bookingType !== "Individual" && (
                          <Badge
                            variant="outline"
                            className={`text-xs font-medium border-0 text-foreground px-1.5 py-0 rounded-full truncate max-w-[80px] ${getBookingTypeBgColor(
                              booking.bookingType
                            )}`}
                            title={booking.bookingType}
                          >
                            {booking.bookingType}
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-bold text-lg text-foreground group-hover:text-crimson-red transition-colors truncate font-mono">
                        {booking.bookingId || "Invalid Booking"}
                      </h3>
                      <CardDescription className="text-xs flex items-center gap-1 mt-0.5 truncate">
                        <MdEmail className="h-3 w-3 flex-shrink-0 text-foreground" />
                        <span className="truncate">{booking.emailAddress}</span>
                      </CardDescription>
                    </div>
                    {/* Payment Plan Code */}
                    {getPaymentPlanCode(booking) && (
                      <div className="text-2xl bg-crimson-red/10 font-bold text-crimson-red font-mono  px-2 py-1 rounded-full rounded-br-none">
                        {getPaymentPlanCode(booking)}
                      </div>
                    )}
                  </div>
                </CardHeader>

                {/* Card Content */}
                <CardContent className="p-3 pt-2 space-y-2">
                  {/* Field 1 - Dynamic */}
                  {(() => {
                    const IconComponent = getFieldIcon(
                      cardFieldMappings.field1
                    );
                    return (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <IconComponent className="h-4 w-4 text-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-muted-foreground font-medium">
                            {getColumnLabel(cardFieldMappings.field1)}
                          </p>
                          <p className="text-sm font-semibold text-foreground truncate">
                            {getFieldValue(booking, cardFieldMappings.field1)}
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Field 2 - Dynamic */}
                  {(() => {
                    const IconComponent = getFieldIcon(
                      cardFieldMappings.field2
                    );
                    return (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <IconComponent className="h-4 w-4 text-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-muted-foreground font-medium">
                            {getColumnLabel(cardFieldMappings.field2)}
                          </p>
                          <p className="text-sm font-semibold text-foreground truncate">
                            {getFieldValue(booking, cardFieldMappings.field2)}
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Fields 3 - Dynamic Dates */}
                  <div className="grid grid-cols-2 gap-2">
                    {(() => {
                      const IconComponentLeft = getFieldIcon(
                        cardFieldMappings.field3_left
                      );
                      return (
                        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                          <IconComponentLeft className="h-4 w-4 text-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-muted-foreground font-medium">
                              {getColumnLabel(cardFieldMappings.field3_left)}
                            </p>
                            <p className="text-xs font-semibold text-foreground">
                              {getFieldValue(
                                booking,
                                cardFieldMappings.field3_left
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                    {(() => {
                      const IconComponentRight = getFieldIcon(
                        cardFieldMappings.field3_right
                      );
                      return (
                        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                          <IconComponentRight className="h-4 w-4 text-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-muted-foreground font-medium">
                              {getColumnLabel(cardFieldMappings.field3_right)}
                            </p>
                            <p className="text-xs font-semibold text-foreground">
                              {getFieldValue(
                                booking,
                                cardFieldMappings.field3_right
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Field 4 - Dynamic Payment */}
                  <div className="p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <IoWallet className="h-4 w-4 text-foreground" />
                        <span className="text-xs font-semibold text-foreground">
                          {getColumnLabel(cardFieldMappings.field4)}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-bold ${
                          calculatePaymentProgress(booking) === 100
                            ? "text-spring-green"
                            : "text-crimson-red"
                        }`}
                      >
                        {calculatePaymentProgress(booking)}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-background/50 rounded-full h-2 mb-1.5 border border-border/30">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          calculatePaymentProgress(booking) === 100
                            ? "bg-gradient-to-r from-spring-green to-spring-green/80"
                            : "bg-gradient-to-r from-crimson-red to-crimson-red/80"
                        }`}
                        style={{
                          width: `${calculatePaymentProgress(booking)}%`,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-spring-green"></div>
                        <span className="text-muted-foreground">
                          Paid:{" "}
                          <span className="font-bold text-spring-green">
                            {formatCurrency(safeNumber(booking.paid, 0))}
                          </span>
                        </span>
                      </div>
                      {getTotalCost(booking) - safeNumber(booking.paid, 0) >
                        0 && (
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-crimson-red"></div>
                          <span className="text-muted-foreground">
                            Due:{" "}
                            <span className="font-bold text-crimson-red">
                              {formatCurrency(
                                getTotalCost(booking) -
                                  safeNumber(booking.paid, 0)
                              )}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        // List View
        <Card className="border border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="text-left py-2 px-3 font-semibold text-foreground text-[10px]">
                      ID
                    </th>
                    <th className="text-left py-2 px-3 font-semibold text-foreground text-[10px]">
                      Booking ID
                    </th>
                    <th className="text-left py-2 px-3 font-semibold text-foreground text-[10px]">
                      Email
                    </th>
                    <th className="text-left py-2 px-3 font-semibold text-foreground text-[10px]">
                      {getColumnLabel(cardFieldMappings.field1)}
                    </th>
                    <th className="text-left py-2 px-3 font-semibold text-foreground text-[10px]">
                      {getColumnLabel(cardFieldMappings.field2)}
                    </th>
                    <th className="text-left py-2 px-3 font-semibold text-foreground text-[10px]">
                      {getColumnLabel(cardFieldMappings.field3_left)}
                    </th>
                    <th className="text-left py-2 px-3 font-semibold text-foreground text-[10px]">
                      {getColumnLabel(cardFieldMappings.field3_right)}
                    </th>
                    <th className="text-left py-2 px-3 font-semibold text-foreground text-[10px]">
                      Status
                    </th>
                    <th className="text-left py-2 px-3 font-semibold text-foreground text-[10px]">
                      Payment
                    </th>
                    <th className="text-left py-2 px-3 font-semibold text-foreground text-[10px]">
                      Plan
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((booking) => {
                    const isInvalid = !booking.bookingId;
                    return (
                      <tr
                        key={booking.id}
                        onClick={() => handleBookingClick(booking)}
                        className={`border-b transition-colors duration-200 cursor-pointer ${
                          isInvalid
                            ? "border-crimson-red bg-crimson-red/10 hover:bg-crimson-red/20"
                            : "border-border hover:bg-crimson-red/5"
                        }`}
                      >
                        <td className="py-2 px-3">
                          <span className="font-mono text-[10px] font-semibold text-crimson-red bg-crimson-red/10 px-1.5 py-0.5 rounded-full rounded-br-none">
                            {booking.id}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-mono text-[10px] font-semibold text-crimson-red">
                            {booking.bookingId || "Invalid Booking"}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1">
                            <MdEmail className="h-2.5 w-2.5 text-foreground" />
                            <span className="text-[10px] text-foreground truncate">
                              {booking.emailAddress}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          {(() => {
                            const IconComponent = getFieldIcon(
                              cardFieldMappings.field1
                            );
                            const value = getFieldValue(
                              booking,
                              cardFieldMappings.field1
                            );
                            return (
                              <div className="flex items-center gap-1">
                                <IconComponent className="h-2.5 w-2.5 text-foreground" />
                                <span className="text-[10px] text-foreground truncate">
                                  {value}
                                </span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="py-2 px-3">
                          {(() => {
                            const IconComponent = getFieldIcon(
                              cardFieldMappings.field2
                            );
                            const value = getFieldValue(
                              booking,
                              cardFieldMappings.field2
                            );
                            return (
                              <div className="flex items-center gap-1">
                                <IconComponent className="h-2.5 w-2.5 text-foreground" />
                                <span className="text-[10px] text-foreground truncate">
                                  {value}
                                </span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="py-2 px-3">
                          {(() => {
                            const IconComponent = getFieldIcon(
                              cardFieldMappings.field3_left
                            );
                            const value = getFieldValue(
                              booking,
                              cardFieldMappings.field3_left
                            );
                            return (
                              <div className="flex items-center gap-1">
                                <IconComponent className="h-2.5 w-2.5 text-foreground" />
                                <span className="text-[10px] text-foreground">
                                  {value}
                                </span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="py-2 px-3">
                          {(() => {
                            const IconComponent = getFieldIcon(
                              cardFieldMappings.field3_right
                            );
                            const value = getFieldValue(
                              booking,
                              cardFieldMappings.field3_right
                            );
                            return (
                              <div className="flex items-center gap-1">
                                <IconComponent className="h-2.5 w-2.5 text-foreground" />
                                <span className="text-[10px] text-foreground">
                                  {value}
                                </span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="py-2 pl-3 pr-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-medium border-0 text-foreground px-1 py-0 rounded-full truncate max-w-[80px] ${getStatusBgColor(
                              booking
                            )}`}
                            title={booking.bookingStatus || "Pending"}
                          >
                            {getBookingStatusCategory(booking.bookingStatus)}
                          </Badge>
                        </td>
                        <td className="py-2 px-3">
                          <div className="space-y-0.5">
                            <div className="flex items-center justify-between gap-1">
                              <span
                                className={`text-[10px] font-bold ${
                                  calculatePaymentProgress(booking) === 100
                                    ? "text-spring-green"
                                    : "text-crimson-red"
                                }`}
                              >
                                {calculatePaymentProgress(booking)}%
                              </span>
                            </div>
                            <div className="w-20 bg-muted rounded-full h-1">
                              <div
                                className={`h-full rounded-full ${
                                  calculatePaymentProgress(booking) === 100
                                    ? "bg-spring-green"
                                    : "bg-crimson-red"
                                }`}
                                style={{
                                  width: `${calculatePaymentProgress(
                                    booking
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          {getPaymentPlanCode(booking) && (
                            <div className="text-[10px] font-bold text-crimson-red font-mono bg-crimson-red/10 px-1.5 py-0.5 rounded-full rounded-br-none inline-block">
                              {getPaymentPlanCode(booking)}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Booking Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FaPlus className="h-6 w-6 text-crimson-red" />
              Add New Booking
            </DialogTitle>
          </DialogHeader>
          <div className="py-8">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="p-6 bg-crimson-red/10 rounded-full rounded-br-none">
                <FaPlus className="h-12 w-12 text-crimson-red" />
              </div>
              <p className="text-muted-foreground text-lg">
                Booking form coming soon
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking Detail Modal */}
      <BookingDetailModal
        isOpen={isDetailModalOpen}
        onClose={handleModalClose}
        booking={selectedBooking}
      />
    </div>
  );
}
