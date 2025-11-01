"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Fuse from "fuse.js";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import {
  Search,
  Filter,
  X,
  User,
  Grid3X3,
  List,
  Trash2,
  ChevronUp,
  ChevronDown,
  Type as CaseIcon,
  Hash as WholeWordIcon,
  Code2 as RegexIcon,
} from "lucide-react";
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
import { bookingService } from "@/services/booking-service";
import { useToast } from "@/hooks/use-toast";
import BookingDetailModal from "./BookingDetailModal";
import AddBookingModal from "./AddBookingModal";

export default function BookingsSection() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "list">("list");
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

  // New dynamic filter builder state
  type FilterOperator = "eq" | "gte" | "gt" | "lte" | "lt" | "between" | "null";

  interface FilterConfig {
    id: string;
    columnId?: string;
    operator?: FilterOperator; // for number/currency
    matchOptions?: {
      matchCase: boolean;
      matchWholeWord: boolean;
      useRegex: boolean;
    }; // for string/email
    value?: any; // single value or array (for selects)
    value2?: any; // for between/date to
    dataTypeOverride?: SheetColumn["dataType"]; // for function columns
  }

  const [tempFilters, setTempFilters] = useState<FilterConfig[]>([]);
  const [activeFilters, setActiveFilters] = useState<FilterConfig[]>([]);

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
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);

  // Ref for the bookings container to enable scrolling after adding a booking
  const bookingsContainerRef = useRef<HTMLDivElement>(null);

  // Remove scroll button states - using CSS-only approach

  // Create Fuse instance for fuzzy search
  const fuse = useMemo(() => {
    if (bookings.length === 0) return null;

    // Get all string fields from bookings for comprehensive search
    const searchableFields = columns
      .filter(
        (col) =>
          col.dataType === "string" ||
          col.dataType === "email" ||
          col.dataType === "select"
      )
      .map((col) => ({
        name: col.id,
        getFn: (booking: any) => {
          const value = booking[col.id];
          if (value === null || value === undefined) return "";
          return String(value);
        },
      }));

    return new Fuse(bookings, {
      keys: searchableFields.map((field) => ({
        name: field.name,
        getFn: field.getFn,
        weight: 0.7,
      })),
      threshold: 0.4, // 0 = exact match, 1 = match anything
      includeScore: true,
      minMatchCharLength: 2,
    });
  }, [bookings, columns]);

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

        // Sort bookings numerically by row number
        const sortedBookings = fetchedBookings.sort((a, b) => {
          const aRow = typeof a.row === "number" ? a.row : 0;
          const bRow = typeof b.row === "number" ? b.row : 0;
          if (aRow === 0 && bRow === 0) return 0;
          if (aRow === 0) return 1;
          if (bRow === 0) return -1;
          return aRow - bRow;
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

        // Use real data if available, otherwise show empty state
        if (sortedBookings.length > 0) {
          setBookings(sortedBookings);
        } else {
          console.log(
            "📝 [BOOKINGS SECTION] No real data found, showing empty state"
          );
          setBookings([]);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error("❌ Error listening to bookings:", error);
        console.log(
          "📝 [BOOKINGS SECTION] Error occurred, showing empty state"
        );
        setBookings([]);
        setIsLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => {
      console.log("🧹 [BOOKINGS SECTION] Cleaning up booking subscription");
      unsubscribe();
    };
  }, []);

  // Handle query parameters for opening modals
  useEffect(() => {
    const bookingId = searchParams.get("bookingId");
    const action = searchParams.get("action");
    const mode = searchParams.get("mode");

    if (bookingId && bookings.length > 0) {
      const booking = bookings.find((b) => b.id === bookingId);
      if (booking) {
        setSelectedBooking(booking);
        setIsDetailModalOpen(true);
      }
    } else if (action === "new") {
      setIsAddModalOpen(true);
    }
  }, [searchParams, bookings]);

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

  // Minimal JavaScript for CSS-only scroll button visibility
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      const isAtTop = scrollTop <= 10;
      const isAtBottom = scrollTop >= documentHeight - windowHeight - 10;

      // Set data attributes for CSS
      document.body.setAttribute(
        "data-scroll",
        isAtTop ? "top" : isAtBottom ? "bottom" : "middle"
      );
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial call
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
    if (typeof status !== "string" || status.trim() === "") return "Pending";

    const statusLower = status.toLowerCase();
    if (statusLower.includes("confirmed")) return "Confirmed";
    if (statusLower.includes("cancelled")) return "Cancelled";
    if (statusLower.includes("installment")) return "Pending"; // Installments are pending payments
    if (statusLower.includes("completed")) return "Completed";

    return "Pending"; // Default fallback
  };

  // Check if a booking is invalid (missing essential data)
  const isBookingInvalid = (booking: Booking): boolean => {
    // A booking is considered invalid if it's missing critical identifying information
    // Check if the booking has no meaningful data at all
    const hasNoName = !booking.fullName || booking.fullName.trim() === "";
    const hasNoEmail =
      !booking.emailAddress || booking.emailAddress.trim() === "";
    const hasNoPackage =
      !booking.tourPackageName || booking.tourPackageName.trim() === "";

    // A booking is invalid if it's missing all three critical fields
    return hasNoName && hasNoEmail && hasNoPackage;
  };

  // Handle booking deletion
  const handleDeleteBooking = async (bookingId: string) => {
    try {
      await bookingService.deleteBookingWithRowShift(bookingId);
      toast({
        title: "🗑️ Booking Deleted",
        description: "Booking deleted and subsequent rows shifted down",
        variant: "default",
      });
    } catch (error) {
      console.error("Failed to delete booking:", error);
      toast({
        title: "❌ Delete Failed",
        description: `Failed to delete booking: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
    }
  };

  // Calculate statistics with validation - memoized to prevent unnecessary recalculations
  const statistics = useMemo(() => {
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

    return {
      totalBookings,
      confirmedBookings,
      pendingBookings,
      cancelledBookings,
      completedBookings,
      totalRevenue,
      pendingPayments,
    };
  }, [bookings]);

  const {
    totalBookings,
    confirmedBookings,
    pendingBookings,
    cancelledBookings,
    completedBookings,
    totalRevenue,
    pendingPayments,
  } = statistics;

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

    // Add booking ID to URL
    const params = new URLSearchParams(searchParams.toString());
    params.set("bookingId", booking.id);
    router.push(`/bookings?${params.toString()}`, { scroll: false });
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsDetailModalOpen(false);
    setSelectedBooking(null);

    // Remove booking ID from URL
    const params = new URLSearchParams(searchParams.toString());
    params.delete("bookingId");
    params.delete("action");
    params.delete("mode");
    router.push(`/bookings?${params.toString()}`, { scroll: false });
  };

  // Handle booking update
  const handleBookingUpdate = (updatedBooking: Booking) => {
    // Update the booking in the local bookings array
    setBookings((prevBookings) =>
      prevBookings.map((booking) =>
        booking.id === updatedBooking.id ? updatedBooking : booking
      )
    );

    // Update the selected booking as well
    setSelectedBooking(updatedBooking);
  };

  // Handle new booking creation
  const handleBookingCreate = (newBookingData: Partial<Booking>) => {
    // Close the modal - the Firebase listener will automatically add the booking
    // in the correct sorted position when AddBookingModal saves it to Firebase
    setIsAddModalOpen(false);

    console.log(
      "✅ [BOOKINGS SECTION] New booking created, Firebase will handle updates:",
      newBookingData
    );

    // Scroll to the bottom after the booking is added
    // Use setTimeout to ensure the DOM is updated with the new booking before scrolling
    setTimeout(() => {
      if (bookingsContainerRef.current) {
        bookingsContainerRef.current.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      }
    }, 500); // Wait for Firebase to update the bookings list
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
    if (column.dataType === "date") return "Jan 15, 2024";
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
    setActiveFilters(tempFilters);

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
      setTempFilters(activeFilters);
    }
  }, [
    showFilters,
    cardFieldMappings,
    columnFilters,
    dateRangeFilters,
    currencyRangeFilters,
    activeFilters,
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
        year: "numeric",
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

  // Scroll functions
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "smooth",
    });
  };

  // Filter bookings based on search and filters
  const searchResults = useMemo(() => {
    if (!fuse || searchTerm === "") {
      return bookings;
    }
    const results = fuse.search(searchTerm);
    return results.map((result) => result.item);
  }, [fuse, searchTerm, bookings]);

  const filteredBookings = searchResults.filter((booking) => {
    // matchesSearch is now handled by Fuse.js above
    const matchesSearch = true;

    // If new activeFilters exist, use them. Otherwise fall back to legacy per-column temp states
    if (activeFilters.length > 0) {
      const satisfiesAll = activeFilters.every((f) => {
        if (!f.columnId) return true;
        const col = columns.find((c) => c.id === f.columnId);
        if (!col) return true;
        const rawValue = (booking as any)[f.columnId];
        const effectiveType =
          col.dataType === "function"
            ? f.dataTypeOverride || "string"
            : col.dataType;

        // String-like
        if (effectiveType === "string" || effectiveType === "email") {
          const text = rawValue == null ? "" : String(rawValue);
          let haystack = text;
          let needle = f.value == null ? "" : String(f.value);
          const opts = f.matchOptions || {
            matchCase: false,
            matchWholeWord: false,
            useRegex: false,
          };
          if (!opts.matchCase) {
            haystack = haystack.toLowerCase();
            needle = needle.toLowerCase();
          }
          if (opts.useRegex) {
            try {
              const pattern = opts.matchWholeWord
                ? `(^|\b)(${needle})(\b|$)`
                : needle;
              const flags = opts.matchCase ? "" : "i";
              const re = new RegExp(pattern, flags);
              return re.test(text);
            } catch {
              return false;
            }
          }
          if (opts.matchWholeWord) {
            const re = new RegExp(
              `(^|\b)${needle}(\b|$)`,
              opts.matchCase ? "" : "i"
            );
            return re.test(text);
          }
          return haystack.includes(needle);
        }

        // Number/currency
        if (effectiveType === "number" || effectiveType === "currency") {
          if (f.operator === "null") return rawValue == null || rawValue === "";
          const num =
            typeof rawValue === "number"
              ? rawValue
              : parseFloat(String(rawValue || ""));
          if (Number.isNaN(num)) return false;
          switch (f.operator) {
            case "eq":
              return num === Number(f.value);
            case "gte":
              return num >= Number(f.value);
            case "gt":
              return num > Number(f.value);
            case "lte":
              return num <= Number(f.value);
            case "lt":
              return num < Number(f.value);
            case "between":
              return num >= Number(f.value) && num <= Number(f.value2);
            default:
              return true;
          }
        }

        // Date
        if (effectiveType === "date") {
          const v = rawValue;
          let d: Date | null = null;
          if (v && typeof v === "object" && (v as any).toDate)
            d = (v as any).toDate();
          else if (v instanceof Date) d = v;
          else if (typeof v === "number")
            d = new Date(v > 1000000000000 ? v : v * 1000);
          else if (typeof v === "string") d = new Date(v);
          if (!d || Number.isNaN(d.getTime())) return false;
          const from = f.value ? new Date(f.value) : undefined;
          const to = f.value2 ? new Date(f.value2) : undefined;
          if (from && d < from) return false;
          if (to && d > to) return false;
          return true;
        }

        // Boolean
        if (effectiveType === "boolean") {
          const boolVal = !!rawValue;
          return String(boolVal) === String(f.value);
        }

        // Select (multi OR)
        if (effectiveType === "select") {
          const values: string[] = Array.isArray(f.value)
            ? f.value
            : f.value
            ? [String(f.value)]
            : [];
          if (values.length === 0) return true;
          const cell = rawValue == null ? "" : String(rawValue);
          return values.includes(cell);
        }

        return true;
      });
      return matchesSearch && satisfiesAll;
    }

    // Legacy path (if no activeFilters yet): keep existing logic
    const matchesColumnFilters = columns.every((col) => {
      const columnKey = col.id;
      const cellValue = (booking as any)[columnKey];
      if (col.dataType === "date" && dateRangeFilters[columnKey]) {
        const { from, to } = dateRangeFilters[columnKey];
        if (!cellValue) return !from && !to;
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
      if (col.dataType === "currency" && currencyRangeFilters[columnKey]) {
        const { min, max } = currencyRangeFilters[columnKey];
        const numericValue =
          typeof cellValue === "number"
            ? cellValue
            : parseFloat(cellValue?.toString() || "0") || 0;
        if (min !== undefined && numericValue < min) return false;
        if (max !== undefined && numericValue > max) return false;
      }
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
      {/* Gmail-style Loading Indicator for Creating Booking */}
      {isCreatingBooking && (
        <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
          <div className="bg-crimson-red text-white px-4 py-2 rounded-b-lg shadow-lg flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            <span className="text-sm font-medium">Creating booking...</span>
          </div>
        </div>
      )}
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
            onClick={async () => {
              setIsCreatingBooking(true);
              try {
                // Compute next row number (fill gaps)
                const rowNumbers = (bookings || [])
                  .map((b) => (typeof b.row === "number" ? b.row : 0))
                  .filter((n) => n > 0)
                  .sort((a, b) => a - b);
                let nextRowNumber = 1;
                for (let i = 0; i < rowNumbers.length; i++) {
                  if (rowNumbers[i] !== i + 1) {
                    nextRowNumber = i + 1;
                    break;
                  }
                  nextRowNumber = i + 2;
                }

                // Create minimal doc then update with id/row/timestamps
                const newBookingId = await bookingService.createBooking({});
                const bookingData = {
                  id: newBookingId,
                  row: nextRowNumber,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                } as any;
                await bookingService.updateBooking(newBookingId, bookingData);

                // Navigate with bookingId to open detail modal
                const params = new URLSearchParams(searchParams.toString());
                params.set("bookingId", newBookingId);
                params.delete("action");
                router.push(`/bookings?${params.toString()}`, {
                  scroll: false,
                });

                toast({
                  title: "✅ Booking Created",
                  description: `Successfully created a booking in row ${nextRowNumber}`,
                  variant: "default",
                });

                setIsCreatingBooking(false);
              } catch (error) {
                setIsCreatingBooking(false);
                toast({
                  title: "❌ Failed to Create Booking",
                  description: `Error: ${
                    error instanceof Error ? error.message : "Unknown error"
                  }`,
                  variant: "destructive",
                });
              }
            }}
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
        className={`sticky top-4 z-50 border border-border backdrop-blur-sm transition-all duration-300 ${
          isFilterSticky ? "shadow-[0_-12px_60px_0px_rgba(0,0,0,0.6)]" : ""
        }`}
        style={{ backgroundColor: "hsl(var(--card-surface))" }}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search across all fields ..."
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
                    {/* Advanced Column Filters - Filter Builder */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-foreground">
                          Advanced Column Filters
                        </Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setTempFilters((prev) => [
                              ...prev,
                              {
                                id: crypto.randomUUID(),
                                operator: "eq",
                                matchOptions: {
                                  matchCase: false,
                                  matchWholeWord: false,
                                  useRegex: false,
                                },
                              },
                            ])
                          }
                          className="text-xs"
                        >
                          <FaPlus className="h-3 w-3 mr-1" /> Create Filter
                        </Button>
                      </div>
                      <div className="h-96 overflow-y-auto border border-border rounded-lg p-4 bg-muted/20 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-crimson-red/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-crimson-red/40">
                        <div className="space-y-3">
                          {tempFilters.length === 0 && (
                            <div className="text-xs text-muted-foreground">
                              No filters yet. Click "Create Filter" to add one.
                            </div>
                          )}
                          {tempFilters.map((f, idx) => {
                            const selectedColumn = columns.find(
                              (c) => c.id === f.columnId
                            );
                            const effectiveType =
                              selectedColumn?.dataType === "function"
                                ? f.dataTypeOverride || "string"
                                : selectedColumn?.dataType;
                            return (
                              <div
                                key={f.id}
                                className="flex flex-wrap items-center gap-2 p-2 rounded border border-border bg-background w-full"
                              >
                                {/* Column selector */}
                                <Select
                                  value={f.columnId || ""}
                                  onValueChange={(val) =>
                                    setTempFilters((prev) => {
                                      const copy = [...prev];
                                      copy[idx] = {
                                        ...copy[idx],
                                        columnId: val,
                                      };
                                      return copy;
                                    })
                                  }
                                >
                                  <SelectTrigger className="h-8 min-w-[180px] flex-shrink-0">
                                    <SelectValue placeholder="Select column" />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-64">
                                    {columns.map((c) => (
                                      <SelectItem key={c.id} value={c.id}>
                                        {c.columnName}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>

                                {/* Function column data type override */}
                                {selectedColumn?.dataType === "function" && (
                                  <Select
                                    value={f.dataTypeOverride || "string"}
                                    onValueChange={(val) =>
                                      setTempFilters((prev) => {
                                        const copy = [...prev];
                                        copy[idx] = {
                                          ...copy[idx],
                                          dataTypeOverride: val as any,
                                        };
                                        return copy;
                                      })
                                    }
                                  >
                                    <SelectTrigger className="h-8 w-[130px] flex-shrink-0">
                                      <SelectValue placeholder="Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {(
                                        [
                                          "string",
                                          "number",
                                          "date",
                                          "boolean",
                                          "select",
                                          "email",
                                          "currency",
                                        ] as const
                                      ).map((t) => (
                                        <SelectItem key={t} value={t}>
                                          {t}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}

                                {/* Dynamic input based on type */}
                                {effectiveType === "string" ||
                                effectiveType === "email" ? (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Input
                                      className="h-8 w-[220px] flex-shrink-0"
                                      placeholder="Enter text"
                                      defaultValue={f.value || ""}
                                      onBlur={(e) =>
                                        setTempFilters((prev) => {
                                          const copy = [...prev];
                                          copy[idx] = {
                                            ...copy[idx],
                                            value: e.target.value,
                                          };
                                          return copy;
                                        })
                                      }
                                    />
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            type="button"
                                            variant={
                                              f.matchOptions?.matchCase
                                                ? "default"
                                                : "outline"
                                            }
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() =>
                                              setTempFilters((prev) => {
                                                const copy = [...prev];
                                                const mo = copy[idx]
                                                  .matchOptions || {
                                                  matchCase: false,
                                                  matchWholeWord: false,
                                                  useRegex: false,
                                                };
                                                copy[idx] = {
                                                  ...copy[idx],
                                                  matchOptions: {
                                                    ...mo,
                                                    matchCase: !mo.matchCase,
                                                  },
                                                };
                                                return copy;
                                              })
                                            }
                                          >
                                            <CaseIcon className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Match Case</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            type="button"
                                            variant={
                                              f.matchOptions?.matchWholeWord
                                                ? "default"
                                                : "outline"
                                            }
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() =>
                                              setTempFilters((prev) => {
                                                const copy = [...prev];
                                                const mo = copy[idx]
                                                  .matchOptions || {
                                                  matchCase: false,
                                                  matchWholeWord: false,
                                                  useRegex: false,
                                                };
                                                copy[idx] = {
                                                  ...copy[idx],
                                                  matchOptions: {
                                                    ...mo,
                                                    matchWholeWord:
                                                      !mo.matchWholeWord,
                                                  },
                                                };
                                                return copy;
                                              })
                                            }
                                          >
                                            <WholeWordIcon className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Match Whole Word</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            type="button"
                                            variant={
                                              f.matchOptions?.useRegex
                                                ? "default"
                                                : "outline"
                                            }
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() =>
                                              setTempFilters((prev) => {
                                                const copy = [...prev];
                                                const mo = copy[idx]
                                                  .matchOptions || {
                                                  matchCase: false,
                                                  matchWholeWord: false,
                                                  useRegex: false,
                                                };
                                                copy[idx] = {
                                                  ...copy[idx],
                                                  matchOptions: {
                                                    ...mo,
                                                    useRegex: !mo.useRegex,
                                                  },
                                                };
                                                return copy;
                                              })
                                            }
                                          >
                                            <RegexIcon className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Use Regular Expression</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                ) : effectiveType === "number" ||
                                  effectiveType === "currency" ? (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Select
                                      value={f.operator || "eq"}
                                      onValueChange={(val) =>
                                        setTempFilters((prev) => {
                                          const copy = [...prev];
                                          copy[idx] = {
                                            ...copy[idx],
                                            operator: val as any,
                                          };
                                          return copy;
                                        })
                                      }
                                    >
                                      <SelectTrigger className="h-8 w-[150px] flex-shrink-0">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="eq">
                                          Equal to (=)
                                        </SelectItem>
                                        <SelectItem value="between">
                                          Between (&gt;= && &lt;=)
                                        </SelectItem>
                                        <SelectItem value="gte">
                                          Greater than or equal (&gt;=)
                                        </SelectItem>
                                        <SelectItem value="gt">
                                          Greater than (&gt;)
                                        </SelectItem>
                                        <SelectItem value="lte">
                                          Less than or equal (&lt;=)
                                        </SelectItem>
                                        <SelectItem value="lt">
                                          Less than (&lt;)
                                        </SelectItem>
                                        <SelectItem value="null">
                                          Is Null
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                    {f.operator === "between" ? (
                                      <>
                                        <Input
                                          type="number"
                                          className="h-8 w-[120px] flex-shrink-0"
                                          placeholder="Min"
                                          defaultValue={f.value ?? ""}
                                          onBlur={(e) =>
                                            setTempFilters((prev) => {
                                              const copy = [...prev];
                                              copy[idx] = {
                                                ...copy[idx],
                                                value: e.target.value,
                                              };
                                              return copy;
                                            })
                                          }
                                        />
                                        <Input
                                          type="number"
                                          className="h-8 w-[120px] flex-shrink-0"
                                          placeholder="Max"
                                          defaultValue={f.value2 ?? ""}
                                          onBlur={(e) =>
                                            setTempFilters((prev) => {
                                              const copy = [...prev];
                                              copy[idx] = {
                                                ...copy[idx],
                                                value2: e.target.value,
                                              };
                                              return copy;
                                            })
                                          }
                                        />
                                      </>
                                    ) : f.operator === "null" ? null : (
                                      <Input
                                        type="number"
                                        className="h-8 w-[160px] flex-shrink-0"
                                        placeholder="Value"
                                        defaultValue={f.value ?? ""}
                                        onBlur={(e) =>
                                          setTempFilters((prev) => {
                                            const copy = [...prev];
                                            copy[idx] = {
                                              ...copy[idx],
                                              value: e.target.value,
                                            };
                                            return copy;
                                          })
                                        }
                                      />
                                    )}
                                  </div>
                                ) : effectiveType === "date" ? (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Input
                                      type="date"
                                      className="h-8 flex-shrink-0"
                                      value={
                                        f.value
                                          ? new Date(f.value)
                                              .toISOString()
                                              .split("T")[0]
                                          : ""
                                      }
                                      onChange={(e) =>
                                        setTempFilters((prev) => {
                                          const copy = [...prev];
                                          copy[idx] = {
                                            ...copy[idx],
                                            value: e.target.value
                                              ? new Date(e.target.value)
                                              : undefined,
                                          };
                                          return copy;
                                        })
                                      }
                                    />
                                    <Input
                                      type="date"
                                      className="h-8 flex-shrink-0"
                                      value={
                                        f.value2
                                          ? new Date(f.value2)
                                              .toISOString()
                                              .split("T")[0]
                                          : ""
                                      }
                                      onChange={(e) =>
                                        setTempFilters((prev) => {
                                          const copy = [...prev];
                                          copy[idx] = {
                                            ...copy[idx],
                                            value2: e.target.value
                                              ? new Date(e.target.value)
                                              : undefined,
                                          };
                                          return copy;
                                        })
                                      }
                                    />
                                  </div>
                                ) : effectiveType === "select" ? (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 flex-shrink-0"
                                      >
                                        {Array.isArray(f.value) &&
                                        f.value.length > 0
                                          ? `${f.value.length} selected`
                                          : "Select options"}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-56 p-2">
                                      <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                                        {(selectedColumn?.options || []).map(
                                          (opt) => {
                                            const selected =
                                              Array.isArray(f.value) &&
                                              f.value.includes(opt);
                                            return (
                                              <div
                                                key={opt}
                                                className="flex items-center gap-2 p-1 rounded hover:bg-muted cursor-pointer"
                                                onClick={() =>
                                                  setTempFilters((prev) => {
                                                    const copy = [...prev];
                                                    const arr = Array.isArray(
                                                      copy[idx].value
                                                    )
                                                      ? [
                                                          ...(copy[idx]
                                                            .value as string[]),
                                                        ]
                                                      : [];
                                                    const i = arr.indexOf(opt);
                                                    if (i >= 0)
                                                      arr.splice(i, 1);
                                                    else arr.push(opt);
                                                    copy[idx] = {
                                                      ...copy[idx],
                                                      value: arr,
                                                    };
                                                    return copy;
                                                  })
                                                }
                                              >
                                                <div
                                                  className={`h-4 w-4 border border-border rounded-sm ${
                                                    selected
                                                      ? "bg-crimson-red"
                                                      : "bg-background"
                                                  }`}
                                                />
                                                <span className="text-xs">
                                                  {opt}
                                                </span>
                                              </div>
                                            );
                                          }
                                        )}
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                ) : (
                                  <Input
                                    className="h-8 w-[220px] flex-shrink-0"
                                    placeholder="Enter value"
                                    defaultValue={f.value || ""}
                                    onBlur={(e) =>
                                      setTempFilters((prev) => {
                                        const copy = [...prev];
                                        copy[idx] = {
                                          ...copy[idx],
                                          value: e.target.value,
                                        };
                                        return copy;
                                      })
                                    }
                                  />
                                )}

                                {/* Remove filter */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 flex-shrink-0 ml-auto"
                                  onClick={() =>
                                    setTempFilters((prev) =>
                                      prev.filter((x) => x.id !== f.id)
                                    )
                                  }
                                >
                                  <X className="h-4 w-4" />
                                </Button>
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
                        {/* Row Number - Upper Left */}
                        <div className="absolute top-2 left-2 z-10">
                          <div className="bg-crimson-red/90 text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded rounded-br-none shadow-sm">
                            1
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
        <div
          ref={bookingsContainerRef}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3"
        >
          {filteredBookings
            .filter((booking) => booking.id && booking.id.trim() !== "") // Filter out bookings with empty IDs
            .map((booking) => {
              const isInvalid = isBookingInvalid(booking);
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
                  {/* Row Number - Upper Left */}
                  <div className="absolute top-2 left-2 z-10">
                    <div className="bg-crimson-red/90 text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded rounded-br-none shadow-sm">
                      {booking.row || "-"}
                    </div>
                  </div>

                  {/* Delete Button - Center (only for invalid bookings) */}
                  {isInvalid && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Button
                        variant="destructive"
                        className="h-20 w-20 rounded-full rounded-br-none bg-crimson-red hover:bg-crimson-red/90 text-white transition-all duration-300 hover:scale-105 shadow-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBooking(booking.id);
                        }}
                        title="Delete invalid booking"
                      >
                        <Trash2 className="h-8 w-8" />
                      </Button>
                    </div>
                  )}

                  {/* Blur overlay for invalid bookings on hover */}
                  {isInvalid && (
                    <div className="absolute inset-0 bg-background/20 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-5" />
                  )}

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
                          <span className="truncate">
                            {booking.emailAddress}
                          </span>
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

          {/* Add Booking Card */}
          <Card
            onClick={() => {
              setIsAddModalOpen(true);
              const params = new URLSearchParams(searchParams.toString());
              params.set("action", "new");
              router.push(`/bookings?${params.toString()}`, { scroll: false });
            }}
            className="group border-2 border-dashed border-crimson-red/30 hover:border-crimson-red/50 hover:bg-crimson-red/5 transition-all duration-300 cursor-pointer overflow-hidden relative"
          >
            <CardHeader className="p-3 pb-2 border-b border-border/50">
              <div className="flex items-center justify-center">
                <div className="p-2 bg-crimson-red/10 rounded-full rounded-br-none">
                  <FaPlus className="h-5 w-5 text-crimson-red" />
                </div>
              </div>
              <h3 className="font-bold text-lg text-crimson-red text-center mt-2">
                Add New Booking
              </h3>
              <CardDescription className="text-xs text-center text-muted-foreground">
                Click to create a new booking
              </CardDescription>
            </CardHeader>

            <CardContent className="p-3 pt-2 space-y-2">
              <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-muted/30">
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground font-medium">
                    New Booking
                  </p>
                  <p className="text-sm font-semibold text-crimson-red">
                    Click to start
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-muted/30">
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground font-medium">
                    Status
                  </p>
                  <Badge
                    variant="outline"
                    className="text-xs font-medium border-crimson-red/30 text-crimson-red px-2 py-1 rounded-full"
                  >
                    New
                  </Badge>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-muted/30">
                <div className="flex items-center justify-center gap-1.5 mb-1.5">
                  <IoWallet className="h-4 w-4 text-foreground" />
                  <span className="text-xs font-semibold text-foreground">
                    Payment
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-xs text-muted-foreground">
                    Will be calculated
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        // List View
        <Card ref={bookingsContainerRef} className="border border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="text-left py-1.5 px-2 md:py-2 md:px-3 font-semibold text-foreground text-[8px] md:text-[10px]">
                      Row #
                    </th>
                    <th className="text-left py-1.5 px-2 md:py-2 md:px-3 font-semibold text-foreground text-[8px] md:text-[10px]">
                      Booking ID
                    </th>
                    <th className="text-left py-1.5 px-2 md:py-2 md:px-3 font-semibold text-foreground text-[8px] md:text-[10px]">
                      Email
                    </th>
                    <th className="text-left py-1.5 px-2 md:py-2 md:px-3 font-semibold text-foreground text-[8px] md:text-[10px]">
                      {getColumnLabel(cardFieldMappings.field1)}
                    </th>
                    <th className="text-left py-1.5 px-2 md:py-2 md:px-3 font-semibold text-foreground text-[8px] md:text-[10px]">
                      {getColumnLabel(cardFieldMappings.field2)}
                    </th>
                    <th className="text-left py-1.5 px-2 md:py-2 md:px-3 font-semibold text-foreground text-[8px] md:text-[10px]">
                      {getColumnLabel(cardFieldMappings.field3_left)}
                    </th>
                    <th className="text-left py-1.5 px-2 md:py-2 md:px-3 font-semibold text-foreground text-[8px] md:text-[10px]">
                      {getColumnLabel(cardFieldMappings.field3_right)}
                    </th>
                    <th className="text-left py-1.5 px-2 md:py-2 md:px-3 font-semibold text-foreground text-[8px] md:text-[10px]">
                      Status
                    </th>
                    <th className="text-left py-1.5 px-2 md:py-2 md:px-3 font-semibold text-foreground text-[8px] md:text-[10px]">
                      Payment
                    </th>
                    <th className="text-left py-1.5 px-2 md:py-2 md:px-3 font-semibold text-foreground text-[8px] md:text-[10px]">
                      Plan
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings
                    .filter((booking) => booking.id && booking.id.trim() !== "") // Filter out bookings with empty IDs
                    .map((booking) => {
                      const isInvalid = isBookingInvalid(booking);
                      return (
                        <tr
                          key={booking.id}
                          onClick={() => handleBookingClick(booking)}
                          className={`group border-b transition-colors duration-200 cursor-pointer relative ${
                            isInvalid
                              ? "border-crimson-red bg-crimson-red/10 hover:bg-crimson-red/20"
                              : "border-border hover:bg-crimson-red/5"
                          }`}
                        >
                          <td className="py-1.5 px-2 md:py-2 md:px-3">
                            <span className="font-mono text-[8px] md:text-[10px] font-semibold text-crimson-red bg-crimson-red/10 px-1 py-0.5 md:px-1.5 md:py-0.5 rounded-full rounded-br-none">
                              {booking.row || "-"}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 md:py-2 md:px-3">
                            <span className="font-mono text-[8px] md:text-[10px] font-semibold text-crimson-red">
                              {booking.bookingId || "Invalid Booking"}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 md:py-2 md:px-3">
                            <div className="flex items-center gap-1">
                              <MdEmail className="h-2 w-2 md:h-2.5 md:w-2.5 text-foreground" />
                              <span className="text-[8px] md:text-[10px] text-foreground truncate">
                                {booking.emailAddress}
                              </span>
                            </div>
                          </td>
                          <td className="py-1.5 px-2 md:py-2 md:px-3">
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
                                  <IconComponent className="h-2 w-2 md:h-2.5 md:w-2.5 text-foreground" />
                                  <span className="text-[8px] md:text-[10px] text-foreground truncate">
                                    {value}
                                  </span>
                                </div>
                              );
                            })()}
                          </td>
                          <td className="py-1.5 px-2 md:py-2 md:px-3">
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
                                  <IconComponent className="h-2 w-2 md:h-2.5 md:w-2.5 text-foreground" />
                                  <span className="text-[8px] md:text-[10px] text-foreground truncate">
                                    {value}
                                  </span>
                                </div>
                              );
                            })()}
                          </td>
                          <td className="py-1.5 px-2 md:py-2 md:px-3">
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
                                  <IconComponent className="h-2 w-2 md:h-2.5 md:w-2.5 text-foreground" />
                                  <span className="text-[8px] md:text-[10px] text-foreground">
                                    {value}
                                  </span>
                                </div>
                              );
                            })()}
                          </td>
                          <td className="py-1.5 px-2 md:py-2 md:px-3">
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
                                  <IconComponent className="h-2 w-2 md:h-2.5 md:w-2.5 text-foreground" />
                                  <span className="text-[8px] md:text-[10px] text-foreground">
                                    {value}
                                  </span>
                                </div>
                              );
                            })()}
                          </td>
                          <td className="py-1.5 px-2 md:py-2 md:pl-3 md:pr-3">
                            <Badge
                              variant="outline"
                              className={`text-[8px] md:text-[10px] font-medium border-0 text-foreground px-0.5 py-0 md:px-1 md:py-0 rounded-full truncate max-w-[80px] ${getStatusBgColor(
                                booking
                              )}`}
                              title={booking.bookingStatus || "Pending"}
                            >
                              {getBookingStatusCategory(booking.bookingStatus)}
                            </Badge>
                          </td>
                          <td className="py-1.5 px-2 md:py-2 md:px-3">
                            <div className="space-y-0.5">
                              <div className="flex items-center justify-between gap-1">
                                <span
                                  className={`text-[8px] md:text-[10px] font-bold ${
                                    calculatePaymentProgress(booking) === 100
                                      ? "text-spring-green"
                                      : "text-crimson-red"
                                  }`}
                                >
                                  {calculatePaymentProgress(booking)}%
                                </span>
                              </div>
                              <div className="w-16 md:w-20 bg-muted rounded-full h-0.5 md:h-1">
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
                          <td className="py-1.5 px-2 md:py-2 md:px-3 relative">
                            {getPaymentPlanCode(booking) && (
                              <div className="text-[8px] md:text-[10px] font-bold text-crimson-red font-mono bg-crimson-red/10 px-1 py-0.5 md:px-1.5 md:py-0.5 rounded-full rounded-br-none inline-block">
                                {getPaymentPlanCode(booking)}
                              </div>
                            )}
                            {/* Delete Button Overlay - shown on hover for invalid bookings */}
                            {isInvalid && (
                              <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto">
                                <Button
                                  variant="destructive"
                                  className="h-6 w-6 md:h-8 md:w-8 rounded-full rounded-br-none bg-crimson-red hover:bg-crimson-red/90 text-white transition-all duration-300 hover:scale-105 shadow-lg"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteBooking(booking.id);
                                  }}
                                  title="Delete invalid booking"
                                >
                                  <Trash2 className="h-2.5 w-2.5 md:h-3 md:w-3" />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                  {/* Add Booking Row */}
                  <tr
                    onClick={() => {
                      setIsAddModalOpen(true);
                      const params = new URLSearchParams(
                        searchParams.toString()
                      );
                      params.set("action", "new");
                      router.push(`/bookings?${params.toString()}`, {
                        scroll: false,
                      });
                    }}
                    className="group border-b border-dashed border-crimson-red/30 hover:border-crimson-red/50 hover:bg-crimson-red/5 transition-all duration-300 cursor-pointer"
                  >
                    <td className="py-2 px-2 md:py-4 md:px-3 text-center">
                      <div className="flex items-center justify-center">
                        <div className="p-1.5 md:p-2 bg-crimson-red/10 rounded-full rounded-br-none">
                          <FaPlus className="h-3 w-3 md:h-4 md:w-4 text-crimson-red" />
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-2 md:py-4 md:px-3 text-center">
                      <span className="text-[8px] md:text-[10px] font-medium text-crimson-red">
                        Add New Booking
                      </span>
                    </td>
                    <td className="py-2 px-2 md:py-4 md:px-3 text-center">
                      <span className="text-[8px] md:text-xs text-muted-foreground">
                        Click to create
                      </span>
                    </td>
                    <td className="py-2 px-2 md:py-4 md:px-3 text-center">
                      <span className="text-[8px] md:text-xs text-muted-foreground">
                        New booking
                      </span>
                    </td>
                    <td className="py-2 px-2 md:py-4 md:px-3 text-center">
                      <Badge
                        variant="outline"
                        className="text-[8px] md:text-xs font-medium border-crimson-red/30 text-crimson-red px-1.5 py-0.5 md:px-2 md:py-1 rounded-full"
                      >
                        New
                      </Badge>
                    </td>
                    <td className="py-2 px-2 md:py-4 md:px-3 text-center">
                      <span className="text-[8px] md:text-xs text-muted-foreground">
                        -
                      </span>
                    </td>
                    <td className="py-2 px-2 md:py-4 md:px-3 text-center">
                      <span className="text-[8px] md:text-xs text-muted-foreground">
                        -
                      </span>
                    </td>
                    <td className="py-2 px-2 md:py-4 md:px-3 text-center">
                      <span className="text-[8px] md:text-xs text-muted-foreground">
                        -
                      </span>
                    </td>
                    <td className="py-2 px-2 md:py-4 md:px-3 text-center">
                      <span className="text-[8px] md:text-xs text-muted-foreground">
                        -
                      </span>
                    </td>
                    <td className="py-2 px-2 md:py-4 md:px-3 text-center">
                      <span className="text-[8px] md:text-xs text-muted-foreground">
                        -
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Booking Modal */}
      <AddBookingModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          // Remove action from URL
          const params = new URLSearchParams(searchParams.toString());
          params.delete("action");
          router.push(`/bookings?${params.toString()}`, { scroll: false });
        }}
        onSave={handleBookingCreate}
      />

      {/* Booking Detail Modal */}
      <BookingDetailModal
        isOpen={isDetailModalOpen}
        onClose={handleModalClose}
        booking={selectedBooking}
        onBookingUpdate={handleBookingUpdate}
        router={router}
        searchParams={searchParams}
      />

      {/* Fixed Scroll Buttons - CSS-only visibility */}
      <Button
        onClick={scrollToTop}
        size="sm"
        className="fixed right-6 bottom-20 z-50 h-10 w-10 rounded-full bg-crimson-red hover:bg-crimson-red/90 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 scroll-to-top-btn"
        title="Scroll to top"
      >
        <ChevronUp className="h-4 w-4" />
      </Button>
      <Button
        onClick={scrollToBottom}
        size="sm"
        className="fixed right-6 bottom-6 z-50 h-10 w-10 rounded-full bg-crimson-red hover:bg-crimson-red/90 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 scroll-to-bottom-btn"
        title="Scroll to bottom"
      >
        <ChevronDown className="h-4 w-4" />
      </Button>
    </div>
  );
}
