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
import { bookingSheetColumnService } from "@/services/booking-sheet-columns-service";
import { functionExecutionService } from "@/services/function-execution-service";
import { typescriptFunctionsService } from "@/services/typescript-functions-service";
import { batchedWriter } from "@/services/batched-writer";

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

  // Form state
  const [formData, setFormData] = useState<Partial<Booking>>({});
  const [computingFields, setComputingFields] = useState<Set<string>>(
    new Set()
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { toast } = useToast();
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const isScrollingProgrammatically = React.useRef(false);

  // Debounce timer for function execution
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Initialize form data when booking changes
  useEffect(() => {
    if (booking && isOpen) {
      setFormData({ ...booking });
      setFieldErrors({});
    }
  }, [booking, isOpen]);

  // Sync form data with booking updates from Firebase (for function recalculations)
  useEffect(() => {
    if (booking && isOpen) {
      // Update form data when booking changes (e.g., from function recalculation)
      // Only update fields that aren't currently being edited
      setFormData((prevFormData) => {
        const updatedData = { ...prevFormData };

        // Update function fields and any fields that changed in Firebase
        Object.keys(booking).forEach((key) => {
          const bookingValue = booking[key as keyof Booking];
          const formValue = prevFormData[key as keyof Booking];

          // Find the column for this field
          const column = columns.find((col) => col.id === key);

          // Always update function fields since they're computed
          if (column?.dataType === "function") {
            updatedData[key as keyof Booking] = bookingValue;
          }
          // For other fields, only update if they're different and not currently focused
          else if (bookingValue !== formValue) {
            updatedData[key as keyof Booking] = bookingValue;
          }
        });

        return updatedData;
      });
    }
  }, [booking, isOpen, columns]); // Fetch booking sheet columns and functions
  useEffect(() => {
    if (!isOpen) return;

    console.log("🔍 [EDIT BOOKING MODAL] Fetching columns and functions...");
    setIsLoadingColumns(true);

    const unsubscribeColumns = bookingSheetColumnService.subscribeToColumns(
      (fetchedColumns) => {
        console.log(
          `✅ [EDIT BOOKING MODAL] Received ${fetchedColumns.length} columns`
        );
        setColumns(fetchedColumns);
        setIsLoadingColumns(false);
      }
    );

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
      unsubscribeColumns();

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
            // Skip "ID" reference since it's not a column dependency
            if (arg.columnReference !== "ID") {
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
              // Skip "ID" reference since it's not a column dependency
              if (ref !== "ID") {
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

      try {
        setComputingFields((prev) => new Set([...prev, funcCol.id]));

        // Build arguments and execute function
        const args = functionExecutionService.buildArgs(
          funcCol,
          currentData as any,
          columns
        );
        const result = await functionExecutionService.executeFunction(
          funcCol.function,
          args,
          10000
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
      }
    },
    [columns]
  );

  // Recursive function to compute dependencies with cascade effect (like BookingsDataGrid)
  const computeCascadingDependencies = React.useCallback(
    async (
      changedColumnId: string,
      currentData: Partial<Booking>,
      processedFunctions = new Set<string>()
    ): Promise<Partial<Booking>> => {
      let updatedData = { ...currentData };

      // Find function columns that depend on the changed field
      const dependentColumns = dependencyGraph.get(changedColumnId) || [];

      for (const funcCol of dependentColumns) {
        // Avoid infinite loops by tracking processed functions in this cascade
        if (processedFunctions.has(funcCol.id)) continue;
        processedFunctions.add(funcCol.id);

        if (funcCol.function && funcCol.dataType === "function") {
          const result = await executeFunction(funcCol, updatedData);

          if (result !== undefined) {
            const oldValue = updatedData[funcCol.id as keyof Booking];
            updatedData[funcCol.id as keyof Booking] = result;

            // Also queue the computed result to Firebase
            if (booking?.id) {
              batchedWriter.queueFieldUpdate(booking.id, funcCol.id, result);
            }

            // If the result changed, recursively compute its dependents (CASCADE EFFECT)
            if (oldValue !== result) {
              updatedData = await computeCascadingDependencies(
                funcCol.id,
                updatedData,
                processedFunctions
              );
            }
          }
        }
      }

      return updatedData;
    },
    [dependencyGraph, executeFunction, booking?.id]
  );

  // Debounced function execution with cascading dependencies
  const debouncedExecuteFunctions = React.useCallback(
    (changedColumnId: string, currentData: Partial<Booking>) => {
      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new timer for function execution (500ms to avoid excessive calls)
      debounceTimerRef.current = setTimeout(async () => {
        try {
          const updatedData = await computeCascadingDependencies(
            changedColumnId,
            currentData
          );

          // Update form data with all computed results
          setFormData(updatedData);
        } catch (error) {
          console.error(`Error in cascading function execution:`, error);
        }
      }, 500); // 500ms debounce to balance responsiveness and performance
    },
    [computeCascadingDependencies]
  );

  const handleFieldChange = useCallback(
    (columnId: string, value: any) => {
      // Update form data immediately for responsive UI
      const updatedData = {
        ...formData,
        [columnId]: value,
      };

      setFormData(updatedData);

      // Clear error for this field immediately
      if (fieldErrors[columnId]) {
        setFieldErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[columnId];
          return newErrors;
        });
      }

      // Queue update to Firebase for persistence
      if (booking?.id) {
        batchedWriter.queueFieldUpdate(booking.id, columnId, value);
      }

      // Trigger debounced function execution for immediate UI feedback
      debouncedExecuteFunctions(columnId, updatedData);
    },
    [formData, fieldErrors, booking?.id, debouncedExecuteFunctions]
  );

  // Get form value for a column
  const getFormValue = (column: SheetColumn): any => {
    return formData[column.id as keyof Booking] || "";
  };

  // Check if column should be displayed
  const shouldDisplayColumn = (column: SheetColumn) => {
    // Skip columns that are not meant to be displayed in edit view
    if (column.columnName.toLowerCase().includes("delete")) return false;
    if (column.columnName.toLowerCase().includes("action")) return false;

    // Always show all fields in edit mode (including empty ones)
    return true;
  };

  // Render form field based on column type
  const renderFormField = (column: SheetColumn) => {
    const value = getFormValue(column);
    const isComputing = computingFields.has(column.id);
    const error = fieldErrors[column.id];
    const isFunction = column.dataType === "function";
    const isReadOnly = isFunction || !column.includeInForms;

    const baseClasses = cn(
      "w-full",
      error && "border-red-500",
      isReadOnly && "bg-muted cursor-not-allowed"
    );

    const fieldId = `field-${column.id}`;

    switch (column.dataType) {
      case "boolean":
        return (
          <div className="flex items-center space-x-2">
            <Switch
              id={fieldId}
              checked={Boolean(value)}
              onCheckedChange={(checked) =>
                handleFieldChange(column.id, checked)
              }
              disabled={isReadOnly || isComputing}
            />
            <Label htmlFor={fieldId} className="text-sm font-medium">
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
              handleFieldChange(column.id, dateValue);
            }}
            className={baseClasses}
            disabled={isReadOnly || isComputing}
          />
        );

      case "select":
        return (
          <Select
            value={String(value || "")}
            onValueChange={(newValue) => handleFieldChange(column.id, newValue)}
            disabled={isReadOnly || isComputing}
          >
            <SelectTrigger className={baseClasses}>
              <SelectValue placeholder={`Select ${column.columnName}`} />
            </SelectTrigger>
            <SelectContent>
              {column.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            className={baseClasses}
            disabled={isReadOnly || isComputing}
            placeholder={`Enter ${column.columnName}`}
          />
        );

      case "function":
        return (
          <div className="flex items-center">
            <Input
              id={fieldId}
              value={String(value || "")}
              className={cn(
                "w-full font-mono bg-white",
                error && "border-red-500",
                isComputing && "opacity-50"
              )}
              disabled={true}
              placeholder={isComputing ? "Computing..." : "Computed value"}
            />
            {isComputing && (
              <RefreshCw className="ml-2 h-4 w-4 animate-spin text-royal-purple" />
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
            className={baseClasses}
            disabled={isReadOnly || isComputing}
            placeholder={`Enter ${column.columnName}`}
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
            className={baseClasses}
            disabled={isReadOnly || isComputing}
            placeholder={`Enter ${column.columnName}`}
            rows={3}
          />
        ) : (
          <Input
            id={fieldId}
            value={String(value || "")}
            onChange={(e) => handleFieldChange(column.id, e.target.value)}
            className={baseClasses}
            disabled={isReadOnly || isComputing}
            placeholder={`Enter ${column.columnName}`}
          />
        );
    }
  };

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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] bg-[#F2F0EE] p-0 rounded-full overflow-hidden">
        <DialogHeader className="sticky top-0 z-50 bg-white shadow-md border-b border-border/50 pb-3 pt-6 px-6">
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
              </div>
            </DialogTitle>
            <div className="flex items-center gap-2">
              {/* Close Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 hover:bg-gray-100"
              >
                <FaTimes className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex overflow-hidden max-h-[calc(90vh-120px)]">
          {/* Main Content */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto h-[95%] pl-6 pb-6 scrollbar-hide"
          >
            {isLoadingColumns ? (
              <Card className="bg-white shadow-sm border border-border/50">
                <CardContent className="p-6 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-crimson-red mx-auto mb-2"></div>
                  <p className="text-xs text-muted-foreground">Loading...</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {sortedParentTabs.map((parentTab) => {
                  const IconComponent = getParentTabIcon(parentTab);
                  const filteredColumns =
                    groupedColumns[parentTab].filter(shouldDisplayColumn);

                  if (filteredColumns.length === 0) return null;

                  return (
                    <Card
                      key={parentTab}
                      id={`edit-tab-${parentTab}`}
                      className="bg-white shadow-sm border border-border/50 scroll-mt-4"
                    >
                      <CardHeader className="pb-2 bg-crimson-red/10 border-2 border-crimson-red/20 border-red-500 py-2">
                        <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                          <div className="p-1 bg-crimson-red/10 rounded-full rounded-br-none">
                            <IconComponent className="h-4 w-4 text-crimson-red" />
                          </div>
                          {parentTab}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="border border-black">
                          {filteredColumns.map((column) => {
                            const error = fieldErrors[column.id];
                            const isFunction = column.dataType === "function";

                            return (
                              <div
                                key={column.id}
                                className={cn(
                                  "flex items-center justify-between border border-black transition-colors",
                                  error && "bg-red-50/50",
                                  isFunction
                                    ? "bg-royal-purple/10 hover:bg-royal-purple/20"
                                    : "hover:bg-muted/10"
                                )}
                              >
                                <div className="flex items-center gap-3 min-w-0 w-[40%] px-4 py-3 border-r border-black">
                                  <Label
                                    htmlFor={`field-${column.id}`}
                                    className="text-sm font-medium"
                                  >
                                    {column.columnName}
                                  </Label>
                                </div>
                                <div className="w-[60%] px-4 py-3">
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
            <div className="w-48 border-l border-border/50 p-4 overflow-y-auto scrollbar-hide">
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
    </Dialog>
  );
}
