"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  FaUser,
  FaTimes,
  FaCog,
  FaHashtag,
  FaMapMarkerAlt,
  FaWallet,
  FaTag,
} from "react-icons/fa";
import { BsListUl, BsCalendarEvent } from "react-icons/bs";
import { MdEmail } from "react-icons/md";
import { HiTrendingUp } from "react-icons/hi";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Booking } from "@/types/bookings";
import { SheetColumn, TypeScriptFunction } from "@/types/sheet-management";
import { allBookingSheetColumns } from "@/app/functions/columns";
import { functionMap } from "@/app/functions/columns/functions-index";
import { functionExecutionService } from "@/services/function-execution-service";
import { typescriptFunctionsService } from "@/services/typescript-functions-service";
import { batchedWriter } from "@/services/batched-writer";
import ScheduledEmailService from "@/services/scheduled-email-service";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { isEqual, debounce } from "lodash";

interface EditBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onSave?: (updatedBooking: Booking) => void;
}

export default function EditBookingModal({
  isOpen,
  onClose,
  booking,
  onSave,
}: EditBookingModalProps) {
  const [columns, setColumns] = useState<SheetColumn[]>([]);
  const [availableFunctions, setAvailableFunctions] = useState<
    TypeScriptFunction[]
  >([]);
  const [isLoadingColumns, setIsLoadingColumns] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("");
  const [dynamicOptions, setDynamicOptions] = useState<
    Record<string, string[]>
  >({});

  // Debug: Log when dynamicOptions changes
  useEffect(() => {
    console.log("🔄 [DYNAMIC OPTIONS STATE CHANGED]:", dynamicOptions);
  }, [dynamicOptions]);

  // Form state
  const [formData, setFormData] = useState<Partial<Booking>>({});
  const [computingFields, setComputingFields] = useState<Set<string>>(
    new Set()
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Local editing state - tracks which fields are currently being edited (local first pattern)
  const [activeEditingFields, setActiveEditingFields] = useState<Set<string>>(
    new Set()
  );
  const [localFieldValues, setLocalFieldValues] = useState<Record<string, any>>(
    {}
  );
  // Track pending changes that haven't been saved to Firebase yet
  const [pendingChanges, setPendingChanges] = useState<Record<string, any>>({});
  // Track original values when editing starts to detect actual changes
  const [originalValues, setOriginalValues] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Loading state for email generation and sending
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [emailGenerationProgress, setEmailGenerationProgress] = useState<{
    type: "reservation" | "cancellation" | null;
    bookingId: string | null;
    action: "generating" | "sending" | "deleting" | null;
  }>({ type: null, bookingId: null, action: null });

  // Track previous values for detecting changes
  const prevGenerateEmailDraft = React.useRef<boolean | undefined>(undefined);
  const prevGenerateCancellationDraft = React.useRef<boolean | undefined>(
    undefined
  );
  const prevSendEmail = React.useRef<boolean | undefined>(undefined);
  const prevSendCancellationEmail = React.useRef<boolean | undefined>(
    undefined
  );
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const cancellationTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const sendEmailTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const sendCancellationEmailTimeoutRef = React.useRef<NodeJS.Timeout | null>(
    null
  );

  // Loading state for cleaning scheduled emails
  const [isCleaningScheduledEmails, setIsCleaningScheduledEmails] =
    useState(false);

  const { toast } = useToast();
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const isScrollingProgrammatically = React.useRef(false);

  // Debounce timer for function execution
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Real-time Firebase listener for booking updates (like BookingsDataGrid)
  useEffect(() => {
    if (!booking?.id || !isOpen) return;

    console.log(
      "🔍 [EDIT BOOKING MODAL] Setting up real-time booking listener for:",
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
            "📄 [EDIT BOOKING MODAL] Real-time booking update received"
          );

          // Update form data with real-time changes (LOCAL FIRST pattern like BookingsDataGrid)
          setFormData((prevFormData) => {
            const updatedData = { ...prevFormData };

            // Update all fields from Firebase, but be smart about it
            Object.keys(updatedBooking).forEach((key) => {
              const firebaseValue = updatedBooking[key as keyof Booking];
              const formValue = prevFormData[key as keyof Booking];

              // Find the column for this field
              const column = columns.find((col) => col.id === key);

              // LOCAL FIRST: Skip updating if user is actively editing this field
              if (activeEditingFields.has(key)) {
                console.log(
                  `🚫 [EDIT BOOKING MODAL] Skipping Firebase update for actively edited field: ${key}`
                );
                return;
              }

              // Always update function fields since they're computed externally
              if (column?.dataType === "function") {
                updatedData[key as keyof Booking] = firebaseValue;
              }
              // For other fields, only update if they're different (deep comparison)
              // This prevents overwriting user input while they're typing
              else if (!isEqual(firebaseValue, formValue)) {
                updatedData[key as keyof Booking] = firebaseValue;
              }
            });

            return updatedData;
          });
        }
      },
      (error) => {
        console.error(
          "🚨 [EDIT BOOKING MODAL] Real-time listener error:",
          error
        );
      }
    );

    return () => {
      console.log(
        "🧹 [EDIT BOOKING MODAL] Cleaning up real-time booking listener"
      );
      unsubscribe();
    };
  }, [booking?.id, isOpen, columns]);

  // Watch for generateEmailDraft changes and show progress modal
  useEffect(() => {
    if (!booking?.id || !isOpen) {
      prevGenerateEmailDraft.current = undefined;
      return;
    }

    const currentValue = formData.generateEmailDraft;
    const previousValue = prevGenerateEmailDraft.current;
    const emailDraftLink = formData.emailDraftLink;

    console.log("🔍 [GENERATE EMAIL DRAFT WATCHER]", {
      currentValue,
      previousValue,
      emailDraftLink,
      hasChanged: previousValue !== undefined && currentValue !== previousValue,
    });

    // Detect change from false to true (toggled ON)
    if (previousValue === false && currentValue === true) {
      console.log(
        "✅ [GENERATE EMAIL DRAFT] Toggled ON - showing generating modal"
      );

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setIsGeneratingEmail(true);
      setEmailGenerationProgress({
        type: "reservation",
        bookingId: booking.id,
        action: "generating",
      });

      // Set timeout to hide modal after 30 seconds
      timeoutRef.current = setTimeout(() => {
        console.log("⏱️ [GENERATE EMAIL DRAFT] Timeout reached - hiding modal");
        setIsGeneratingEmail(false);
        setEmailGenerationProgress({
          type: null,
          bookingId: null,
          action: null,
        });
      }, 30000);
    }

    // Detect change from true to false (toggled OFF)
    if (previousValue === true && currentValue === false) {
      console.log(
        "🗑️ [GENERATE EMAIL DRAFT] Toggled OFF - showing deleting modal"
      );

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setIsGeneratingEmail(true);
      setEmailGenerationProgress({
        type: "reservation",
        bookingId: booking.id,
        action: "deleting",
      });

      // Set timeout to hide modal after 30 seconds
      timeoutRef.current = setTimeout(() => {
        console.log("⏱️ [GENERATE EMAIL DRAFT] Timeout reached - hiding modal");
        setIsGeneratingEmail(false);
        setEmailGenerationProgress({
          type: null,
          bookingId: null,
          action: null,
        });
      }, 30000);
    }

    // If generateEmailDraft is true and we now have email draft link, hide modal
    if (
      currentValue === true &&
      emailDraftLink &&
      emailGenerationProgress.action === "generating"
    ) {
      console.log(
        "✅ [GENERATE EMAIL DRAFT] Draft link received - hiding modal"
      );

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setIsGeneratingEmail(false);
      setEmailGenerationProgress({
        type: null,
        bookingId: null,
        action: null,
      });
    }

    // If generateEmailDraft is false and draft link is cleared, hide modal
    if (
      currentValue === false &&
      !emailDraftLink &&
      emailGenerationProgress.action === "deleting"
    ) {
      console.log(
        "✅ [GENERATE EMAIL DRAFT] Draft link cleared - hiding modal"
      );

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setIsGeneratingEmail(false);
      setEmailGenerationProgress({
        type: null,
        bookingId: null,
        action: null,
      });
    }

    // Update previous value
    prevGenerateEmailDraft.current = currentValue;

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [
    formData.generateEmailDraft,
    formData.emailDraftLink,
    booking?.id,
    isOpen,
  ]);

  // Watch for generateCancellationDraft changes and show progress modal
  useEffect(() => {
    if (!booking?.id || !isOpen) {
      prevGenerateCancellationDraft.current = undefined;
      return;
    }

    const currentValue = formData.generateCancellationDraft;
    const previousValue = prevGenerateCancellationDraft.current;
    const cancellationDraftLink = formData.cancellationEmailDraftLink;

    console.log("🔍 [GENERATE CANCELLATION DRAFT WATCHER]", {
      currentValue,
      previousValue,
      cancellationDraftLink,
      hasChanged: previousValue !== undefined && currentValue !== previousValue,
    });

    // Detect change from false to true (toggled ON)
    if (previousValue === false && currentValue === true) {
      console.log(
        "✅ [GENERATE CANCELLATION DRAFT] Toggled ON - showing generating modal"
      );

      // Clear any existing timeout
      if (cancellationTimeoutRef.current) {
        clearTimeout(cancellationTimeoutRef.current);
      }

      setIsGeneratingEmail(true);
      setEmailGenerationProgress({
        type: "cancellation",
        bookingId: booking.id,
        action: "generating",
      });

      // Set timeout to hide modal after 30 seconds
      cancellationTimeoutRef.current = setTimeout(() => {
        console.log(
          "⏱️ [GENERATE CANCELLATION DRAFT] Timeout reached - hiding modal"
        );
        setIsGeneratingEmail(false);
        setEmailGenerationProgress({
          type: null,
          bookingId: null,
          action: null,
        });
      }, 30000);
    }

    // Detect change from true to false (toggled OFF)
    if (previousValue === true && currentValue === false) {
      console.log(
        "🗑️ [GENERATE CANCELLATION DRAFT] Toggled OFF - showing deleting modal"
      );

      // Clear any existing timeout
      if (cancellationTimeoutRef.current) {
        clearTimeout(cancellationTimeoutRef.current);
      }

      setIsGeneratingEmail(true);
      setEmailGenerationProgress({
        type: "cancellation",
        bookingId: booking.id,
        action: "deleting",
      });

      // Set timeout to hide modal after 30 seconds
      cancellationTimeoutRef.current = setTimeout(() => {
        console.log(
          "⏱️ [GENERATE CANCELLATION DRAFT] Timeout reached - hiding modal"
        );
        setIsGeneratingEmail(false);
        setEmailGenerationProgress({
          type: null,
          bookingId: null,
          action: null,
        });
      }, 30000);
    }

    // If generateCancellationDraft is true and we now have draft link, hide modal
    if (
      currentValue === true &&
      cancellationDraftLink &&
      emailGenerationProgress.action === "generating"
    ) {
      console.log(
        "✅ [GENERATE CANCELLATION DRAFT] Draft link received - hiding modal"
      );

      if (cancellationTimeoutRef.current) {
        clearTimeout(cancellationTimeoutRef.current);
      }

      setIsGeneratingEmail(false);
      setEmailGenerationProgress({
        type: null,
        bookingId: null,
        action: null,
      });
    }

    // If generateCancellationDraft is false and draft link is cleared, hide modal
    if (
      currentValue === false &&
      !cancellationDraftLink &&
      emailGenerationProgress.action === "deleting"
    ) {
      console.log(
        "✅ [GENERATE CANCELLATION DRAFT] Draft link cleared - hiding modal"
      );

      if (cancellationTimeoutRef.current) {
        clearTimeout(cancellationTimeoutRef.current);
      }

      setIsGeneratingEmail(false);
      setEmailGenerationProgress({
        type: null,
        bookingId: null,
        action: null,
      });
    }

    // Update previous value
    prevGenerateCancellationDraft.current = currentValue;

    // Cleanup timeout on unmount
    return () => {
      if (cancellationTimeoutRef.current) {
        clearTimeout(cancellationTimeoutRef.current);
      }
    };
  }, [
    formData.generateCancellationDraft,
    formData.cancellationEmailDraftLink,
    booking?.id,
    isOpen,
  ]);

  // Watch for sendEmail changes and show progress modal
  useEffect(() => {
    if (!booking?.id || !isOpen) {
      prevSendEmail.current = undefined;
      return;
    }

    const currentValue = formData.sendEmail;
    const previousValue = prevSendEmail.current;
    const sentEmailLink = formData.sentEmailLink;

    console.log("🔍 [SEND EMAIL WATCHER]", {
      currentValue,
      previousValue,
      sentEmailLink,
      hasChanged: previousValue !== undefined && currentValue !== previousValue,
    });

    // Detect change from false to true (toggled ON)
    if (previousValue === false && currentValue === true) {
      console.log("✅ [SEND EMAIL] Toggled ON - showing sending modal");

      // Clear any existing timeout
      if (sendEmailTimeoutRef.current) {
        clearTimeout(sendEmailTimeoutRef.current);
      }

      setIsGeneratingEmail(true);
      setEmailGenerationProgress({
        type: "reservation",
        bookingId: booking.id,
        action: "sending",
      });

      // Set timeout to hide modal after 30 seconds
      sendEmailTimeoutRef.current = setTimeout(() => {
        console.log("⏱️ [SEND EMAIL] Timeout reached - hiding modal");
        setIsGeneratingEmail(false);
        setEmailGenerationProgress({
          type: null,
          bookingId: null,
          action: null,
        });
      }, 30000);
    }

    // If sendEmail is true and we now have sent email link, hide modal
    if (
      currentValue === true &&
      sentEmailLink &&
      emailGenerationProgress.action === "sending"
    ) {
      console.log("✅ [SEND EMAIL] Sent email link received - hiding modal");

      if (sendEmailTimeoutRef.current) {
        clearTimeout(sendEmailTimeoutRef.current);
      }

      setIsGeneratingEmail(false);
      setEmailGenerationProgress({
        type: null,
        bookingId: null,
        action: null,
      });
    }

    // Update previous value
    prevSendEmail.current = currentValue;

    // Cleanup timeout on unmount
    return () => {
      if (sendEmailTimeoutRef.current) {
        clearTimeout(sendEmailTimeoutRef.current);
      }
    };
  }, [formData.sendEmail, formData.sentEmailLink, booking?.id, isOpen]);

  // Watch for sendCancellationEmail changes and show progress modal
  useEffect(() => {
    if (!booking?.id || !isOpen) {
      prevSendCancellationEmail.current = undefined;
      return;
    }

    const currentValue = formData.sendCancellationEmail;
    const previousValue = prevSendCancellationEmail.current;
    const sentCancellationEmailLink = formData.sentCancellationEmailLink;

    console.log("🔍 [SEND CANCELLATION EMAIL WATCHER]", {
      currentValue,
      previousValue,
      sentCancellationEmailLink,
      hasChanged: previousValue !== undefined && currentValue !== previousValue,
    });

    // Detect change from false to true (toggled ON)
    if (previousValue === false && currentValue === true) {
      console.log(
        "✅ [SEND CANCELLATION EMAIL] Toggled ON - showing sending modal"
      );

      // Clear any existing timeout
      if (sendCancellationEmailTimeoutRef.current) {
        clearTimeout(sendCancellationEmailTimeoutRef.current);
      }

      setIsGeneratingEmail(true);
      setEmailGenerationProgress({
        type: "cancellation",
        bookingId: booking.id,
        action: "sending",
      });

      // Set timeout to hide modal after 30 seconds
      sendCancellationEmailTimeoutRef.current = setTimeout(() => {
        console.log(
          "⏱️ [SEND CANCELLATION EMAIL] Timeout reached - hiding modal"
        );
        setIsGeneratingEmail(false);
        setEmailGenerationProgress({
          type: null,
          bookingId: null,
          action: null,
        });
      }, 30000);
    }

    // If sendCancellationEmail is true and we now have sent email link, hide modal
    if (
      currentValue === true &&
      sentCancellationEmailLink &&
      emailGenerationProgress.action === "sending"
    ) {
      console.log(
        "✅ [SEND CANCELLATION EMAIL] Sent email link received - hiding modal"
      );

      if (sendCancellationEmailTimeoutRef.current) {
        clearTimeout(sendCancellationEmailTimeoutRef.current);
      }

      setIsGeneratingEmail(false);
      setEmailGenerationProgress({
        type: null,
        bookingId: null,
        action: null,
      });
    }

    // Update previous value
    prevSendCancellationEmail.current = currentValue;

    // Cleanup timeout on unmount
    return () => {
      if (sendCancellationEmailTimeoutRef.current) {
        clearTimeout(sendCancellationEmailTimeoutRef.current);
      }
    };
  }, [
    formData.sendCancellationEmail,
    formData.sentCancellationEmailLink,
    booking?.id,
    isOpen,
  ]);

  // Initialize form data when modal opens
  useEffect(() => {
    if (booking && isOpen) {
      setFormData({ ...booking });
      setFieldErrors({});
    }
  }, [booking, isOpen]);

  // Load coded booking sheet columns and functions
  useEffect(() => {
    if (!isOpen) return;

    console.log(
      "🔍 [EDIT BOOKING MODAL] Loading coded columns and functions..."
    );
    setIsLoadingColumns(true);

    // Convert BookingSheetColumn[] to SheetColumn[] and inject function implementations
    const codedColumns: SheetColumn[] = allBookingSheetColumns.map(
      (col): SheetColumn => {
        const columnData = col.data;

        // Log select columns to check loadOptions
        if (columnData.dataType === "select" && columnData.id === "eventName") {
          console.log(
            "🔍 [EDIT BOOKING MODAL] Event Name column data:",
            columnData
          );
          console.log(
            "🔍 [EDIT BOOKING MODAL] Has loadOptions?",
            !!columnData.loadOptions
          );
        }

        // If this is a function column, inject the actual function implementation
        if (columnData.dataType === "function" && columnData.function) {
          const funcImpl = functionMap[columnData.function];
          if (funcImpl) {
            return {
              ...columnData,
              compiledFunction: funcImpl as (...args: any[]) => any,
            };
          } else {
            console.warn(
              `⚠️  Function ${columnData.function} not found in function map for column ${columnData.columnName}`
            );
          }
        }

        return columnData;
      }
    );

    console.log(
      `✅ [EDIT BOOKING MODAL] Loaded ${codedColumns.length} coded columns`
    );
    setColumns(codedColumns);
    setIsLoadingColumns(false);

    // Load dynamic options for select columns with loadOptions
    const loadDynamicOptions = async () => {
      const optionsMap: Record<string, string[]> = {};

      for (const col of codedColumns) {
        if (col.dataType === "select" && col.loadOptions) {
          try {
            console.log(
              `🔄 [EDIT BOOKING MODAL] Loading options for ${col.columnName}...`
            );
            const options = await col.loadOptions();
            console.log(
              `✅ [EDIT BOOKING MODAL] Loaded ${options.length} options for ${col.columnName}:`,
              options
            );
            optionsMap[col.id] = options;
          } catch (error) {
            console.error(
              `Failed to load options for ${col.columnName}:`,
              error
            );
            optionsMap[col.id] = col.options || [];
          }
        }
      }

      console.log(
        "📦 [EDIT BOOKING MODAL] All dynamic options loaded:",
        optionsMap
      );
      setDynamicOptions(optionsMap);
    };

    loadDynamicOptions();

    // Load available functions
    const loadFunctions = async () => {
      try {
        const functions = await typescriptFunctionsService.getAllFunctions();
        setAvailableFunctions(functions);
      } catch (error) {
        console.error("Failed to load functions:", error);
      }
    };

    loadFunctions();

    return () => {
      console.log("🧹 [EDIT BOOKING MODAL] Cleaning up subscriptions");

      // Clean up debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [isOpen]);

  // Build dependency graph: source columnId -> list of function columns depending on it
  const dependencyGraph = useMemo(() => {
    const map = new Map<string, SheetColumn[]>();
    columns.forEach((col) => {
      if (col.dataType === "function" && Array.isArray(col.arguments)) {
        col.arguments.forEach((arg) => {
          if (arg.columnReference) {
            // Skip "ID" and "Row" references since they're not column dependencies
            if (arg.columnReference !== "ID" && arg.columnReference !== "Row") {
              // Find the column ID for the referenced column name
              const refCol = columns.find(
                (c) => c.columnName === arg.columnReference
              );
              if (refCol) {
                const list = map.get(refCol.id) || [];
                list.push(col);
                map.set(refCol.id, list);
              }
            }
          }
          if (Array.isArray(arg.columnReferences)) {
            arg.columnReferences.forEach((ref) => {
              if (!ref) return;
              // Skip "ID" and "Row" references since they're not column dependencies
              if (ref !== "ID" && ref !== "Row") {
                // Find the column ID for the referenced column name
                const refCol = columns.find((c) => c.columnName === ref);
                if (refCol) {
                  const list = map.get(refCol.id) || [];
                  list.push(col);
                  map.set(refCol.id, list);
                }
              }
            });
          }
        });
      }
    });
    return map;
  }, [columns]);

  // Set first tab as active on load
  useEffect(() => {
    if (!booking || !isOpen || !columns.length) return;

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
  }, [isOpen, columns, booking, activeTab]);

  // Safe date conversion for Firebase Timestamps
  const safeDate = (value: any): Date => {
    if (value instanceof Date) return value;
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

  // Scroll to a specific parent tab
  const scrollToTab = (parentTab: string) => {
    const element = document.getElementById(`edit-tab-${parentTab}`);
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

  // Debounced scroll handler for better performance
  const debouncedScrollHandler = useCallback(
    debounce(() => {
      // Handle any scroll-related updates here if needed
    }, 16), // ~60fps
    []
  );

  // Debounced save indicator handler
  const debouncedSaveIndicator = useCallback(
    debounce(() => {
      setIsSaving(false);
      setLastSaved(new Date());
    }, 1000), // Show "saving" for 1 second after last change
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
        scrollContainerRef.current.querySelectorAll('[id^="edit-tab-"]');
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
          mostVisibleSection = section.id.replace("edit-tab-", "");
          maxVisibleArea = 1000; // Force this to be selected
          return;
        }

        // If at the top, select the first section
        if (isAtTop && index === 0) {
          mostVisibleSection = section.id.replace("edit-tab-", "");
          maxVisibleArea = 1000; // Force this to be selected
          return;
        }

        // Calculate visible area of the section relative to scroll container
        const visibleTop = Math.max(rect.top, containerRect.top + headerHeight);
        const visibleBottom = Math.min(rect.bottom, containerRect.bottom);
        const visibleHeight = Math.max(0, visibleBottom - visibleTop);

        if (visibleHeight > maxVisibleArea) {
          maxVisibleArea = visibleHeight;
          mostVisibleSection = section.id.replace("edit-tab-", "");
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

  // Execute single function and return result
  const executeFunction = React.useCallback(
    async (
      funcCol: SheetColumn,
      currentData: Partial<Booking>
    ): Promise<any> => {
      if (!funcCol.function || funcCol.dataType !== "function") return;

      // Check if this is an email generation or sending function
      const isEmailGenerationFunction =
        funcCol.function === "generateGmailDraftFunction" ||
        funcCol.function === "generateCancellationGmailDraftFunction";

      const isEmailSendingFunction =
        funcCol.function === "sendEmailDraftOnceFunction" ||
        funcCol.function === "sendCancellationEmailDraftOnceFunction";

      const isEmailFunction =
        isEmailGenerationFunction || isEmailSendingFunction;

      if (isEmailFunction) {
        // Show loading modal for email generation or sending
        setIsGeneratingEmail(true);

        let emailType: "reservation" | "cancellation" = "reservation";
        if (
          funcCol.function === "generateCancellationGmailDraftFunction" ||
          funcCol.function === "sendCancellationEmailDraftOnceFunction"
        ) {
          emailType = "cancellation";
        }

        // Determine if we're toggling off (deleting draft)
        let action: "generating" | "sending" | "deleting" = "generating";
        if (isEmailSendingFunction) {
          action = "sending";
        } else if (isEmailGenerationFunction) {
          // Check if toggling off by looking at the current value in formData
          const generateField =
            emailType === "reservation"
              ? "generateEmailDraft"
              : "generateCancellationDraft";
          const currentValue =
            currentData[generateField as keyof typeof currentData];
          const isTogglingOff = currentValue === false;
          action = isTogglingOff ? "deleting" : "generating";
        }

        setEmailGenerationProgress({
          type: emailType,
          bookingId: currentData.id || null,
          action: action,
        });
      }

      try {
        setComputingFields((prev) => new Set([...prev, funcCol.id]));

        // Build arguments and execute function
        const args = functionExecutionService.buildArgs(
          funcCol,
          currentData as any,
          columns
        );

        // Use longer timeout for email-sending and email-generating functions (30 seconds)
        // Regular functions timeout after 10 seconds
        const isEmailFunction =
          funcCol.function === "sendEmailDraftOnceFunction" ||
          funcCol.function === "sendReservationEmailDraftOnceFunction" ||
          funcCol.function === "sendCancellationEmailDraftOnceFunction" ||
          funcCol.function === "generateGmailDraftFunction" ||
          funcCol.function === "generateCancellationGmailDraftFunction";
        const timeout = isEmailFunction ? 30000 : 10000;

        const result = await functionExecutionService.executeFunction(
          funcCol.function,
          args,
          timeout
        );

        console.log(
          `[EXECUTE FUNCTION] ${funcCol.function} completed with result:`,
          {
            success: result.success,
            result: result.result,
            executionTime: result.executionTime,
          }
        );

        if (result.success) {
          return result.result;
        }
        return undefined;
      } catch (error) {
        console.error(`Error executing function ${funcCol.columnName}:`, error);
        return undefined;
      } finally {
        setComputingFields((prev) => {
          const newSet = new Set(prev);
          newSet.delete(funcCol.id);
          return newSet;
        });

        if (isEmailFunction) {
          // Hide loading modal after function completes
          setIsGeneratingEmail(false);
          setEmailGenerationProgress({
            type: null,
            bookingId: null,
            action: null,
          });
        }
      }
    },
    [columns]
  );

  // Immediate function execution with parallel direct dependents (like BookingsDataGrid)
  const executeDirectDependents = React.useCallback(
    async (changedColumnId: string, currentData: Partial<Booking>) => {
      try {
        // Find function columns that depend on the changed field
        const directDependents = dependencyGraph.get(changedColumnId) || [];

        console.log(`🔍 Execute dependents for ${changedColumnId}:`, {
          dependentsCount: directDependents.length,
          dependents: directDependents.map((d) => d.id),
          currentData: {
            [changedColumnId]: currentData[changedColumnId as keyof Booking],
            emailDraftLink: currentData.emailDraftLink,
            cancellationEmailDraftLink: currentData.cancellationEmailDraftLink,
          },
        });

        if (directDependents.length === 0) return currentData;

        let updatedData = { ...currentData };

        // Execute all direct dependents in parallel for speed (like BookingsDataGrid)
        const results = await Promise.all(
          directDependents.map(async (funcCol) => {
            if (funcCol.function && funcCol.dataType === "function") {
              try {
                const result = await executeFunction(funcCol, updatedData);
                return { columnId: funcCol.id, result };
              } catch (error) {
                console.error(
                  `Error executing function ${funcCol.columnName}:`,
                  error
                );
                return { columnId: funcCol.id, result: undefined };
              }
            }
            return { columnId: funcCol.id, result: undefined };
          })
        );

        // Apply results and queue Firebase updates
        let hasChanges = false;
        for (const { columnId, result } of results) {
          if (result !== undefined) {
            const oldValue = updatedData[columnId as keyof Booking];
            if (oldValue !== result) {
              updatedData[columnId as keyof Booking] = result;
              hasChanges = true;

              // Queue the computed result to Firebase
              if (booking?.id) {
                batchedWriter.queueFieldUpdate(booking.id, columnId, result);
              }
            }
          }
        }

        // If any results changed, recursively compute their dependents
        if (hasChanges) {
          for (const { columnId, result } of results) {
            if (result !== undefined) {
              const oldValue = currentData[columnId as keyof Booking];
              if (oldValue !== result) {
                updatedData = await executeDirectDependents(
                  columnId,
                  updatedData
                );
              }
            }
          }
        }

        return updatedData;
      } catch (error) {
        console.error(`Error in direct dependents execution:`, error);
        return currentData;
      }
    },
    [dependencyGraph, executeFunction, booking?.id]
  );

  // Debounced wrapper to avoid excessive calls while maintaining responsiveness
  const debouncedExecuteFunctions = React.useCallback(
    (changedColumnId: string, currentData: Partial<Booking>) => {
      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new timer for function execution (100ms for better responsiveness)
      debounceTimerRef.current = setTimeout(async () => {
        try {
          const updatedData = await executeDirectDependents(
            changedColumnId,
            currentData
          );

          // Update form data with all computed results
          setFormData(updatedData);
        } catch (error) {
          console.error(`Error in function execution:`, error);
        }
      }, 100); // Reduced to 100ms for better responsiveness like BookingsDataGrid
    },
    [executeDirectDependents]
  );

  const handleFieldChange = useCallback(
    (columnId: string, value: any) => {
      // LOCAL FIRST: Update all state in one batch to minimize re-renders
      // Only update if these haven't been set yet (first keystroke)
      setActiveEditingFields((prev) => {
        if (prev.has(columnId)) return prev;
        const newSet = new Set(prev);
        newSet.add(columnId);
        return newSet;
      });

      // Always update local values on keystroke - this is fine for performance
      setLocalFieldValues((prev) => {
        if (prev[columnId] === value) return prev;
        return { ...prev, [columnId]: value };
      });

      // Store the original value the first time we start editing this field
      setOriginalValues((prev) => {
        if (columnId in prev) return prev;
        return { ...prev, [columnId]: formData[columnId as keyof Booking] };
      });

      // Store pending change (will be saved on blur)
      setPendingChanges((prev) => {
        if (prev[columnId] === value) return prev;
        return { ...prev, [columnId]: value };
      });

      // Clear error for this field if it exists (only runs once)
      if (fieldErrors[columnId]) {
        setFieldErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[columnId];
          return newErrors;
        });
      }
    },
    [formData, fieldErrors]
  );

  // Get form value for a column (LOCAL FIRST pattern) - memoized for performance
  const getFormValue = useCallback(
    (column: SheetColumn): any => {
      // For function fields: ONLY use formData (Firebase source of truth), ignore local edits
      if (column.dataType === "function") {
        return formData[column.id as keyof Booking] || "";
      }

      // For editable fields: LOCAL FIRST - If user is actively editing this field, use local value
      if (activeEditingFields.has(column.id) && column.id in localFieldValues) {
        return localFieldValues[column.id];
      }

      // Otherwise use formData (which gets updated by Firebase)
      return formData[column.id as keyof Booking] || "";
    },
    [activeEditingFields, localFieldValues, formData]
  );

  // Handle when user finishes editing a field (LOCAL FIRST pattern)
  const handleFieldBlur = useCallback(
    (columnId: string) => {
      console.log(
        `📝 [EDIT BOOKING MODAL] Field editing finished: ${columnId}`
      );

      // Get pending change value
      const pendingValue = pendingChanges[columnId];
      const originalValue = originalValues[columnId];

      // Only save to Firebase if the value has actually changed from original
      if (pendingValue !== undefined && pendingValue !== originalValue) {
        console.log(
          `💾 [EDIT BOOKING MODAL] Saving to Firebase: ${columnId} = ${pendingValue}`
        );

        // Show saving indicator
        setIsSaving(true);
        debouncedSaveIndicator();

        // Queue update to Firebase for persistence
        if (booking?.id) {
          batchedWriter.queueFieldUpdate(booking.id, columnId, pendingValue);
        }

        // Create updated data with the new value
        const updatedData = {
          ...formData,
          [columnId]: pendingValue,
        };

        // Update formData with the new value for display
        setFormData(updatedData);

        // Execute dependent functions immediately using the updated data
        // No debounce here - execute immediately on blur for better UX
        executeDirectDependents(columnId, updatedData).then((finalData) => {
          if (finalData) {
            setFormData(finalData);
          }
        });
      }

      // Remove from pending changes
      setPendingChanges((prev) => {
        const newPending = { ...prev };
        delete newPending[columnId];
        return newPending;
      });

      // Remove from original values
      setOriginalValues((prev) => {
        const newOriginal = { ...prev };
        delete newOriginal[columnId];
        return newOriginal;
      });

      // Remove from active editing set immediately (no timeout)
      setActiveEditingFields((prev) => {
        const newSet = new Set(prev);
        newSet.delete(columnId);
        return newSet;
      });
      setLocalFieldValues((prev) => {
        const newValues = { ...prev };
        delete newValues[columnId];
        return newValues;
      });
    },
    [
      pendingChanges,
      originalValues,
      formData,
      booking?.id,
      debouncedSaveIndicator,
      executeDirectDependents,
    ]
  );

  // Handle key events during editing
  const handleFieldKeyDown = useCallback(
    (e: React.KeyboardEvent, columnId: string) => {
      // Find the column to check its type
      const column = columns.find((col) => col.id === columnId);

      if (e.key === "Enter") {
        // For date inputs, open the date picker instead of closing
        if (column?.dataType === "date") {
          const target = e.target as HTMLInputElement;
          if (target.showPicker && typeof target.showPicker === "function") {
            e.preventDefault();
            try {
              target.showPicker();
            } catch (error) {
              // Fallback: just focus the input if showPicker fails
              target.focus();
            }
          }
          return;
        }

        // For other inputs, prevent default and close
        e.preventDefault();

        // User is done editing this field - save changes on blur
        handleFieldBlur(columnId);

        // Remove focus from the input by blurring the active element
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }
      if (e.key === "Tab") {
        // Allow Tab to navigate naturally to next input
        // Just save the current field on blur (which will trigger automatically)
        // Don't prevent default - let browser handle Tab navigation
      }
      if (e.key === "Escape") {
        // Prevent default to avoid unwanted behavior
        e.preventDefault();

        // User cancelled editing - discard pending changes and revert to original value
        console.log(
          `🚫 [EDIT BOOKING MODAL] Discarding changes for: ${columnId}`
        );

        // Get the original value before editing started
        const originalValue =
          originalValues[columnId] ?? formData[columnId as keyof Booking];

        // Remove from pending changes without saving
        setPendingChanges((prev) => {
          const newPending = { ...prev };
          delete newPending[columnId];
          return newPending;
        });

        // Remove from original values
        setOriginalValues((prev) => {
          const newOriginal = { ...prev };
          delete newOriginal[columnId];
          return newOriginal;
        });

        // Remove from active editing fields
        setActiveEditingFields((prev) => {
          const newSet = new Set(prev);
          newSet.delete(columnId);
          return newSet;
        });

        // Remove from local field values
        setLocalFieldValues((prev) => {
          const newValues = { ...prev };
          delete newValues[columnId];
          return newValues;
        });

        // Revert to original value
        setFormData((prev) => ({ ...prev, [columnId]: originalValue }));

        // Remove focus from the input
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }
    },
    [handleFieldBlur, formData, originalValues]
  );

  // Check if column should be displayed
  const shouldDisplayColumn = (column: SheetColumn) => {
    // Skip columns that are not meant to be displayed in edit view
    if (column.columnName.toLowerCase().includes("delete")) return false;
    if (column.columnName.toLowerCase().includes("action")) return false;

    // Always show all fields in edit mode (including empty ones)
    return true;
  };

  // Render form field based on column type - memoized to prevent unnecessary re-renders
  const renderFormField = useCallback(
    (column: SheetColumn) => {
      const value = getFormValue(column);
      const isComputing = computingFields.has(column.id);
      const error = fieldErrors[column.id];
      const isFunction = column.dataType === "function";
      // Only disable function columns, allow editing of all other fields regardless of includeInForms
      const isReadOnly = isFunction;

      const baseClasses = cn(
        "w-full text-xs",
        error && "border-red-500",
        isReadOnly && "bg-muted cursor-not-allowed"
      );

      const fieldId = `field-${column.id}`;

      switch (column.dataType) {
        case "boolean":
          // Check if this is the "Send Email?" field and prevent toggling if no draft link exists
          const isSendEmailField =
            column.id === "sendEmail" || column.id === "sendCancellationEmail";
          const hasDraftLink = isSendEmailField
            ? column.id === "sendEmail"
              ? Boolean(formData.emailDraftLink)
              : Boolean(formData.cancellationEmailDraftLink)
            : true;

          return (
            <div className="flex items-center space-x-2">
              <Switch
                id={fieldId}
                checked={Boolean(value)}
                onCheckedChange={(checked) => {
                  console.log(
                    `🔘 Boolean field toggled: ${column.id} = ${checked}`
                  );
                  console.log(`📊 Current formData for draft link:`, {
                    emailDraftLink: formData.emailDraftLink,
                    cancellationEmailDraftLink:
                      formData.cancellationEmailDraftLink,
                  });

                  // Prevent toggling on if it's a send email field and there's no draft link
                  if (isSendEmailField && checked && !hasDraftLink) {
                    toast({
                      title: "Cannot Send Email",
                      description:
                        column.id === "sendEmail"
                          ? "Please generate an email draft first before sending."
                          : "Please generate a cancellation email draft first before sending.",
                      variant: "destructive",
                    });
                    return;
                  }

                  // Prevent toggling "Enable Payment Reminder" on if payment plan or payment method is missing
                  const isEnablePaymentReminderField =
                    column.id === "enablePaymentReminder";
                  if (isEnablePaymentReminderField && checked) {
                    const hasPaymentPlan = Boolean(formData.paymentPlan);
                    const hasPaymentMethod = Boolean(formData.paymentMethod);

                    if (!hasPaymentPlan || !hasPaymentMethod) {
                      toast({
                        title: "Cannot Enable Payment Reminder",
                        description:
                          "Please set Payment Plan and Payment Method before enabling payment reminders.",
                        variant: "destructive",
                      });
                      return;
                    }
                  }

                  // Prevent toggling "Generate Email Draft" on if payment plan or payment method exists
                  const isGenerateEmailDraftField =
                    column.id === "generateEmailDraft";
                  if (isGenerateEmailDraftField && checked) {
                    const hasPaymentPlan = Boolean(formData.paymentPlan);
                    const hasPaymentMethod = Boolean(formData.paymentMethod);

                    if (hasPaymentPlan || hasPaymentMethod) {
                      toast({
                        title: "Cannot Generate Reservation Email",
                        description:
                          "Payment Plan and Payment Method must be empty for reservation emails. Please clear them first.",
                        variant: "destructive",
                      });
                      return;
                    }
                  }

                  // Check if this is enablePaymentReminder being toggled OFF
                  const isEnablePaymentReminder =
                    column.id === "enablePaymentReminder";
                  const wasEnabled = Boolean(formData[column.id]);

                  if (
                    isEnablePaymentReminder &&
                    wasEnabled &&
                    !checked &&
                    booking?.id
                  ) {
                    // Toggle OFF: Clean up scheduled emails first
                    setIsCleaningScheduledEmails(true);

                    ScheduledEmailService.deletePaymentReminders(booking.id)
                      .then(() => {
                        // Now update the field
                        batchedWriter.queueFieldUpdate(
                          booking.id,
                          column.id,
                          checked
                        );
                        setFormData((prev) => ({
                          ...prev,
                          [column.id]: checked,
                        }));
                        setIsSaving(true);
                        debouncedSaveIndicator();

                        toast({
                          title: "Payment Reminders Disabled",
                          description:
                            "All scheduled payment reminder emails have been deleted.",
                        });
                      })
                      .catch((error) => {
                        console.error(
                          "Error cleaning scheduled emails:",
                          error
                        );
                        toast({
                          title: "Error",
                          description:
                            "Failed to clean up scheduled emails. Please try again.",
                          variant: "destructive",
                        });
                      })
                      .finally(() => {
                        setIsCleaningScheduledEmails(false);
                      });

                    return; // Don't continue with normal flow
                  }

                  // For switches, commit immediately to Firebase (discrete choice)
                  if (booking?.id) {
                    batchedWriter.queueFieldUpdate(
                      booking.id,
                      column.id,
                      checked
                    );
                  }
                  setFormData((prev) => ({ ...prev, [column.id]: checked }));
                  setIsSaving(true);
                  debouncedSaveIndicator();

                  // Mark this boolean field as computing to prevent rapid toggling
                  setComputingFields((prev) => new Set([...prev, column.id]));

                  // For email-related fields, invalidate cache to force fresh execution
                  if (
                    column.id === "generateEmailDraft" ||
                    column.id === "generateCancellationDraft" ||
                    column.id === "sendEmail" ||
                    column.id === "sendCancellationEmail"
                  ) {
                    // Find the dependent function column and invalidate by function name
                    const dependents = dependencyGraph.get(column.id) || [];
                    dependents.forEach((dep) => {
                      if (dep.function) {
                        console.log(
                          `🗑️ Invalidating cache for function: ${dep.function}`
                        );
                        functionExecutionService.invalidate(dep.function);
                      }
                    });
                  }

                  // Execute dependent functions immediately
                  executeDirectDependents(column.id, {
                    ...formData,
                    [column.id]: checked,
                  })
                    .then((finalData) => {
                      console.log(`✅ Dependents completed for ${column.id}`, {
                        finalData,
                        emailDraftLink: finalData?.emailDraftLink,
                        cancellationEmailDraftLink:
                          finalData?.cancellationEmailDraftLink,
                      });
                      if (finalData) {
                        // Force update formData with final results to prevent stale values
                        setFormData(finalData);
                      }
                    })
                    .finally(() => {
                      // Remove boolean field from computing state
                      setComputingFields((prev) => {
                        const newSet = new Set(prev);
                        newSet.delete(column.id);
                        return newSet;
                      });
                    });
                }}
                disabled={isReadOnly || isComputing}
              />
              <Label htmlFor={fieldId} className="text-xs font-medium">
                {value ? "Yes" : "No"}
              </Label>
            </div>
          );

        case "date":
          return (
            <Input
              id={fieldId}
              type="date"
              value={(() => {
                if (value) {
                  try {
                    let date: Date | null = null;
                    if (
                      value &&
                      typeof value === "object" &&
                      "toDate" in value &&
                      typeof (value as any).toDate === "function"
                    ) {
                      date = (value as any).toDate();
                    } else if (
                      value &&
                      typeof value === "object" &&
                      "seconds" in value &&
                      typeof (value as any).seconds === "number"
                    ) {
                      date = new Date((value as any).seconds * 1000);
                    } else if (typeof value === "number") {
                      if (value > 1000000000000) {
                        date = new Date(value);
                      } else {
                        date = new Date(value * 1000);
                      }
                    } else if (typeof value === "string") {
                      const numericValue = parseFloat(value);
                      if (!isNaN(numericValue)) {
                        if (numericValue > 1000000000000) {
                          date = new Date(numericValue);
                        } else {
                          date = new Date(numericValue * 1000);
                        }
                      } else {
                        date = new Date(value);
                      }
                    } else if (value instanceof Date) {
                      date = value;
                    }
                    if (date && !isNaN(date.getTime())) {
                      return date.toISOString().split("T")[0];
                    }
                  } catch (error) {
                    console.error("Date conversion error:", error);
                  }
                }
                return "";
              })()}
              onChange={(e) => {
                const dateValue = e.target.value
                  ? new Date(e.target.value)
                  : null;

                // For date picker, commit immediately to Firebase
                if (booking?.id) {
                  batchedWriter.queueFieldUpdate(
                    booking.id,
                    column.id,
                    dateValue
                  );
                }
                setFormData((prev) => ({ ...prev, [column.id]: dateValue }));
                setIsSaving(true);
                debouncedSaveIndicator();

                // Execute dependent functions immediately
                executeDirectDependents(column.id, {
                  ...formData,
                  [column.id]: dateValue,
                }).then((finalData) => {
                  if (finalData) {
                    setFormData(finalData);
                  }
                });
              }}
              onKeyDown={(e) => handleFieldKeyDown(e, column.id)}
              className={cn(
                baseClasses,
                "text-xs [&::-webkit-calendar-picker-indicator]:text-xs"
              )}
              disabled={isReadOnly || isComputing}
              autoComplete="off"
            />
          );

        case "select":
          return (
            <select
              id={fieldId}
              value={String(value || "")}
              onChange={(e) => {
                const newValue = e.target.value;
                // For select, commit immediately to Firebase (discrete choice)
                if (booking?.id) {
                  batchedWriter.queueFieldUpdate(
                    booking.id,
                    column.id,
                    newValue
                  );
                }
                setFormData((prev) => ({ ...prev, [column.id]: newValue }));
                setIsSaving(true);
                debouncedSaveIndicator();

                // Execute dependent functions immediately
                executeDirectDependents(column.id, {
                  ...formData,
                  [column.id]: newValue,
                }).then((finalData) => {
                  if (finalData) {
                    setFormData(finalData);
                  }
                });
              }}
              className={cn(
                "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_0.75rem_center] bg-no-repeat pr-10",
                error && "border-red-500",
                isReadOnly && "opacity-50"
              )}
              disabled={isReadOnly || isComputing}
            >
              {(() => {
                const options =
                  dynamicOptions[column.id] || column.options || [];
                if (column.id === "eventName") {
                  console.log("🎯 [RENDER] Event Name options:", {
                    dynamicOptions: dynamicOptions[column.id],
                    columnOptions: column.options,
                    finalOptions: options,
                  });
                }

                // Ensure current value is in the options list
                const currentValue = String(value || "");
                const hasCurrentValue = currentValue && currentValue !== "";
                const currentValueInOptions = options.includes(currentValue);
                const hasEmptyOption = options.includes("");

                // Build final options list
                const finalOptions = [...options];

                // Add current value if it's not in options and not empty
                if (hasCurrentValue && !currentValueInOptions) {
                  finalOptions.unshift(currentValue);
                }

                // Add placeholder option if no value selected AND no empty option exists
                if (!hasCurrentValue && !hasEmptyOption) {
                  finalOptions.unshift("");
                }

                return finalOptions.map((option, index) => (
                  <option key={option || `placeholder-${column.id}-${index}`} value={option}>
                    {option || `Select ${column.columnName}`}
                  </option>
                ));
              })()}
            </select>
          );

        case "number":
        case "currency":
          return (
            <Input
              id={fieldId}
              type="number"
              step={column.dataType === "currency" ? "0.01" : "any"}
              value={String(value || "")}
              onChange={(e) =>
                handleFieldChange(column.id, Number(e.target.value) || 0)
              }
              onBlur={() => handleFieldBlur(column.id)}
              onKeyDown={(e) => handleFieldKeyDown(e, column.id)}
              className={baseClasses}
              disabled={isReadOnly || isComputing}
              placeholder={`Enter ${column.columnName}`}
              autoComplete="off"
            />
          );

        case "function":
          return (
            <div className="flex items-center gap-2">
              <Input
                id={fieldId}
                value={String(value || "")}
                className={cn(
                  "w-full font-mono bg-background",
                  error && "border-red-500",
                  isComputing && "opacity-50"
                )}
                disabled={true}
                placeholder={isComputing ? "Computing..." : ""}
                autoComplete="off"
              />
              {isComputing && (
                <RefreshCw className="h-4 w-4 animate-spin text-royal-purple" />
              )}
              {!isComputing && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  tabIndex={-1}
                  onClick={async () => {
                    if (!booking?.id) return;
                    setComputingFields((prev) => new Set([...prev, column.id]));
                    try {
                      // First, recompute this specific function column
                      const result = await executeFunction(column, formData);

                      if (result !== undefined) {
                        // Update form data with the computed result
                        const updatedData = {
                          ...formData,
                          [column.id]: result,
                        };

                        // Queue Firebase update
                        batchedWriter.queueFieldUpdate(
                          booking.id,
                          column.id,
                          result
                        );

                        // Then compute dependent functions
                        const finalData = await executeDirectDependents(
                          column.id,
                          updatedData
                        );

                        if (finalData) {
                          setFormData(finalData);
                        }
                      }
                    } catch (error) {
                      console.error(
                        `Error recomputing ${column.columnName}:`,
                        error
                      );
                      toast({
                        title: "Recomputation Failed",
                        description: `Failed to recompute ${column.columnName}`,
                        variant: "destructive",
                      });
                    } finally {
                      setComputingFields((prev) => {
                        const newSet = new Set(prev);
                        newSet.delete(column.id);
                        return newSet;
                      });
                    }
                  }}
                  className="h-7 w-7 p-0"
                >
                  <RefreshCw className="h-3 w-3 text-royal-purple" />
                </Button>
              )}
            </div>
          );

        case "email":
          return (
            <Input
              id={fieldId}
              type="email"
              value={String(value || "")}
              onChange={(e) => handleFieldChange(column.id, e.target.value)}
              onBlur={() => handleFieldBlur(column.id)}
              onKeyDown={(e) => handleFieldKeyDown(e, column.id)}
              className={baseClasses}
              disabled={isReadOnly || isComputing}
              placeholder={`Enter ${column.columnName}`}
              autoComplete="off"
            />
          );

        default: // string and others
          return column.columnName.toLowerCase().includes("description") ||
            column.columnName.toLowerCase().includes("reason") ||
            column.columnName.toLowerCase().includes("notes") ? (
            <Textarea
              id={fieldId}
              value={String(value || "")}
              onChange={(e) => handleFieldChange(column.id, e.target.value)}
              onBlur={() => handleFieldBlur(column.id)}
              onKeyDown={(e) => handleFieldKeyDown(e, column.id)}
              className={baseClasses}
              disabled={isReadOnly || isComputing}
              placeholder={`Enter ${column.columnName}`}
              rows={3}
              autoComplete="off"
            />
          ) : (
            <Input
              id={fieldId}
              value={String(value || "")}
              onChange={(e) => handleFieldChange(column.id, e.target.value)}
              onBlur={() => handleFieldBlur(column.id)}
              onKeyDown={(e) => handleFieldKeyDown(e, column.id)}
              className={baseClasses}
              disabled={isReadOnly || isComputing}
              placeholder={`Enter ${column.columnName}`}
              autoComplete="off"
            />
          );
      }
    },
    [
      getFormValue,
      computingFields,
      fieldErrors,
      handleFieldChange,
      handleFieldBlur,
      handleFieldKeyDown,
      booking?.id,
      formData,
      setIsSaving,
      debouncedSaveIndicator,
      executeDirectDependents,
      executeFunction,
      toast,
      batchedWriter,
      dynamicOptions, // Add dynamicOptions to dependencies so select fields re-render when options load
    ]
  );

  // Handle close with computation check
  const handleClose = React.useCallback(() => {
    if (computingFields.size > 0) {
      toast({
        title: "Please Wait",
        description: `Please wait for ${computingFields.size} computation(s) to complete before closing.`,
        variant: "default",
      });
      return;
    }

    // Check if there are unsaved changes (active edits or pending changes)
    const hasActiveEdits = activeEditingFields.size > 0;
    const hasPendingChanges = Object.keys(pendingChanges).length > 0;

    if (hasActiveEdits || hasPendingChanges) {
      // Show confirmation alert
      const confirmed = window.confirm(
        "You have unsaved changes. Do you want to save them before closing?"
      );

      if (confirmed) {
        // Save pending changes before closing
        if (hasPendingChanges && booking?.id) {
          console.log(
            "💾 [EDIT BOOKING MODAL] Saving pending changes before close"
          );
          Object.entries(pendingChanges).forEach(([columnId, value]) => {
            batchedWriter.queueFieldUpdate(booking.id, columnId, value);
          });
        }
        // Close modal (will save changes)
      } else {
        // Discard changes and close
        console.log("🚫 [EDIT BOOKING MODAL] Discarding changes and closing");

        // Clear all local editing state
        setPendingChanges({});
        setOriginalValues({});
        setActiveEditingFields(new Set());
        setLocalFieldValues({});
      }
    }

    // Clear any pending debounced executions
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    onClose();
  }, [
    computingFields.size,
    activeEditingFields.size,
    pendingChanges,
    booking?.id,
    onClose,
    toast,
  ]);

  if (!booking) return null;

  // Group columns by parentTab
  const groupedColumns = columns.reduce((groups, column) => {
    if (!shouldDisplayColumn(column)) return groups;

    const parentTab = column.parentTab || "General";
    if (!groups[parentTab]) {
      groups[parentTab] = [];
    }
    groups[parentTab].push(column);
    return groups;
  }, {} as Record<string, SheetColumn[]>);

  // Sort columns within each group by order
  Object.keys(groupedColumns).forEach((tab) => {
    groupedColumns[tab].sort((a, b) => a.order - b.order);
  });

  // Sort parentTabs by the order they first appear in the columns
  const sortedParentTabs = Object.keys(groupedColumns).sort((a, b) => {
    const aFirstOrder = Math.min(...groupedColumns[a].map((col) => col.order));
    const bFirstOrder = Math.min(...groupedColumns[b].map((col) => col.order));
    return aFirstOrder - bFirstOrder;
  });

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose} modal={true}>
        <DialogContent
          className="max-w-5xl max-h-[90vh] min-h-[90vh] bg-background p-0 rounded-full overflow-hidden"
          onOpenAutoFocus={(e) => {
            // Prevent dialog from auto-focusing on open
            e.preventDefault();
          }}
        >
          <form
            autoComplete="off"
            onSubmit={(e) => e.preventDefault()}
            onKeyDown={(e) => {
              if (e.key === "Tab") {
                // Get all focusable inputs within the form (including selects, switches, and combobox triggers)
                const focusableElements = Array.from(
                  e.currentTarget.querySelectorAll<HTMLElement>(
                    'input:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), button[role="switch"]:not([disabled]):not([tabindex="-1"]), button[role="combobox"]:not([disabled]):not([tabindex="-1"])'
                  )
                );

                if (focusableElements.length === 0) return;

                const currentIndex = focusableElements.indexOf(
                  document.activeElement as HTMLElement
                );

                if (currentIndex === -1) return;

                e.preventDefault();
                e.stopPropagation();

                let nextIndex;
                if (e.shiftKey) {
                  // Shift+Tab: go backwards
                  nextIndex = currentIndex - 1;
                  if (nextIndex < 0) {
                    nextIndex = focusableElements.length - 1;
                  }
                } else {
                  // Tab: go forwards
                  nextIndex = currentIndex + 1;
                  if (nextIndex >= focusableElements.length) {
                    nextIndex = 0;
                  }
                }

                focusableElements[nextIndex]?.focus();
              }
            }}
            className="h-full flex flex-col"
            tabIndex={-1}
          >
            <DialogHeader
              className="sticky top-0 z-50 bg-background shadow-md border-b border-border/50 pb-3 pt-6 px-6"
              tabIndex={-1}
            >
              <div className="flex items-center justify-between">
                <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-crimson-red to-crimson-red/80 rounded-full rounded-br-none shadow-sm">
                    <FaCog className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <span className="block text-base">Edit Booking</span>
                    <span className="text-2xl font-mono font-semibold text-crimson-red block">
                      {booking.bookingId}
                    </span>
                    {/* Live Saving Indicator */}
                    <div className="flex items-center gap-2 mt-1">
                      {isSaving ? (
                        <div className="flex items-center gap-1 text-xs text-blue-600">
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          <span>Saving...</span>
                        </div>
                      ) : lastSaved ? (
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>Saved {lastSaved.toLocaleTimeString()}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          <span>Auto-save enabled</span>
                        </div>
                      )}
                    </div>
                  </div>
                </DialogTitle>
                <div className="flex items-center gap-2">
                  {/* Close Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    className={cn(
                      "h-8 w-8 p-0 hover:bg-gray-100",
                      computingFields.size > 0 &&
                        "opacity-50 cursor-not-allowed"
                    )}
                    disabled={computingFields.size > 0}
                    title={
                      computingFields.size > 0
                        ? `Please wait for ${computingFields.size} computation(s) to complete`
                        : "Close"
                    }
                  >
                    {computingFields.size > 0 ? (
                      <RefreshCw className="h-4 w-4 animate-spin text-royal-purple" />
                    ) : (
                      <FaTimes className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <div
              className="flex overflow-hidden max-h-[calc(90vh-120px)]"
              tabIndex={-1}
            >
              {/* Main Content */}
              <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto h-[95%] pl-6 pb-6 scrollbar-hide scroll-optimized"
                tabIndex={-1}
              >
                {isLoadingColumns ? (
                  <Card className="bg-background shadow-sm border border-border/50">
                    <CardContent className="p-6 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-crimson-red mx-auto mb-2"></div>
                      <p className="text-xs text-muted-foreground">
                        Loading...
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-6" tabIndex={-1}>
                    {sortedParentTabs.map((parentTab) => {
                      const IconComponent = getParentTabIcon(parentTab);
                      const filteredColumns =
                        groupedColumns[parentTab].filter(shouldDisplayColumn);

                      if (filteredColumns.length === 0) return null;

                      return (
                        <Card
                          key={parentTab}
                          id={`edit-tab-${parentTab}`}
                          className="bg-background shadow-sm border border-border/50 scroll-mt-4"
                          tabIndex={-1}
                        >
                          <CardHeader
                            className="pb-1 bg-crimson-red/10 border-2 border-crimson-red/20 border-red-500 py-1"
                            tabIndex={-1}
                          >
                            <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                              <div className="p-1 bg-crimson-red/10 rounded-full rounded-br-none">
                                <IconComponent className="h-3 w-3 text-crimson-red" />
                              </div>
                              {parentTab}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-0" tabIndex={-1}>
                            <div className="border border-purple-300">
                              {filteredColumns.map((column) => {
                                const error = fieldErrors[column.id];
                                const isFunction =
                                  column.dataType === "function";

                                return (
                                  <div
                                    key={column.id}
                                    className={cn(
                                      "flex items-center justify-between border border-purple-300 transition-colors",
                                      error && "bg-red-50/50",
                                      isFunction
                                        ? "bg-sunglow-yellow/20 hover:bg-sunglow-yellow/30 border-sunglow-yellow/30"
                                        : "hover:bg-muted/10"
                                    )}
                                  >
                                    <div className="flex items-center gap-2 min-w-0 w-[40%] px-3 py-2 border-r border-purple-300">
                                      <Label
                                        htmlFor={`field-${column.id}`}
                                        className="text-xs font-medium"
                                      >
                                        {column.columnName}
                                      </Label>
                                    </div>
                                    <div className="w-[60%] px-3 py-2">
                                      <div className="space-y-2">
                                        {renderFormField(column)}
                                        {error && (
                                          <p className="text-xs text-red-600">
                                            {error}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Navigation Sidebar */}
              {!isLoadingColumns && sortedParentTabs.length > 0 && (
                <div
                  className="w-48 border-l border-border/50 p-4"
                  tabIndex={-1}
                >
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Sections
                  </h3>
                  <nav className="space-y-1">
                    {sortedParentTabs.map((parentTab) => {
                      const IconComponent = getParentTabIcon(parentTab);
                      const filteredColumns =
                        groupedColumns[parentTab].filter(shouldDisplayColumn);

                      if (filteredColumns.length === 0) return null;

                      return (
                        <button
                          key={parentTab}
                          onClick={() => scrollToTab(parentTab)}
                          tabIndex={-1}
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
          </form>
        </DialogContent>
      </Dialog>

      {/* Loading Modal for Cleaning Scheduled Emails */}
      {isCleaningScheduledEmails && (
        <div className="fixed inset-0 z-[99990] flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-xl p-6 max-w-md w-full mx-4 border border-red-600/20">
            <div className="flex flex-col space-y-4">
              <div className="flex items-center space-x-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground">
                    Clearing Payment Reminders
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Removing all scheduled reminder emails...
                  </p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-y-1 bg-muted/30 rounded-md p-3">
                <p>• Deleting scheduled payment reminder emails</p>
                <p>• Clearing P1-P4 scheduled email links</p>
                <p>• Updating booking settings</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading Modal for Email Generation */}
      {isGeneratingEmail && (
        <div className="fixed inset-0 z-[99990] flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-xl p-6 max-w-md w-full mx-4 border border-royal-purple/20">
            <div className="flex flex-col space-y-4">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-royal-purple/20 border-t-royal-purple"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <MdEmail className="h-5 w-5 text-royal-purple" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground">
                    {emailGenerationProgress.action === "generating"
                      ? "Generating Email Draft"
                      : emailGenerationProgress.action === "deleting"
                      ? "Deleting Email Draft"
                      : "Sending Email"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {emailGenerationProgress.action === "generating"
                      ? emailGenerationProgress.type === "reservation"
                        ? "Creating reservation email draft in Gmail..."
                        : "Creating cancellation email draft in Gmail..."
                      : emailGenerationProgress.action === "deleting"
                      ? emailGenerationProgress.type === "reservation"
                        ? "Deleting reservation email draft if it exists..."
                        : "Deleting cancellation email draft if it exists..."
                      : emailGenerationProgress.type === "reservation"
                      ? "Sending reservation email to customer..."
                      : "Sending cancellation email to customer..."}
                  </p>
                </div>
              </div>
              {emailGenerationProgress.bookingId && (
                <div className="text-xs text-muted-foreground bg-muted/30 rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Booking ID:</span>
                    <span className="font-mono text-foreground font-medium">
                      {emailGenerationProgress.bookingId}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Email Type:</span>
                    <span className="font-medium text-foreground capitalize">
                      {emailGenerationProgress.type}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-center text-muted-foreground flex items-center justify-center gap-2">
                      <span className="inline-block animate-pulse">⏳</span>
                      This may take a few moments...
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
