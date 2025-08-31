"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
} from "@tanstack/react-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Settings,
  Plus,
  Eye,
  EyeOff,
  GripVertical,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import {
  SheetColumn,
  SheetData,
  TypeScriptFunction,
} from "@/types/sheet-management";
import { useSheetManagement } from "@/hooks/use-sheet-management";
import { typescriptFunctionsService } from "@/services/typescript-functions-service";
import { bookingService } from "@/services/booking-service";
import { demoBookingData } from "@/lib/demo-booking-data";
import { useToast } from "@/hooks/use-toast";
import ColumnSettingsModal from "./ColumnSettingsModal";
import AddColumnModal from "./AddColumnModal";

export default function BookingsSheet() {
  const { toast } = useToast();
  const {
    columns,
    data,
    updateColumn,
    deleteColumn,
    addColumn,
    updateData,
    updateRow,
    deleteRow,
  } = useSheetManagement();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    columnId: string;
  } | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [updatingCell, setUpdatingCell] = useState<{
    rowId: string;
    columnId: string;
  } | null>(null);

  // Performance optimization: Debounced editing
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [localData, setLocalData] = useState<SheetData[]>([]);
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, any>>(
    new Map()
  );

  // Force re-render state
  const [forceUpdate, setForceUpdate] = useState(0);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    rowId: string | null;
    x: number;
    y: number;
  }>({ isOpen: false, rowId: null, x: 0, y: 0 });

  // Handle clicking outside to close editing
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editingCell && !(event.target as Element).closest(".editing-cell")) {
        setEditingCell(null);
        setEditingValue("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [editingCell]);

  // Modal states
  const [columnSettingsModal, setColumnSettingsModal] = useState<{
    isOpen: boolean;
    column: SheetColumn | null;
  }>({ isOpen: false, column: null });
  const [addColumnModal, setAddColumnModal] = useState(false);
  const [availableFunctions, setAvailableFunctions] = useState<
    TypeScriptFunction[]
  >([]);
  const [isLoadingFunctions, setIsLoadingFunctions] = useState(false);

  // Fetch TypeScript functions
  useEffect(() => {
    const fetchFunctions = async () => {
      setIsLoadingFunctions(true);
      try {
        const functions = await typescriptFunctionsService.getAllFunctions();
        setAvailableFunctions(functions);
      } catch (error) {
        console.error("Failed to fetch TypeScript functions:", error);
      } finally {
        setIsLoadingFunctions(false);
      }
    };

    fetchFunctions();

    // Initialize demo data in Firestore if needed
    initializeDemoData();

    // Show ready toast
    toast({
      title: "🚀 Bookings Sheet Ready",
      description: "You can now edit cells by clicking on them",
      variant: "default",
    });
  }, []);

  // Initialize with demo data (now handled by Firestore)
  // useMemo(() => {
  //   if (data.length === 0) {
  //     updateData(demoBookingData);
  //   }
  // }, [data.length, updateData]);

  // Use localData for better performance (immediate UI updates)
  const tableData = localData.length > 0 ? localData : data;

  // Sync local data with hook data for performance optimization
  useEffect(() => {
    setLocalData(data);
  }, [data]);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Debug: Monitor data changes
  useEffect(() => {
    console.log(`📊 Data changed: ${data.length} rows`);
    console.log(
      `📊 Data order from Firestore:`,
      data.map((row) => row.id).join(", ")
    );
    data.forEach((row, index) => {
      console.log(
        `  Row ${index}: ID=${row.id}, Keys=${Object.keys(row).join(", ")}`
      );
      // Log specific values for debugging
      Object.keys(row).forEach((key) => {
        if (key !== "id" && key !== "createdAt" && key !== "updatedAt") {
          console.log(`    ${key}: ${row[key]} (type: ${typeof row[key]})`);
        }
      });
    });
  }, [data]);

  // Create table columns from sheet columns
  const tableColumns = useMemo<ColumnDef<SheetData>[]>(() => {
    // Add row number column first
    const rowNumberColumn: ColumnDef<SheetData> = {
      id: "rowNumber",
      header: () => (
        <div className="flex items-center justify-center h-12 w-16 bg-royal-purple/10 text-royal-purple px-2 py-2 rounded">
          <span className="font-medium text-xs">#</span>
        </div>
      ),
      accessorKey: "rowNumber",
      cell: ({ row }) => {
        // Use the Firestore document ID as the row number
        const rowNumber = parseInt(row.id);
        const isRowBeingEdited = editingCell?.rowId === row.id;

        return (
          <div
            className={`flex items-center justify-center h-12 w-16 px-2 text-sm font-mono transition-all duration-200 ${
              isRowBeingEdited
                ? "bg-royal-purple/20 text-royal-purple font-semibold border border-royal-purple/40"
                : "text-grey"
            }`}
          >
            {!isNaN(rowNumber) ? rowNumber : "-"}
          </div>
        );
      },
      enableSorting: false,
      enableColumnFilter: false,
      size: 64, // Fixed width for row numbers
    };

    const dataColumns = columns
      .sort((a, b) => a.order - b.order)
      .map((col) => ({
        id: col.id, // Use exact column ID
        header: () => (
          <div
            className={`flex items-center justify-between group h-12 w-full px-3 py-2 rounded transition-all duration-200 ${
              editingCell?.columnId === col.id
                ? "bg-royal-purple/30 border border-royal-purple/50 shadow-sm"
                : "bg-royal-purple/10"
            } text-royal-purple`}
            style={{
              minWidth: `${col.width || 150}px`,
              maxWidth: `${col.width || 150}px`,
            }}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="font-medium truncate" title={col.columnName}>
                {col.columnName}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity text-royal-purple hover:bg-royal-purple/20 flex-shrink-0"
              onClick={() => openColumnSettings(col)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        ),
        accessorKey: col.id, // Use exact column ID
        cell: ({ row, column }) => {
          const value = row.getValue(column.id);
          console.log(
            `🔍 Cell render: Row ${row.id}, Column ${column.id}, Value:`,
            value,
            `(type: ${typeof value}, isNull: ${value === null}, isUndefined: ${
              value === undefined
            })`
          );
          const columnDef = columns.find((c) => c.id === column.id);

          if (!columnDef) return null;

          if (
            editingCell?.rowId === row.id &&
            editingCell?.columnId === column.id
          ) {
            const isUpdating =
              updatingCell?.rowId === row.id &&
              updatingCell?.columnId === column.id;

            // Show date picker for date columns
            if (columnDef.dataType === "date") {
              return (
                <div className="relative editing-cell">
                  <Input
                    type="date"
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onBlur={() =>
                      handleCellEdit(row.id, column.id, editingValue)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleCellEdit(row.id, column.id, editingValue);
                      } else if (e.key === "Escape") {
                        setEditingCell(null);
                      }
                    }}
                    autoFocus
                    disabled={isUpdating}
                    className={`h-8 border-royal-purple/20 focus:border-royal-purple focus:ring-royal-purple/20 ${
                      isUpdating ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  />
                  {isUpdating && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                      <div className="w-4 h-4 border-2 border-royal-purple border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
              );
            }

            // Show regular input for other column types
            return (
              <div className="relative editing-cell">
                <Input
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onBlur={() => handleCellEdit(row.id, column.id, editingValue)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCellEdit(row.id, column.id, editingValue);
                    } else if (e.key === "Escape") {
                      setEditingCell(null);
                    }
                  }}
                  autoFocus
                  disabled={isUpdating}
                  className={`h-8 border-royal-purple/20 focus:border-royal-purple focus:ring-royal-purple/20 ${
                    isUpdating ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                />
                {isUpdating && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                    <div className="w-4 h-4 border-2 border-royal-purple border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            );
          }

          return (
            <div
              className={`h-12 w-full px-2 flex items-center cursor-pointer transition-all duration-200 relative ${
                editingCell?.rowId === row.id &&
                editingCell?.columnId === column.id
                  ? "bg-royal-purple/20 border border-royal-purple/40 shadow-sm"
                  : "hover:bg-royal-purple/5"
              }`}
              style={{
                minWidth: `${columnDef.width || 150}px`,
                maxWidth: `${columnDef.width || 150}px`,
              }}
              onClick={() => {
                setEditingCell({
                  rowId: row.id,
                  columnId: column.id, // Use the actual column.id from the table
                });

                // Format date for date picker input
                if (columnDef.dataType === "date" && value) {
                  try {
                    let date: Date;

                    // Check if it's a Firestore Timestamp
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
                      // Handle Firestore Timestamp with seconds
                      date = new Date((value as any).seconds * 1000);
                    } else {
                      // Handle string dates or other formats
                      date = new Date(value as string | number | Date);
                    }

                    if (!isNaN(date.getTime())) {
                      setEditingValue(date.toISOString().split("T")[0]);
                    } else {
                      setEditingValue("");
                    }
                  } catch {
                    setEditingValue("");
                  }
                } else {
                  setEditingValue(value?.toString() || "");
                }
              }}
            >
              <div
                className="w-full truncate text-sm"
                title={value?.toString() || ""}
              >
                {renderCellValue(value, columnDef)}
              </div>
              {/* Show pending update indicator */}
              {pendingUpdates.has(`${row.id}.${column.id}`) && (
                <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              )}
            </div>
          );
        },

        enableSorting: true,
        enableColumnFilter: true,
      }));

    // Return row number column + data columns
    return [rowNumberColumn, ...dataColumns];
  }, [columns, editingCell, editingValue, tableData, forceUpdate]);

  const table = useReactTable({
    data: tableData,
    columns: tableColumns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),

    initialState: {
      pagination: {
        pageSize: 10,
      },
      // No initial sorting - data comes pre-sorted from Firestore
    },
  });

  const renderCellValue = (value: any, column: SheetColumn) => {
    if (value === null || value === undefined || value === "") return "-";

    const dataType = column.dataType;
    const columnId = column.id;

    switch (dataType) {
      case "boolean":
        return value ? "Yes" : "No";
      case "date":
        // Handle Firestore Timestamps and various date formats
        try {
          let date: Date;

          // Check if it's a Firestore Timestamp
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
            // Handle Firestore Timestamp with seconds
            date = new Date((value as any).seconds * 1000);
          } else {
            // Handle string dates or other formats
            date = new Date(value as string | number | Date);
          }

          if (isNaN(date.getTime())) {
            return "Invalid Date";
          }

          return date.toLocaleDateString();
        } catch (error) {
          console.error("Error parsing date:", value, error);
          return "Invalid Date";
        }
      case "currency":
        return `$${parseFloat(value).toLocaleString()}`;
      case "select":
        return value;
      case "function":
        return columnId === "delete" ? (
          <Button
            variant="destructive"
            size="sm"
            className="bg-crimson-red hover:bg-crimson-red/90"
          >
            Delete
          </Button>
        ) : (
          value
        );
      default:
        return value.toString();
    }
  };

  const handleCellEdit = async (
    rowId: string,
    columnId: string,
    value: string
  ) => {
    try {
      // Clear any existing debounce timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Update local state immediately for instant UI feedback
      const updatedLocalData = localData.map((row) =>
        row.id === rowId ? { ...row, [columnId]: value } : row
      );
      setLocalData(updatedLocalData);

      // Add to pending updates
      const updateKey = `${rowId}.${columnId}`;
      setPendingUpdates((prev) => new Map(prev.set(updateKey, value)));

      // Debounce the Firestore update
      debounceTimeoutRef.current = setTimeout(async () => {
        try {
          setUpdatingCell({ rowId, columnId });

          // Find the column to determine data type
          const column = columns.find((col) => col.id === columnId);
          if (!column) {
            console.error(`❌ Column not found: ${columnId}`);
            return;
          }

          // Process the value based on column data type
          let processedValue: any = value;
          switch (column.dataType) {
            case "number":
            case "currency":
              processedValue = parseFloat(value) || 0;
              break;
            case "boolean":
              processedValue = value === "true" || value === "1";
              break;
            case "date":
              processedValue = value ? new Date(value) : null;
              break;
            default:
              processedValue = value;
          }

          console.log(`📊 Processed value:`, processedValue);

          // Update Firestore
          await bookingService.updateBookingField(
            rowId,
            columnId,
            processedValue
          );
          console.log(`✅ Firestore updated successfully`);

          // Remove from pending updates
          setPendingUpdates((prev) => {
            const newMap = new Map(prev);
            newMap.delete(updateKey);
            return newMap;
          });

          // Show success toast
          toast({
            title: "✅ Cell Updated Successfully",
            description: `Updated ${column.columnName} in row ${rowId}`,
          });
        } catch (error) {
          console.error(`❌ Failed to update cell:`, error);

          // Remove from pending updates on error
          setPendingUpdates((prev) => {
            const newMap = new Map(prev);
            newMap.delete(updateKey);
            return newMap;
          });

          // Show error toast
          toast({
            title: "❌ Failed to Update Cell",
            description: `Error: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
            variant: "destructive",
          });
        } finally {
          setUpdatingCell(null);
        }
      }, 500); // 500ms debounce delay

      // Clear editing state immediately for better UX
      setEditingCell(null);
      setEditingValue("");
    } catch (error) {
      console.error(`❌ Failed to handle cell edit:`, error);
    }
  };

  const openColumnSettings = (column: SheetColumn) => {
    setColumnSettingsModal({ isOpen: true, column });
  };

  const handleColumnSave = (updatedColumn: SheetColumn) => {
    updateColumn(updatedColumn);
  };

  const handleColumnDelete = (columnId: string) => {
    deleteColumn(columnId);
  };

  const handleAddColumn = (newColumn: Omit<SheetColumn, "id">) => {
    addColumn(newColumn);
  };

  // Initialize demo data in Firestore if needed
  const initializeDemoData = async () => {
    try {
      // Check if we have any data in Firestore
      const existingBookings = await bookingService.getAllBookings();

      if (existingBookings.length === 0) {
        console.log("📝 No existing bookings found, initializing demo data...");

        // Create demo bookings in Firestore with numeric IDs
        for (let i = 0; i < demoBookingData.length; i++) {
          const demoBooking = demoBookingData[i];
          const rowNumber = (i + 1).toString(); // Use 1, 2, 3, etc.

          await bookingService.createOrUpdateBooking(rowNumber, {
            ...demoBooking,
            id: rowNumber,
          });
        }

        console.log("✅ Demo data initialized in Firestore");

        // Show success toast
        toast({
          title: "📊 Demo Data Initialized",
          description: `${demoBookingData.length} demo bookings created successfully`,
          variant: "default",
        });
      } else {
        console.log(
          `📊 Found ${existingBookings.length} existing bookings in Firestore`
        );
      }
    } catch (error) {
      console.error("❌ Failed to initialize demo data:", error);

      // Show error toast
      toast({
        title: "❌ Failed to Initialize Demo Data",
        description: `Error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
    }
  };

  // Handle adding a new row
  const handleAddNewRow = async () => {
    try {
      // Get the next available row number
      const nextRowNumber = await bookingService.getNextRowNumber();
      const newRowId = nextRowNumber.toString();

      // Create a new empty booking with minimal defaults
      const newBooking: SheetData = {
        id: newRowId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Create the new booking in Firestore with the row number as ID
      await bookingService.createOrUpdateBooking(newRowId, newBooking);

      // Also update local state for immediate UI feedback
      updateData([...data, newBooking]);

      // Show success toast
      toast({
        title: "✅ New Row Added",
        description: `Row ${newRowId} created successfully`,
        variant: "default",
      });

      console.log("✅ New booking row added with ID:", newRowId);
    } catch (error) {
      console.error("❌ Failed to add new row:", error);

      // Show error toast
      toast({
        title: "❌ Failed to Add New Row",
        description: `Error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
    }
  };

  // Handle clearing a row (keeping document but clearing fields)
  const handleDeleteRow = async (rowId: string) => {
    try {
      console.log(`🧹 Starting to clear row ${rowId}...`);

      // Clear all fields from the document in Firestore (keep the document)
      await bookingService.clearBookingFields(rowId);

      // Don't manually update local state - let the real-time listener handle it
      // The clearBookingFields method will update Firestore, and the listener will update the UI

      // Show success toast
      toast({
        title: "🗑️ Row Cleared",
        description: `Row ${rowId} fields cleared successfully (document preserved)`,
        variant: "default",
      });

      console.log("✅ Row fields cleared:", rowId);
    } catch (error) {
      console.error("❌ Failed to clear row fields:", error);

      // Show error toast
      toast({
        title: "❌ Failed to Clear Row",
        description: `Row ${rowId}, Error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
    } finally {
      setContextMenu({ isOpen: false, rowId: null, x: 0, y: 0 });
    }
  };

  const toggleColumnVisibility = (columnId: string) => {
    setColumnVisibility((prev) => ({
      ...prev,
      [columnId]: !prev[columnId],
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-creative-midnight font-hk-grotesk">
            Bookings Sheet
          </h2>
          <p className="text-grey">
            Manage your bookings data with customizable columns
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setAddColumnModal(true)}
            className="flex items-center gap-2 border-royal-purple/20 text-royal-purple hover:bg-royal-purple/10 hover:border-royal-purple transition-all duration-200"
          >
            <Plus className="h-4 w-4" />
            Add Column
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="border border-royal-purple/20 shadow-lg">
        <CardHeader className="bg-light-grey/50 border-b border-royal-purple/20">
          <CardTitle className="flex items-center gap-2 text-creative-midnight">
            <Filter className="h-5 w-5 text-royal-purple" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-royal-purple/60" />
              <Input
                placeholder="Search all columns..."
                value={globalFilter ?? ""}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-10 border-royal-purple/20 focus:border-royal-purple focus:ring-royal-purple/20"
              />
            </div>
            <Select
              value={Math.max(
                table.getState().pagination.pageSize,
                10
              ).toString()}
              onValueChange={(value) => {
                const newPageSize = Math.max(Number(value), 10);
                table.setPageSize(newPageSize);
              }}
            >
              <SelectTrigger className="border-royal-purple/20 focus:border-royal-purple focus:ring-royal-purple/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={pageSize.toString()}>
                    Show {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 border-royal-purple/20 text-royal-purple hover:bg-royal-purple/10 hover:border-royal-purple transition-all duration-200"
                >
                  <Eye className="h-4 w-4" />
                  Columns
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {table.getAllLeafColumns().map((column) => {
                  return (
                    <DropdownMenuItem
                      key={column.id}
                      className="capitalize"
                      onSelect={(e) => e.preventDefault()}
                    >
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={column.getIsVisible()}
                          onChange={column.getToggleVisibilityHandler()}
                          className="rounded"
                        />
                        <span>
                          {column.id.replace("col-", "Column ") || column.id}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Sheet Table */}
      <Card className="border border-royal-purple/20 shadow-lg">
        <CardHeader className="bg-light-grey/50 border-b border-royal-purple/20">
          <CardTitle className="text-creative-midnight">
            Bookings Data
          </CardTitle>
          <CardDescription className="text-grey">
            Showing {table.getFilteredRowModel().rows.length} of {data.length}{" "}
            rows with numeric IDs (1, 2, 3...){" "}
            {table.getFilteredRowModel().rows.length < 10 &&
              `(${
                10 - table.getFilteredRowModel().rows.length
              } empty rows for layout)`}
            {pendingUpdates.size > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse mr-1"></span>
                {pendingUpdates.size} pending update
                {pendingUpdates.size !== 1 ? "s" : ""}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border border-royal-purple/20 overflow-x-auto">
            <Table className="border border-royal-purple/20 min-w-full table-fixed">
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="bg-light-grey/30">
                    {headerGroup.headers.map((header) => {
                      // Handle row number column header
                      if (header.id === "rowNumber") {
                        return (
                          <TableHead
                            key={header.id}
                            className="relative border border-royal-purple/20 p-0"
                            style={{
                              minWidth: "64px",
                              maxWidth: "64px",
                              width: "64px",
                            }}
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </TableHead>
                        );
                      }

                      const columnDef = columns.find((c) => c.id === header.id);
                      return (
                        <TableHead
                          key={header.id}
                          className="relative border border-royal-purple/20 p-0"
                          style={{
                            minWidth: `${columnDef?.width || 150}px`,
                            maxWidth: `${columnDef?.width || 150}px`,
                            width: `${columnDef?.width || 150}px`,
                          }}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {(() => {
                  const visibleRows = table.getRowModel().rows;
                  const minRows = 10;
                  const rowsToShow = Math.max(visibleRows.length, minRows);

                  // Show actual data rows with stable ordering by numeric ID
                  const dataRows = visibleRows
                    .map((row, index) => ({ row, index }))
                    .sort((a, b) => {
                      // Sort by numeric ID to maintain stable order
                      const aId = parseInt(a.row.id);
                      const bId = parseInt(b.row.id);
                      if (isNaN(aId) && isNaN(bId)) return 0;
                      if (isNaN(aId)) return 1;
                      if (isNaN(bId)) return -1;
                      return aId - bId;
                    })
                    .map(({ row, index }) => {
                      // Debug: log the actual row order
                      console.log(
                        `📋 Rendering row: ID=${row.id}, Display Index=${index}, Firestore ID=${row.id}`
                      );
                      return (
                        <TableRow
                          key={`row-${row.id}`}
                          data-state={row.getIsSelected() && "selected"}
                          className={`border-b border-royal-purple/20 transition-colors duration-200 ${
                            index % 2 === 0 ? "bg-white" : "bg-light-grey/20"
                          } hover:bg-royal-purple/5`}
                          onContextMenu={(e) => {
                            e.preventDefault();

                            // Show context menu toast
                            toast({
                              title: "🖱️ Context Menu Opened",
                              description: `Row ${row.id} - Right-click for options`,
                              variant: "default",
                            });

                            setContextMenu({
                              isOpen: true,
                              rowId: row.id,
                              x: e.clientX,
                              y: e.clientY,
                            });
                          }}
                        >
                          {row.getVisibleCells().map((cell) => {
                            const columnDef = columns.find(
                              (c) => c.id === cell.column.id
                            );
                            return (
                              <TableCell
                                key={cell.id}
                                className="border border-royal-purple/20 p-0"
                                style={{
                                  minWidth: `${columnDef?.width || 150}px`,
                                  maxWidth: `${columnDef?.width || 150}px`,
                                  width: `${columnDef?.width || 150}px`,
                                }}
                              >
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    });

                  // Add empty rows to reach minimum
                  const emptyRows = [];
                  for (let i = visibleRows.length; i < rowsToShow; i++) {
                    const isFirstEmptyRow = i === visibleRows.length;
                    emptyRows.push(
                      <TableRow
                        key={`empty-${i}`}
                        className={`border-b border-royal-purple/20 ${
                          i % 2 === 0 ? "bg-white" : "bg-light-grey/20"
                        } ${isFirstEmptyRow ? "opacity-100" : "opacity-60"}`}
                      >
                        {table
                          .getAllLeafColumns()
                          .map((column, columnIndex) => {
                            // Handle row number column
                            if (column.id === "rowNumber") {
                              // Calculate the actual row number for empty rows
                              const actualRowNumber =
                                visibleRows.length +
                                (i - visibleRows.length + 1);
                              return (
                                <TableCell
                                  key={column.id}
                                  className="border border-royal-purple/20 p-0"
                                  style={{
                                    minWidth: "64px",
                                    maxWidth: "64px",
                                    width: "64px",
                                  }}
                                >
                                  <div className="h-12 w-16 px-2 flex items-center justify-center text-sm text-grey/30 font-mono">
                                    {actualRowNumber}
                                  </div>
                                </TableCell>
                              );
                            }

                            const columnDef = columns.find(
                              (c) => c.id === column.id
                            );
                            return (
                              <TableCell
                                key={column.id}
                                className="border border-royal-purple/20 p-0"
                                style={{
                                  minWidth: `${columnDef?.width || 150}px`,
                                  maxWidth: `${columnDef?.width || 150}px`,
                                  width: `${columnDef?.width || 150}px`,
                                }}
                              >
                                <div className="h-12 w-full px-2 flex items-center">
                                  {isFirstEmptyRow && columnIndex === 1 ? (
                                    // Plus button in second column (after row number) of first empty row
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleAddNewRow()}
                                      className="h-8 w-8 p-0 border-royal-purple/20 text-royal-purple hover:bg-royal-purple/10 hover:border-royal-purple transition-all duration-200"
                                      title="Add new booking"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  ) : (
                                    <div className="w-full text-sm text-grey/30">
                                      {/* Empty cell - shows table structure */}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            );
                          })}
                      </TableRow>
                    );
                  }

                  return [...dataRows, ...emptyRows];
                })()}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between space-x-2 py-4 px-6">
            <div className="flex-1 text-sm text-grey">
              {table.getFilteredSelectedRowModel().rows.length} of{" "}
              {table.getFilteredRowModel().rows.length} row(s) selected.
            </div>
            <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium text-creative-midnight">
                  Rows per page
                </p>
                <Select
                  value={`${table.getState().pagination.pageSize}`}
                  onValueChange={(value) => {
                    table.setPageSize(Number(value));
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px] border-royal-purple/20 focus:border-royal-purple focus:ring-royal-purple/20">
                    <SelectValue
                      placeholder={table.getState().pagination.pageSize}
                    />
                  </SelectTrigger>
                  <SelectContent side="top">
                    {[10, 20, 30, 40, 50].map((pageSize) => (
                      <SelectItem key={pageSize} value={`${pageSize}`}>
                        {pageSize}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex w-[100px] items-center justify-center text-sm font-medium text-creative-midnight">
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount()}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  className="hidden h-8 w-8 p-0 lg:flex border-royal-purple/20 text-royal-purple hover:bg-royal-purple/10 hover:border-royal-purple"
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                >
                  <span className="sr-only">Go to first page</span>
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0 border-royal-purple/20 text-royal-purple hover:bg-royal-purple/10 hover:border-royal-purple"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <span className="sr-only">Go to previous page</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0 border-royal-purple/20 text-royal-purple hover:bg-royal-purple/10 hover:border-royal-purple"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <span className="sr-only">Go to next page</span>
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="hidden h-8 w-8 p-0 lg:flex border-royal-purple/20 text-royal-purple hover:bg-royal-purple/10 hover:border-royal-purple"
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                >
                  <span className="sr-only">Go to last page</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <ColumnSettingsModal
        column={columnSettingsModal.column}
        isOpen={columnSettingsModal.isOpen}
        onClose={() => setColumnSettingsModal({ isOpen: false, column: null })}
        onSave={handleColumnSave}
        onDelete={handleColumnDelete}
        availableFunctions={availableFunctions}
        existingColumns={columns}
      />

      <AddColumnModal
        isOpen={addColumnModal}
        onClose={() => setAddColumnModal(false)}
        onAdd={handleAddColumn}
        existingColumns={columns}
        availableFunctions={availableFunctions}
      />

      {/* Context Menu */}
      {contextMenu.isOpen && (
        <div
          className="fixed z-50 bg-white border border-royal-purple/20 rounded-md shadow-lg py-1 min-w-[160px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          <button
            onClick={() =>
              contextMenu.rowId && handleDeleteRow(contextMenu.rowId)
            }
            className="w-full px-4 py-2 text-left text-sm text-crimson-red hover:bg-crimson-red/10 flex items-center gap-2 transition-colors duration-200"
          >
            <Trash2 className="h-4 w-4" />
            Clear Row Fields
          </button>
        </div>
      )}

      {/* Click outside to close context menu */}
      {contextMenu.isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() =>
            setContextMenu({ isOpen: false, rowId: null, x: 0, y: 0 })
          }
        />
      )}
    </div>
  );
}
