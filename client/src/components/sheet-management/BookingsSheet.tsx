"use client";

import { useState, useMemo, useCallback, useEffect, useRef, memo } from "react";
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
  HelpCircle,
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
import { functionExecutionService } from "@/services/function-execution-service";
import { batchedWriter } from "@/services/batched-writer";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Editable cell with per-cell local state to avoid table-wide rerenders on keystrokes
type EditableCellProps = {
  rowId: string;
  columnId: string;
  columnDef: SheetColumn;
  value: any;
  onCommit: (value: string) => void;
  onCancel: () => void;
};

const EditableCell = memo(function EditableCell({
  rowId,
  columnId,
  columnDef,
  value,
  onCommit,
  onCancel,
}: EditableCellProps) {
  // Format initial value based on type (date, etc.)
  const getInitial = useCallback(() => {
    if (columnDef.dataType === "date") {
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
        } else if (value) {
          date = new Date(value as string | number | Date);
        }
        if (date && !isNaN(date.getTime()))
          return date.toISOString().split("T")[0];
      } catch {
        // ignore
      }
      return "";
    }
    return value?.toString?.() ?? "";
  }, [columnDef.dataType, value]);

  const [local, setLocal] = useState<string>(getInitial);

  // Keep local when row/col switches
  useEffect(() => {
    setLocal(getInitial());
  }, [getInitial, rowId, columnId]);

  const commit = useCallback(() => {
    onCommit(local);
  }, [local, onCommit]);

  const cancel = useCallback(() => {
    onCancel();
  }, [onCancel]);

  if (columnDef.dataType === "date") {
    return (
      <div className="relative editing-cell">
        <Input
          type="date"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            else if (e.key === "Escape") cancel();
          }}
          autoFocus
          className="h-8 border-royal-purple/20 focus:border-royal-purple focus:ring-royal-purple/20"
        />
      </div>
    );
  }

  return (
    <div className="relative editing-cell">
      <Input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          else if (e.key === "Escape") cancel();
        }}
        autoFocus
        className="h-8 border-royal-purple/20 focus:border-royal-purple focus:ring-royal-purple/20"
      />
    </div>
  );
});

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
  // Remove global editing value to avoid table-wide rerenders

  // Local state for optimistic updates (prevents re-renders)
  const [localData, setLocalData] = useState<SheetData[]>([]);

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
  const [isRecomputing, setIsRecomputing] = useState(false);

  // Helper: map column color to light background + hover classes for body cells
  const getColumnTintClasses = useCallback(
    (color: SheetColumn["color"] | undefined): string => {
      const map: Record<string, { base: string; hover: string }> = {
        purple: {
          base: "bg-royal-purple/5",
          hover: "hover:bg-royal-purple/10",
        },
        blue: { base: "bg-blue-50", hover: "hover:bg-blue-50" },
        green: { base: "bg-green-50", hover: "hover:bg-green-50" },
        yellow: { base: "bg-yellow-50", hover: "hover:bg-yellow-50" },
        orange: { base: "bg-orange-50", hover: "hover:bg-orange-50" },
        red: { base: "bg-red-50", hover: "hover:bg-red-50" },
        pink: { base: "bg-pink-50", hover: "hover:bg-pink-50" },
        cyan: { base: "bg-cyan-50", hover: "hover:bg-cyan-50" },
        gray: { base: "bg-gray-100", hover: "hover:bg-gray-100" },
        none: { base: "", hover: "hover:bg-royal-purple/5" },
      };
      const key = color || "none";
      const chosen = map[key] || map.none;
      return `${chosen.base} ${chosen.hover}`.trim();
    },
    []
  );

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

  // Use local data for optimistic updates, fallback to hook data
  const tableData = localData.length > 0 ? localData : data;

  // Initialize and sync local data with hook data
  useEffect(() => {
    setLocalData(data);
  }, [data]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup function
    };
  }, []);

  // Monitor data changes (simplified for performance)
  useEffect(() => {
    // Only log when data length changes significantly
    if (data.length > 0) {
      console.log(`📊 BookingSheet loaded with ${data.length} rows`);
    }
  }, [data.length]);

  // Create table columns from sheet columns
  const tableColumns = useMemo<ColumnDef<SheetData>[]>(() => {
    // Add row number column first
    const rowNumberColumn: ColumnDef<SheetData> = {
      id: "rowNumber",
      header: () => (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center h-12 w-16 bg-royal-purple/10 text-royal-purple px-2 py-2 rounded">
              <span className="font-medium text-xs">#</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>Row</TooltipContent>
        </Tooltip>
      ),
      accessorKey: "rowNumber",
      cell: ({ row }) => {
        // Use the Firestore document ID as the row number
        const rowNumber = parseInt(row.id);
        const isRowBeingEdited = editingCell?.rowId === row.id;

        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={`flex items-center justify-center h-12 w-16 px-2 text-sm font-mono transition-all duration-200 ${
                  isRowBeingEdited
                    ? "bg-royal-purple/20 text-royal-purple font-semibold border border-royal-purple/40"
                    : "text-grey"
                }`}
              >
                {!isNaN(rowNumber) ? rowNumber : "-"}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              Row {!isNaN(rowNumber) ? rowNumber : row.id}
            </TooltipContent>
          </Tooltip>
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
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={`flex items-center justify-between group h-12 w-full px-3 py-2 rounded transition-all duration-200 ${
                  editingCell?.columnId === col.id
                    ? "bg-royal-purple/30 border border-royal-purple/50 shadow-sm"
                    : "bg-transparent"
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
            </TooltipTrigger>
            <TooltipContent>{col.columnName}</TooltipContent>
          </Tooltip>
        ),
        accessorKey: col.id, // Use exact column ID
        cell: ({ row, column }) => {
          const value = row.getValue(column.id);
          const columnDef = columns.find((c) => c.id === column.id);

          if (!columnDef) return null;

          if (
            editingCell?.rowId === row.id &&
            editingCell?.columnId === column.id
          ) {
            // Render memoized per-cell editor
            return (
              <EditableCell
                rowId={row.id}
                columnId={column.id}
                columnDef={columnDef}
                value={value}
                onCommit={(val) => handleCellEdit(row.id, column.id, val)}
                onCancel={handleCellCancel}
              />
            );
          }

          // For boolean columns, always show a checkbox
          if (columnDef.dataType === "boolean") {
            return (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`h-12 w-full px-2 flex items-center justify-center transition-all duration-200 relative ${
                      editingCell?.rowId === row.id &&
                      editingCell?.columnId === column.id
                        ? "bg-royal-purple/20 border border-royal-purple/40 shadow-sm"
                        : getColumnTintClasses(columnDef.color)
                    }`}
                    style={{
                      minWidth: `${columnDef.width || 150}px`,
                      maxWidth: `${columnDef.width || 150}px`,
                      position: "relative",
                      zIndex: 5,
                    }}
                  >
                    <div className="relative flex items-center justify-center w-full gap-2">
                      <input
                        type="checkbox"
                        checked={!!value}
                        onChange={(e) => {
                          // Update the cell value directly when checkbox changes
                          handleCellEdit(
                            row.id,
                            column.id,
                            e.target.checked.toString()
                          );
                        }}
                        className="w-5 h-5 text-royal-purple bg-white border-2 border-royal-purple/30 rounded focus:ring-offset-0 cursor-pointer transition-all duration-200 hover:border-royal-purple/50 checked:bg-royal-purple checked:border-royal-purple disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-royal-purple/40"
                        title={
                          value ? "Uncheck to set to No" : "Check to set to Yes"
                        }
                        aria-label={`${columnDef.columnName}: ${
                          value ? "Yes" : "No"
                        }`}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            const newValue = !value;
                            handleCellEdit(
                              row.id,
                              column.id,
                              newValue.toString()
                            );
                          }
                        }}
                      />
                      <span
                        className={`text-sm font-medium transition-colors duration-200 select-none ${
                          value
                            ? "text-royal-purple font-semibold"
                            : "text-gray-500"
                        }`}
                      >
                        {value ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>{value ? "Yes" : "No"}</TooltipContent>
              </Tooltip>
            );
          }

          // For select columns, always show a dropdown
          if (columnDef.dataType === "select") {
            return (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`h-12 w-full px-2 flex items-center transition-all duration-200 relative ${
                      editingCell?.rowId === row.id &&
                      editingCell?.columnId === column.id
                        ? "bg-royal-purple/20 border border-royal-purple/40 shadow-sm"
                        : getColumnTintClasses(columnDef.color)
                    }`}
                    style={{
                      minWidth: `${columnDef.width || 150}px`,
                      maxWidth: `${columnDef.width || 150}px`,
                      position: "relative",
                      zIndex: 5,
                    }}
                  >
                    <div
                      className="relative w-full"
                      style={{ position: "relative", zIndex: 15 }}
                    >
                      {columnDef.options && columnDef.options.length > 0 ? (
                        <Select
                          value={value?.toString() || ""}
                          onValueChange={(newValue) => {
                            // Update the cell value directly when selection changes
                            handleCellEdit(row.id, column.id, newValue);
                          }}
                        >
                          <SelectTrigger
                            className={`h-8 border-royal-purple/20 focus:border-royal-purple text-sm transition-colors duration-200 focus:ring-2 focus:ring-royal-purple/20 ${
                              value
                                ? "bg-royal-purple/5 border-royal-purple/40 text-royal-purple font-medium"
                                : "bg-white hover:bg-royal-purple/5 text-gray-500"
                            }`}
                          >
                            <SelectValue
                              placeholder="Select option"
                              className={
                                !value ? "text-gray-400" : "text-royal-purple"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-royal-purple/20 shadow-lg max-h-60 z-50">
                            {columnDef.options.map((option) => (
                              <SelectItem
                                key={option}
                                value={option}
                                className={`text-sm transition-colors duration-200 ${
                                  option === value
                                    ? "bg-royal-purple/20 text-royal-purple font-medium"
                                    : "hover:bg-royal-purple/10 focus:bg-royal-purple/20 focus:text-royal-purple"
                                }`}
                              >
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="h-8 w-full flex items-center justify-center text-sm text-gray-400 bg-gray-50 border border-gray-200 rounded cursor-not-allowed">
                          No options available
                        </div>
                      )}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>{value ? String(value) : "-"}</TooltipContent>
              </Tooltip>
            );
          }

          // For date columns, always show a date picker input
          if (columnDef.dataType === "date") {
            return (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`h-12 w-full px-2 flex items-center transition-all duration-200 relative ${
                      editingCell?.rowId === row.id &&
                      editingCell?.columnId === column.id
                        ? "bg-royal-purple/20 border border-royal-purple/40 shadow-sm"
                        : getColumnTintClasses(columnDef.color)
                    }`}
                    style={{
                      minWidth: `${columnDef.width || 150}px`,
                      maxWidth: `${columnDef.width || 150}px`,
                      position: "relative",
                      zIndex: 5,
                    }}
                  >
                    <div
                      className="relative w-full"
                      style={{ position: "relative", zIndex: 15 }}
                    >
                      <Input
                        type="date"
                        min="1900-01-01"
                        max="2100-12-31"
                        value={(() => {
                          // Format current value for date picker
                          if (value) {
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
                                date = new Date(
                                  value as string | number | Date
                                );
                              }

                              if (!isNaN(date.getTime())) {
                                return date.toISOString().split("T")[0];
                              }
                            } catch {
                              // Fallback to empty string
                            }
                          }
                          return "";
                        })()}
                        onChange={(e) => {
                          // Validate the date before updating
                          const dateValue = e.target.value;
                          if (
                            dateValue &&
                            !isNaN(new Date(dateValue).getTime())
                          ) {
                            // Update the cell value directly when date changes
                            handleCellEdit(row.id, column.id, dateValue);
                          }
                        }}
                        onBlur={(e) => {
                          // Validate on blur as well
                          const dateValue = e.target.value;
                          if (
                            dateValue &&
                            !isNaN(new Date(dateValue).getTime())
                          ) {
                            handleCellEdit(row.id, column.id, dateValue);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const dateValue = e.currentTarget.value;
                            if (
                              dateValue &&
                              !isNaN(new Date(dateValue).getTime())
                            ) {
                              handleCellEdit(row.id, column.id, dateValue);
                            }
                          }
                        }}
                        onClick={(e) => {
                          // Ensure the date picker popover can appear
                          e.stopPropagation();

                          // Try multiple approaches to show the date picker
                          if (e.currentTarget.showPicker) {
                            try {
                              e.currentTarget.showPicker();
                            } catch (error) {
                              // Fallback: ensure the input is focused and try to trigger the date picker
                              e.currentTarget.focus();
                              // Small delay to ensure focus is set
                              setTimeout(() => {
                                e.currentTarget.click();
                              }, 10);
                            }
                          } else {
                            // Fallback: ensure the input is focused and try to trigger the date picker
                            e.currentTarget.focus();
                            // Small delay to ensure focus is set
                            setTimeout(() => {
                              e.currentTarget.click();
                            }, 10);
                          }
                        }}
                        className={`h-8 border-royal-purple/20 focus:border-royal-purple focus:ring-royal-purple/20 text-sm transition-colors duration-200 pr-8 cursor-pointer ${
                          value
                            ? "bg-royal-purple/5 border-royal-purple/40"
                            : "bg-white hover:bg-royal-purple/5"
                        } focus:bg-white focus:ring-2 focus:ring-royal-purple/20 ${
                          !value ? "text-gray-400" : "text-gray-900"
                        }`}
                        placeholder={value ? "" : "Select date"}
                        title={
                          value
                            ? `Current date: ${renderCellValue(
                                value,
                                columnDef
                              )}`
                            : "Click to select a date"
                        }
                        aria-label={`Date for ${columnDef.columnName}`}
                        style={{ zIndex: 10 }}
                        autoComplete="off"
                        data-date-picker="true"
                      />
                      {/* Calendar icon indicator - clickable to open date picker */}
                      {/* <div 
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 cursor-pointer z-20"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Focus the input and try to show the date picker
                      const input = e.currentTarget.parentElement?.querySelector('input[type="date"]') as HTMLInputElement;
                      if (input) {
                        input.focus();
                        // Try to show the native date picker
                        if (input.showPicker) {
                          input.showPicker();
                        } else {
                          // Fallback: click the input to trigger the date picker
                          input.click();
                        }
                      }
                    }}
                    title="Click to open date picker"
                  >
                    <svg
                      className={`w-4 h-4 transition-colors duration-200 ${
                        value ? "text-royal-purple" : "text-royal-purple/40"
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                    </svg>
                  </div> */}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {renderCellValue(value, columnDef)}
                </TooltipContent>
              </Tooltip>
            );
          }

          // Function columns: render computed value, non-editable
          if (columnDef.dataType === "function") {
            if (columnDef.id === "delete") {
              return (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={`h-12 w-full px-2 flex items-center transition-all duration-200 relative ${
                        editingCell?.rowId === row.id &&
                        editingCell?.columnId === column.id
                          ? "bg-royal-purple/20 border border-royal-purple/40 shadow-sm"
                          : getColumnTintClasses(columnDef.color)
                      }`}
                      style={{
                        minWidth: `${columnDef.width || 150}px`,
                        maxWidth: `${columnDef.width || 150}px`,
                      }}
                    >
                      <Button
                        variant="destructive"
                        size="sm"
                        className="bg-crimson-red hover:bg-crimson-red/90"
                        onClick={() => handleDeleteRow(row.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Clear row fields</TooltipContent>
                </Tooltip>
              );
            }

            return (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`h-12 w-full px-2 flex items-center transition-all duration-200 relative ${
                      editingCell?.rowId === row.id &&
                      editingCell?.columnId === column.id
                        ? "bg-royal-purple/20 border border-royal-purple/40 shadow-sm"
                        : getColumnTintClasses(columnDef.color)
                    }`}
                    style={{
                      minWidth: `${columnDef.width || 150}px`,
                      maxWidth: `${columnDef.width || 150}px`,
                    }}
                    // Non-editable
                    onClick={(e) => e.stopPropagation()}
                    title="Computed cell"
                  >
                    <div
                      className="w-full truncate text-sm"
                      title={value?.toString() || ""}
                    >
                      {renderCellValue(value, columnDef)}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {value === undefined || value === null || value === ""
                    ? "-"
                    : String(value)}
                </TooltipContent>
              </Tooltip>
            );
          }

          // For other column types, show the regular clickable cell
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`h-12 w-full px-2 flex items-center cursor-pointer transition-all duration-200 relative ${
                    editingCell?.rowId === row.id &&
                    editingCell?.columnId === column.id
                      ? "bg-royal-purple/20 border border-royal-purple/40 shadow-sm"
                      : getColumnTintClasses(columnDef.color)
                  }`}
                  style={{
                    minWidth: `${columnDef.width || 150}px`,
                    maxWidth: `${columnDef.width || 150}px`,
                  }}
                  onClick={() => handleCellClick(row.id, column.id)}
                >
                  <div className="w-full truncate text-sm">
                    {renderCellValue(value, columnDef)}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {value === undefined || value === null || value === ""
                  ? "-"
                  : String(value)}
              </TooltipContent>
            </Tooltip>
          );
        },

        enableSorting: true,
        enableColumnFilter: true,
      }));

    // Return row number column + data columns
    return [rowNumberColumn, ...dataColumns];
  }, [columns, editingCell]);

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

  // Helper: deep-ish equality via JSON fallback
  const isEqual = useCallback((a: any, b: any) => {
    if (a === b) return true;
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }, []);

  // Compute one function column for a single row
  const computeFunctionForRow = useCallback(
    async (row: SheetData, funcCol: SheetColumn): Promise<any> => {
      if (!funcCol.function) return;
      try {
        const fn = await functionExecutionService.getCompiledFunction(
          funcCol.function
        );
        const args = functionExecutionService.buildArgs(funcCol, row, columns);
        const result = await Promise.resolve(fn(...args));

        if (!isEqual(row[funcCol.id], result)) {
          // Optimistic local update
          setLocalData((prev) =>
            prev.map((r) =>
              r.id === row.id ? { ...r, [funcCol.id]: result } : r
            )
          );

          // Batch persist to Firestore (debounced)
          batchedWriter.queueFieldUpdate(row.id, funcCol.id, result);
        }
        return result;
      } catch (err) {
        console.error(
          `❌ Failed computing function column ${funcCol.columnName} for row ${row.id}:`,
          err
        );
        return undefined;
      }
    },
    [columns, isEqual]
  );

  // Build dependency graph: source columnName -> list of function columns depending on it
  const dependencyGraph = useMemo(() => {
    const map = new Map<string, SheetColumn[]>();
    columns.forEach((col) => {
      if (col.dataType === "function" && Array.isArray(col.arguments)) {
        col.arguments.forEach((arg) => {
          if (arg.columnReference) {
            const list = map.get(arg.columnReference) || [];
            list.push(col);
            map.set(arg.columnReference, list);
          }
          if (Array.isArray(arg.columnReferences)) {
            arg.columnReferences.forEach((ref) => {
              if (!ref) return;
              const list = map.get(ref) || [];
              list.push(col);
              map.set(ref, list);
            });
          }
        });
      }
    });
    return map;
  }, [columns]);

  // Recompute only dependents for a single row (BFS over columnName dependencies)
  const recomputeDependentsForRow = useCallback(
    async (rowId: string, changedColumnId: string, updatedValue: any) => {
      const changedCol = columns.find((c) => c.id === changedColumnId);
      if (!changedCol) return;
      const startName = changedCol.columnName;
      if (!startName) return;

      // Build a working snapshot of the row values
      const baseRow =
        localData.find((r) => r.id === rowId) ||
        data.find((r) => r.id === rowId) ||
        ({ id: rowId } as SheetData);
      const rowSnapshot: SheetData = {
        ...baseRow,
        [changedColumnId]: updatedValue,
      };

      const visited = new Set<string>(); // function column ids visited
      const queue: string[] = [startName]; // queue of columnNames whose dependents need recompute

      while (queue.length) {
        const name = queue.shift()!;
        const dependents = dependencyGraph.get(name) || [];
        for (const funcCol of dependents) {
          if (visited.has(funcCol.id)) continue;
          visited.add(funcCol.id);
          const result = await computeFunctionForRow(rowSnapshot, funcCol);
          if (result !== undefined) {
            (rowSnapshot as any)[funcCol.id] = result;
          }
          // Enqueue further dependents using the function column's own columnName
          if (funcCol.columnName) {
            queue.push(funcCol.columnName);
          }
        }
      }
    },
    [columns, localData, data, dependencyGraph, computeFunctionForRow]
  );

  // Recompute all function columns when data or columns change (debounced via effect cadence + batched writes)
  useEffect(() => {
    const funcCols = columns.filter(
      (c) => c.dataType === "function" && !!c.function
    );
    if (funcCols.length === 0 || tableData.length === 0) return;

    let cancelled = false;
    (async () => {
      for (const row of tableData) {
        for (const col of funcCols) {
          if (cancelled) return;
          await computeFunctionForRow(row, col);
        }
      }
      // After scheduling all updates, let the batched writer flush on its debounce
    })();

    return () => {
      cancelled = true;
    };
  }, [columns, tableData, computeFunctionForRow]);

  const renderCellValue = useCallback((value: any, column: SheetColumn) => {
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
  }, []);

  const handleCellEdit = useCallback(
    async (rowId: string, columnId: string, value: string) => {
      try {
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

        // 🚀 OPTIMISTIC UPDATE: Update local state immediately for instant UI feedback
        setLocalData((prevData) => {
          const updatedData = prevData.map((row) =>
            row.id === rowId ? { ...row, [columnId]: processedValue } : row
          );
          console.log(
            `🚀 Optimistic update: ${rowId}.${columnId} = ${processedValue}`
          );
          return updatedData;
        });

        // Queue field update (debounced batch)
        batchedWriter.queueFieldUpdate(rowId, columnId, processedValue);
        // Keep toast UX similar by simulating success path immediately
        Promise.resolve()
          .then(() => {
            // Show success toast
            toast({
              title: "✅ Cell Updated",
              description: `Updated ${column.columnName}`,
            });

            // After a successful base field update, recompute dependents via the dependency graph
            recomputeDependentsForRow(rowId, columnId, processedValue);
          })
          .catch((error) => {
            console.error(`❌ Failed to update cell:`, error);

            // Revert optimistic update on error
            setLocalData((prevData) =>
              prevData.map((row) =>
                row.id === rowId
                  ? {
                      ...row,
                      [columnId]: data.find((d) => d.id === rowId)?.[columnId],
                    }
                  : row
              )
            );

            // Show error toast
            toast({
              title: "❌ Failed to Update Cell",
              description: `Error: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
              variant: "destructive",
            });
          });
      } catch (error) {
        console.error(`❌ Failed to handle cell edit:`, error);
      }
    },
    [columns, toast, data, tableData, recomputeDependentsForRow]
  );

  // Handle committing cell changes (like Google Sheets - save on Enter/blur)
  const handleCellCancel = useCallback(() => {
    setEditingCell(null);
  }, []);

  // Memoized cell click handler to prevent re-renders
  const handleCellClick = useCallback((rowId: string, columnId: string) => {
    setEditingCell({ rowId, columnId });
  }, []);

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

  // Manually recompute all function columns for all rows (useful after CSV/migration)
  const handleRecomputeAllFunctions = async () => {
    try {
      setIsRecomputing(true);
      const funcCols = columns.filter(
        (c) => c.dataType === "function" && !!c.function
      );
      if (
        funcCols.length === 0 ||
        (localData.length === 0 && data.length === 0)
      ) {
        toast({
          title: "No Function Columns",
          description: "Nothing to recompute.",
        });
        return;
      }

      const rows = localData.length > 0 ? localData : data;
      for (const row of rows) {
        for (const col of funcCols) {
          await computeFunctionForRow(row, col);
        }
      }

      // Expedite persistence of the batched writes
      batchedWriter.flush();

      toast({
        title: "Functions Recomputed",
        description: `Processed ${rows.length} rows across ${funcCols.length} function column(s)`,
      });
    } catch (err) {
      console.error("❌ Recompute all failed", err);
      toast({
        title: "Failed to Recompute",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsRecomputing(false);
    }
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
            onClick={handleRecomputeAllFunctions}
            disabled={isRecomputing}
            className="flex items-center gap-2 border-royal-purple/20 text-royal-purple hover:bg-royal-purple/10 hover:border-royal-purple transition-all duration-200"
            title="Recompute all function columns (use after CSV/migrated data)"
          >
            {isRecomputing ? (
              <span className="animate-pulse">Recomputing…</span>
            ) : (
              <>Recompute Functions</>
            )}
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-royal-purple hover:bg-royal-purple/10"
                  aria-label="Help"
                >
                  <HelpCircle className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="text-sm">
                  Use “Recompute Functions” after importing CSV or migrating
                  data to backfill function columns. Day-to-day edits recompute
                  automatically.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border border-royal-purple/20 overflow-x-auto">
            <TooltipProvider>
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

                        const columnDef = columns.find(
                          (c) => c.id === header.id
                        );
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
            </TooltipProvider>
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
