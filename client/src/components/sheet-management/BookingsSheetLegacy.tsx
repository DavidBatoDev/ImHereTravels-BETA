"use client";

import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  memo,
  startTransition,
} from "react";
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
import { useToast } from "@/hooks/use-toast";
import { useColumnLogger } from "@/hooks/use-column-logger";
import ColumnSettingsModal from "./ColumnSettingsModal";
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
            if (e.key === "Enter") {
              commit();
              onCancel();
            } else if (e.key === "Escape") cancel();
          }}
          autoFocus
          className="h-8 border-2 border-royal-purple focus:border-royal-purple focus:ring-0 focus:outline-none focus-visible:ring-0 rounded-none appearance-none"
          style={{
            WebkitAppearance: "none",
            MozAppearance: "textfield",
            appearance: "none" as any,
          }}
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
          if (e.key === "Enter") {
            commit();
            onCancel();
          } else if (e.key === "Escape") cancel();
        }}
        autoFocus
        className="h-8 border-2 border-royal-purple focus:border-royal-purple focus:ring-0 focus:outline-none focus-visible:ring-0 rounded-none"
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
    updateData,
    updateRow,
    deleteRow,
  } = useSheetManagement();

  // Log columns when they change (compact format for performance)
  useColumnLogger(columns, {
    logOnChange: true,
    compact: true,
    logOrderChanges: true,
    prefix: "📊 BookingsSheet",
  });

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    columnId: string;
  } | null>(null);
  const [selectedCell, setSelectedCell] = useState<{
    rowId: string;
    columnId: string;
  } | null>(null);
  // Remove global editing value to avoid table-wide rerenders

  // Local state for optimistic updates (prevents re-renders)
  const [localData, setLocalData] = useState<SheetData[]>([]);
  // Removed per-cell loading state per request

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    rowId: string | null;
    x: number;
    y: number;
  }>({ isOpen: false, rowId: null, x: 0, y: 0 });

  // Handle clicking outside to close editing (use click so input onBlur commits first)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editingCell && !(event.target as Element).closest(".editing-cell")) {
        setEditingCell(null);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [editingCell]);

  // Modal states
  const [columnSettingsModal, setColumnSettingsModal] = useState<{
    isOpen: boolean;
    column: SheetColumn | null;
  }>({ isOpen: false, column: null });
  const [availableFunctions, setAvailableFunctions] = useState<
    TypeScriptFunction[]
  >([]);
  const [isLoadingFunctions, setIsLoadingFunctions] = useState(false);
  const [isAddingRow, setIsAddingRow] = useState(false);
  // Active subscriptions to function changes keyed by function id
  const functionSubscriptionsRef = useRef<Map<string, () => void>>(new Map());

  // Helper: map column color to light background + hover classes for body cells
  const getColumnTintClasses = useCallback(
    (color: SheetColumn["color"] | undefined): string => {
      const map: Record<string, { base: string; hover: string }> = {
        purple: {
          base: "bg-royal-purple/8 border-l border-r border-royal-purple/40",
          hover: "hover:bg-royal-purple/15",
        },
        blue: {
          base: "bg-blue-100 border-l border-r border-royal-purple/40",
          hover: "hover:bg-blue-200",
        },
        green: {
          base: "bg-green-100 border-l border-r border-royal-purple/40",
          hover: "hover:bg-green-200",
        },
        yellow: {
          base: "bg-yellow-100 border-l border-r border-royal-purple/40",
          hover: "hover:bg-yellow-200",
        },
        orange: {
          base: "bg-orange-100 border-l border-r border-royal-purple/40",
          hover: "hover:bg-orange-200",
        },
        red: {
          base: "bg-red-100 border-l border-r border-royal-purple/40",
          hover: "hover:bg-red-200",
        },
        pink: {
          base: "bg-pink-100 border-l border-r border-royal-purple/40",
          hover: "hover:bg-pink-200",
        },
        cyan: {
          base: "bg-cyan-100 border-l border-r border-royal-purple/40",
          hover: "hover:bg-cyan-200",
        },
        gray: {
          base: "bg-gray-100 border-l border-r border-royal-purple/40",
          hover: "hover:bg-gray-200",
        },
        none: {
          base: "border-l border-r border-royal-purple/40",
          hover: "hover:bg-royal-purple/8",
        },
      };
      const key = color || "none";
      const chosen = map[key] || map.none;
      return `${chosen.base} ${chosen.hover}`.trim();
    },
    []
  );

  // Helper: get text color class based on column color
  const getColumnTextColor = useCallback(
    (color: SheetColumn["color"] | undefined): string => {
      const hasColor = color && color !== "none";
      // In light mode: all text is black
      // In dark mode: colored columns are black, non-colored columns are white
      return hasColor ? "text-gray-900 dark:text-gray-900" : "";
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

    // Show ready toast
    toast({
      title: "🚀 Bookings Sheet Ready",
      description: "You can now edit cells by clicking on them",
      variant: "default",
    });
  }, []);

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
                    ? "bg-royal-purple/20 text-royal-purple font-semibold border-2 border-royal-purple"
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
                  selectedCell?.columnId === col.id ||
                  editingCell?.columnId === col.id
                    ? "bg-royal-purple/30 border-2 border-royal-purple shadow-sm"
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
        accessorKey: col.id, // Use column ID as accessor key
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
                    className={`h-12 w-full px-2 flex items-center justify-center transition-all duration-200 relative ${getColumnTintClasses(
                      columnDef.color
                    )}`}
                    data-cell="1"
                    data-row-id={row.id}
                    data-col-id={column.id}
                    data-type="boolean"
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
                        className={`text-sm font-medium transition-colors duration-200 select-none cursor-pointer ${
                          value
                            ? "text-royal-purple font-semibold"
                            : "text-gray-500 dark:text-muted-foreground"
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // Toggle the checkbox when text is clicked
                          handleCellEdit(
                            row.id,
                            column.id,
                            (!value).toString()
                          );
                        }}
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
                    className={`h-12 w-full px-2 flex items-center transition-all duration-200 relative ${getColumnTintClasses(
                      columnDef.color
                    )}`}
                    data-cell="1"
                    data-row-id={row.id}
                    data-col-id={column.id}
                    data-type="select"
                    onDoubleClick={() =>
                      handleCellDoubleClick(row.id, column.id)
                    }
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
                        <div className="relative">
                          <Select
                            value={value?.toString() || ""}
                            onValueChange={(newValue) => {
                              // Update the cell value directly when selection changes
                              handleCellEdit(row.id, column.id, newValue);
                            }}
                          >
                            <SelectTrigger
                              className={`h-8 border-0 focus:border-0 text-sm transition-colors duration-200 focus:ring-0 focus:outline-none focus-visible:ring-0 rounded-none bg-transparent ${
                                value
                                  ? "text-royal-purple font-medium"
                                  : "text-gray-500 dark:text-muted-foreground"
                              }`}
                            >
                              <SelectValue
                                placeholder="Select option"
                                className={
                                  !value
                                    ? "text-gray-400 dark:text-muted-foreground/60"
                                    : "text-royal-purple"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-background border border-royal-purple/20 dark:border-border shadow-lg max-h-60 z-50">
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
                          {/* Single-click blocker to prevent opening on first click */}
                          <div
                            className="absolute inset-0"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          />
                        </div>
                      ) : (
                        <div className="h-8 w-full flex items-center justify-center text-sm text-gray-400 dark:text-muted-foreground/60 bg-gray-50 dark:bg-muted border border-gray-200 dark:border-border rounded cursor-not-allowed">
                          No options available
                        </div>
                      )}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>{value ? String(value) : ""}</TooltipContent>
              </Tooltip>
            );
          }

          // For date columns, always show a date picker input
          if (columnDef.dataType === "date") {
            return (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`h-12 w-full px-2 flex items-center transition-all duration-200 relative ${getColumnTintClasses(
                      columnDef.color
                    )}`}
                    data-cell="1"
                    data-row-id={row.id}
                    data-col-id={column.id}
                    data-type="date"
                    onDoubleClick={() =>
                      handleCellDoubleClick(row.id, column.id)
                    }
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
                          if ((e.currentTarget as any).showPicker) {
                            try {
                              (e.currentTarget as any).showPicker();
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
                        className={`h-8 border-0 focus:border-0 focus:ring-0 focus:outline-none focus-visible:ring-0 text-sm transition-colors duration-200 pr-8 cursor-pointer rounded-none bg-transparent ${
                          !value
                            ? "text-gray-400 dark:text-muted-foreground/60"
                            : "text-gray-900 dark:text-foreground"
                        } appearance-none`}
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
                        style={{
                          zIndex: 10,
                          WebkitAppearance: "none",
                          MozAppearance: "textfield",
                          appearance: "none" as any,
                        }}
                        autoComplete="off"
                        data-date-picker="true"
                      />
                      {/* Calendar icon indicator - clickable to open date picker */}
                      <div
                        className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer z-20"
                        onPointerDown={(e) => {
                          // prevent selection logic on container
                          e.stopPropagation();
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const input =
                            e.currentTarget.parentElement?.querySelector(
                              'input[type="date"]'
                            ) as HTMLInputElement | null;
                          if (input) {
                            if ((input as any).showPicker) {
                              (input as any).showPicker();
                            } else {
                              input.focus();
                              setTimeout(() => input.click(), 10);
                            }
                          }
                        }}
                        title="Open date picker"
                        aria-label="Open date picker"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 text-royal-purple"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM18 9H2v7a2 2 0 002 2h12a2 2 0 002-2V9z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <span className={getColumnTextColor(columnDef.color)}>
                    {renderCellValue(value, columnDef)}
                  </span>
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
                      className={`h-12 w-full px-2 flex items-center transition-all duration-200 relative ${getColumnTintClasses(
                        columnDef.color
                      )}`}
                      data-cell="1"
                      data-row-id={row.id}
                      data-col-id={column.id}
                      data-type="function"
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
                    className={`h-12 w-full px-2 flex items-center transition-all duration-200 relative ${getColumnTintClasses(
                      columnDef.color
                    )}`}
                    data-cell="1"
                    data-row-id={row.id}
                    data-col-id={column.id}
                    data-type="function"
                    style={{
                      minWidth: `${columnDef.width || 150}px`,
                      maxWidth: `${columnDef.width || 150}px`,
                    }}
                    // Non-editable
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={() =>
                      handleCellDoubleClick(row.id, column.id)
                    }
                    title="Computed cell"
                  >
                    {(() => {
                      const key = `${row.id}:${columnDef.id}`;
                      return (
                        <div
                          className="w-full truncate text-sm flex items-center gap-2"
                          title={value?.toString() || ""}
                        >
                          <span className={undefined}>
                            <span
                              className={getColumnTextColor(columnDef.color)}
                            >
                              {renderCellValue(value, columnDef)}
                            </span>
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {value === undefined || value === null || value === ""
                    ? ""
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
                  className={`h-12 w-full px-2 flex items-center cursor-pointer transition-all duration-200 relative ${getColumnTintClasses(
                    columnDef.color
                  )}`}
                  style={{
                    minWidth: `${columnDef.width || 150}px`,
                    maxWidth: `${columnDef.width || 150}px`,
                  }}
                  data-cell="1"
                  data-row-id={row.id}
                  data-col-id={column.id}
                  onDoubleClick={() => handleCellDoubleClick(row.id, column.id)}
                >
                  <div className="w-full truncate text-sm">
                    <span className={getColumnTextColor(columnDef.color)}>
                      {renderCellValue(value, columnDef)}
                    </span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {value === undefined || value === null || value === ""
                  ? ""
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
        const args = functionExecutionService.buildArgs(funcCol, row, columns);

        // Log function arguments for debugging
        console.log("🔧 [FUNCTION] Calling function with args:", {
          functionId: funcCol.function,
          columnName: funcCol.columnName,
          rowId: row.id,
          args: args,
          argsCount: args.length,
        });

        // Execute function with proper async handling
        const executionResult = await functionExecutionService.executeFunction(
          funcCol.function,
          args,
          10000 // 10 second timeout
        );

        if (!executionResult.success) {
          console.error(
            `❌ [FUNCTION EXECUTION] Function ${funcCol.function} failed:`,
            executionResult.error
          );
          return row[funcCol.id]; // Return existing value on error
        }

        const result = executionResult.result;

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

        // If the error is about a booking not being found, log additional context
        if (err instanceof Error && err.message.includes("not found")) {
          console.error("🔍 [DEBUG] Function execution context:", {
            rowId: row.id,
            functionId: funcCol.function,
            columnId: funcCol.id,
            columnName: funcCol.columnName,
            rowData: row,
            functionArguments: functionExecutionService.buildArgs(
              funcCol,
              row,
              columns
            ),
          });
        }

        return undefined;
      }
    },
    [columns, isEqual]
  );

  // Build dependency graph: source columnId -> list of function columns depending on it
  const dependencyGraph = useMemo(() => {
    const map = new Map<string, SheetColumn[]>();
    columns.forEach((col) => {
      if (col.dataType === "function" && Array.isArray(col.arguments)) {
        col.arguments.forEach((arg) => {
          if (arg.columnReference) {
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
          if (Array.isArray(arg.columnReferences)) {
            arg.columnReferences.forEach((ref) => {
              if (!ref) return;
              // Find the column ID for the referenced column name
              const refCol = columns.find((c) => c.columnName === ref);
              if (refCol) {
                const list = map.get(refCol.id) || [];
                list.push(col);
                map.set(refCol.id, list);
              }
            });
          }
        });
      }
    });
    return map;
  }, [columns]);

  // Recompute only direct dependent function columns for a single row
  const recomputeDirectDependentsForRow = useCallback(
    async (rowId: string, changedColumnId: string, updatedValue: any) => {
      const changedCol = columns.find((c) => c.id === changedColumnId);
      if (!changedCol) return;

      // Build a working snapshot of the row values
      const baseRow =
        localData.find((r) => r.id === rowId) ||
        data.find((r) => r.id === rowId) ||
        ({ id: rowId } as SheetData);
      const rowSnapshot: SheetData = {
        ...baseRow,
        [changedColumnId]: updatedValue,
      };

      // Use column ID instead of column name for precise tracking
      const directDependents = dependencyGraph.get(changedColumnId) || [];
      console.log("🎯 [RECOMPUTE] Found direct dependents:", {
        changedColumnId,
        changedColumnName: changedCol.columnName,
        dependentColumns: directDependents.map((col) => ({
          id: col.id,
          name: col.columnName,
        })),
      });

      // Compute all direct dependents in parallel for speed
      await Promise.all(
        directDependents.map((funcCol) =>
          computeFunctionForRow(rowSnapshot, funcCol)
        )
      );
      // Do not force flush; allow debounced batch to commit to keep UI snappy
    },
    [columns, localData, data, dependencyGraph, computeFunctionForRow]
  );

  // Recompute for columns bound to a specific function id (and their dependents)
  const recomputeForFunction = useCallback(
    async (funcId: string) => {
      const impactedColumns = columns.filter(
        (c) => c.dataType === "function" && c.function === funcId
      );
      if (impactedColumns.length === 0) return;

      const rows = localData.length > 0 ? localData : data;
      for (const row of rows) {
        for (const funcCol of impactedColumns) {
          await computeFunctionForRow(row, funcCol);
        }
      }
      // Expedite persistence
      batchedWriter.flush();
    },
    [columns, localData, data, computeFunctionForRow]
  );

  // Subscribe to changes for only the functions referenced by current columns
  useEffect(() => {
    const inUseFunctionIds = new Set(
      columns
        .filter((c) => c.dataType === "function" && !!c.function)
        .map((c) => c.function as string)
    );

    // Add new subscriptions for newly referenced functions
    inUseFunctionIds.forEach((funcId) => {
      if (!functionSubscriptionsRef.current.has(funcId)) {
        const unsubscribe =
          typescriptFunctionsService.subscribeToFunctionChanges(
            funcId,
            (updated) => {
              if (!updated) return;
              // Invalidate compiled function cache so next compute uses fresh code
              functionExecutionService.invalidate(funcId);
              // Recompute only affected columns and their dependents
              recomputeForFunction(funcId);
            }
          );
        functionSubscriptionsRef.current.set(funcId, unsubscribe);
      }
    });

    // Remove subscriptions for functions no longer referenced
    for (const [
      funcId,
      unsubscribe,
    ] of functionSubscriptionsRef.current.entries()) {
      if (!inUseFunctionIds.has(funcId)) {
        try {
          unsubscribe();
        } catch {}
        functionSubscriptionsRef.current.delete(funcId);
      }
    }

    // Cleanup on unmount: ensure all remaining subscriptions are torn down
    return () => {
      for (const [
        ,
        unsubscribe,
      ] of functionSubscriptionsRef.current.entries()) {
        try {
          unsubscribe();
        } catch {}
      }
      functionSubscriptionsRef.current.clear();
    };
  }, [columns, recomputeForFunction]);

  // Removed sheet-wide recomputation to avoid rerunning entire sheet on edits

  const renderCellValue = useCallback((value: any, column: SheetColumn) => {
    if (value === null || value === undefined || value === "") return "";

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
        return `€${parseFloat(value).toLocaleString()}`;
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

        // Do not update if value didn't change
        const currentRow = (localData.find((r) => r.id === rowId) ||
          data.find((r) => r.id === rowId)) as SheetData | undefined;
        if (currentRow && isEqual(currentRow[columnId], processedValue)) {
          return;
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
        // Recompute only direct dependents (no success toast to keep UI snappy)
        recomputeDirectDependentsForRow(rowId, columnId, processedValue).catch(
          (error) => {
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
          }
        );
      } catch (error) {
        console.error(`❌ Failed to handle cell edit:`, error);
      }
    },
    [columns, toast, data, tableData, recomputeDirectDependentsForRow]
  );

  // Handle committing cell changes (like Google Sheets - save on Enter/blur)
  const handleCellCancel = useCallback(() => {
    setEditingCell(null);
  }, []);

  // Memoized cell click handler: select only (fast), don't enter edit on single click
  const handleCellClick = useCallback((rowId: string, columnId: string) => {
    setSelectedCell((prev) => {
      if (prev && prev.rowId === rowId && prev.columnId === columnId)
        return prev;
      return { rowId, columnId };
    });
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const lastSelectedCellEl = useRef<HTMLElement | null>(null);
  const [overlayEditing, setOverlayEditing] = useState(false);
  const overlayInitialValueRef = useRef<string>("");
  const overlayEditingCellRef = useRef<{
    rowId: string;
    columnId: string;
  } | null>(null);
  const overlayTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [selectionBox, setSelectionBox] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  const clearSelection = useCallback(() => {
    setOverlayEditing(false);
    setSelectionBox(null);
    setSelectedCell(null as any);
    if (lastSelectedCellEl.current) {
      lastSelectedCellEl.current.style.backgroundColor = "";
      lastSelectedCellEl.current.style.visibility = "";
      lastSelectedCellEl.current = null;
    }
  }, []);

  const handleOverlayCommit = useCallback(async () => {
    const targetCell = overlayEditingCellRef.current || selectedCell;
    if (!targetCell) return;
    const currentValue = overlayTextareaRef.current?.value ?? "";
    let valueToSend = currentValue;
    const colDef = columns.find((c) => c.id === targetCell.columnId);
    if (colDef) {
      switch (colDef.dataType) {
        case "number":
        case "currency": {
          // Strip thousands separators, currency symbols, and spaces
          const normalized = (currentValue || "").replace(/[^0-9.\-]+/g, "");
          valueToSend = normalized;
          break;
        }
        case "boolean": {
          const t = (currentValue || "").trim().toLowerCase();
          const truthy = ["true", "1", "yes", "y", "on"];
          valueToSend = truthy.includes(t) ? "true" : "false";
          break;
        }
        case "date": {
          const d = new Date(currentValue);
          if (!isNaN(d.getTime())) {
            valueToSend = d.toISOString().split("T")[0];
          }
          break;
        }
        default:
          break;
      }
    }
    await handleCellEdit(targetCell.rowId, targetCell.columnId, valueToSend);
    clearSelection();
    overlayEditingCellRef.current = null;
  }, [selectedCell, handleCellEdit, clearSelection, columns]);

  const handlePointerDownSelect = useCallback(
    (e: React.PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // If clicking on the floating overlay, let its handlers manage
      if (overlayRef.current && overlayRef.current.contains(target)) {
        return;
      }
      const cellEl = target.closest('[data-cell="1"]') as HTMLElement | null;
      // Clicked somewhere inside the container but not on a cell -> commit/clear
      if (!cellEl) {
        if (overlayEditing) {
          // Commit then unselect
          handleOverlayCommit();
        } else if (selectedCell) {
          clearSelection();
        }
        return;
      }
      const rowId = cellEl.dataset.rowId;
      const columnId = cellEl.dataset.colId;
      const cellType = cellEl.dataset.type;
      if (rowId && columnId) {
        // If we're currently editing and selecting a different cell, commit the edit first
        if (overlayEditing) {
          const current = overlayEditingCellRef.current || selectedCell;
          if (
            !current ||
            current.rowId !== rowId ||
            current.columnId !== columnId
          ) {
            // Commit the current edit before switching to new cell
            handleOverlayCommit();
            // Don't return here - continue to select the new cell
          }
        }

        // Immediate boolean toggle: click on checkbox cell toggles without overlay edit
        if (cellType === "boolean") {
          // Toggle immediately via data state, do not change selection
          const row = (localData.find((r) => r.id === rowId) ||
            data.find((r) => r.id === rowId)) as any;
          const current = row ? !!row[columnId as any] : false;
          handleCellEdit(rowId, columnId, (!current).toString());
          return;
        }
        // Defer selection state to next frame to let layout settle before overlay render
        requestAnimationFrame(() => {
          setSelectedCell((prev) => {
            if (prev && prev.rowId === rowId && prev.columnId === columnId)
              return prev;
            return { rowId, columnId };
          });
        });

        const container = containerRef.current;
        if (container) {
          const cellRect = cellEl.getBoundingClientRect();
          const contRect = container.getBoundingClientRect();
          requestAnimationFrame(() => {
            setSelectionBox({
              top: cellRect.top - contRect.top,
              left: cellRect.left - contRect.left,
              width: cellRect.width,
              height: cellRect.height,
            });
          });
        }

        // Batch style changes to avoid layout thrash
        requestAnimationFrame(() => {
          if (
            lastSelectedCellEl.current &&
            lastSelectedCellEl.current !== cellEl
          ) {
            lastSelectedCellEl.current.style.backgroundColor = "";
            lastSelectedCellEl.current.style.visibility = "";
          }
          const shouldHide = !(
            cellType === "boolean" ||
            cellType === "select" ||
            cellType === "date" ||
            cellType === "function"
          );
          if (shouldHide) {
            cellEl.style.backgroundColor = "#ffffff";
            cellEl.style.visibility = "hidden";
          } else {
            cellEl.style.backgroundColor = "";
            cellEl.style.visibility = "";
          }
          lastSelectedCellEl.current = cellEl;
        });

        // Close overlay editing if selecting a new cell
        setOverlayEditing(false);
      }
    },
    [
      localData,
      data,
      columns,
      handleCellEdit,
      overlayEditing,
      handleOverlayCommit,
    ]
  );

  const handleOverlayDoubleClick = useCallback(() => {
    if (!selectedCell) return;
    const row = (localData.find((r) => r.id === selectedCell.rowId) ||
      data.find((r) => r.id === selectedCell.rowId)) as any;
    const colDef = columns.find((c) => c.id === selectedCell.columnId);
    const raw = row && colDef ? row[colDef.id] : undefined;
    overlayInitialValueRef.current = String(raw ?? "");
    setOverlayEditing(true);
    overlayEditingCellRef.current = {
      rowId: selectedCell.rowId,
      columnId: selectedCell.columnId,
    };
  }, [selectedCell, localData, data, columns]);

  const handleContainerDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const cellEl = target.closest('[data-cell="1"]') as HTMLElement | null;
      if (!cellEl) return;
      const rowId = cellEl.dataset.rowId || selectedCell?.rowId;
      const columnId = cellEl.dataset.colId || selectedCell?.columnId;
      if (!rowId || !columnId) return;
      const row = (localData.find((r) => r.id === rowId) ||
        data.find((r) => r.id === rowId)) as any;
      const colDef = columns.find((c) => c.id === columnId);
      const raw = row && colDef ? row[colDef.id] : undefined;
      overlayInitialValueRef.current = String(raw ?? "");
      setOverlayEditing(true);
      overlayEditingCellRef.current = { rowId, columnId };
    },
    [selectedCell, localData, data, columns]
  );

  const handleOverlayKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleOverlayCommit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setOverlayEditing(false);
      }
    },
    [handleOverlayCommit]
  );

  useEffect(() => {
    // When entering edit mode, ensure the overlay doesn't obstruct and the cell is visible
    if (editingCell) {
      if (lastSelectedCellEl.current) {
        lastSelectedCellEl.current.style.visibility = "";
        lastSelectedCellEl.current.style.backgroundColor = "";
      }
    }
  }, [editingCell]);

  useEffect(() => {
    if (overlayEditing && overlayTextareaRef.current) {
      const el = overlayTextareaRef.current;
      // Focus and move caret to the end of the value
      try {
        el.focus();
        const len = el.value.length;
        if (typeof (el as any).setSelectionRange === "function") {
          (el as any).setSelectionRange(len, len);
        }
      } catch {}
    }
  }, [overlayEditing]);

  useEffect(() => {
    const onGlobalPointerDown = (e: PointerEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const insideContainer = container.contains(target);
      if (!insideContainer) {
        if (overlayEditing) {
          // Commit then unselect
          handleOverlayCommit();
        } else if (selectedCell) {
          clearSelection();
        }
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        if (overlayEditing) {
          e.preventDefault();
          handleOverlayCommit();
        } else if (selectedCell) {
          e.preventDefault();
          clearSelection();
        }
      } else if (selectedCell && !overlayEditing) {
        // Check if it's a printable character (not special keys like Escape, Tab, etc.)
        const isPrintableChar =
          e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;

        if (isPrintableChar) {
          const selectedCol = columns.find(
            (c) => c.id === selectedCell.columnId
          );
          const isEditableType =
            selectedCol?.dataType === "string" ||
            selectedCol?.dataType === "number" ||
            selectedCol?.dataType === "currency";

          if (isEditableType) {
            e.preventDefault();
            overlayInitialValueRef.current = e.key;
            setOverlayEditing(true);
          }
        }
      }
    };
    window.addEventListener("pointerdown", onGlobalPointerDown, true);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("pointerdown", onGlobalPointerDown, true);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [
    overlayEditing,
    selectedCell,
    handleOverlayCommit,
    clearSelection,
    columns,
  ]);

  const selectedDisplayValue = useMemo(() => {
    if (!selectedCell) return null;
    const row = (localData.find((r) => r.id === selectedCell.rowId) ||
      data.find((r) => r.id === selectedCell.rowId)) as any;
    if (!row) return null;
    const colDef = columns.find((c) => c.id === selectedCell.columnId);
    if (!colDef) return null;
    const raw = row[colDef.id];
    if (raw === undefined || raw === null || raw === "") return "";
    try {
      if (colDef.dataType === "boolean") {
        const boolVal = !!raw;
        return boolVal ? "Yes" : "No";
      }
      if (colDef.dataType === "date") {
        let date: Date | null = null;
        if (raw && typeof raw === "object") {
          if (typeof (raw as any).toDate === "function") {
            date = (raw as any).toDate();
          } else if (typeof (raw as any).seconds === "number") {
            date = new Date((raw as any).seconds * 1000);
          }
        }
        if (!date && (typeof raw === "string" || typeof raw === "number")) {
          const d = new Date(raw as any);
          if (!isNaN(d.getTime())) date = d;
        }
        if (date && !isNaN(date.getTime())) {
          return date.toISOString().split("T")[0];
        }
        return "";
      }
      return String(raw);
    } catch {
      return "";
    }
  }, [selectedCell, localData, data, columns]);

  const selectedColDef = useMemo(
    () =>
      selectedCell
        ? columns.find((c) => c.id === selectedCell.columnId)
        : undefined,
    [selectedCell, columns]
  );
  const selectedType = selectedColDef?.dataType;

  // Double click enters edit mode (heavy UI only when needed)
  const handleCellDoubleClick = useCallback(
    (rowId: string, columnId: string) => {
      setEditingCell({ rowId, columnId });
    },
    []
  );

  const openColumnSettings = (column: SheetColumn) => {
    setColumnSettingsModal({ isOpen: true, column });
  };

  const handleColumnSave = (updatedColumn: SheetColumn) => {
    updateColumn(updatedColumn);
  };

  const handleColumnDelete = (columnId: string) => {
    deleteColumn(columnId);
  };

  // Handle adding a new row
  const handleAddNewRow = async () => {
    try {
      setIsAddingRow(true);

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
    } finally {
      setIsAddingRow(false);
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

  // Removed manual recompute handler and button per request

  return (
    <div className="booking-sheet space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground font-hk-grotesk">
            Bookings Sheet
          </h2>
          <p className="text-muted-foreground">
            Manage your bookings data with customizable columns
          </p>
        </div>
        <div className="flex gap-2">
          {/* Recompute button removed */}
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
                  Function columns recompute only when their inputs or
                  underlying functions change.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="border border-royal-purple/20 shadow-lg">
        <CardHeader className="bg-muted/50 border-b border-royal-purple/20 dark:border-border">
          <CardTitle className="flex items-center gap-2 text-foreground">
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
                className="pl-10 border-royal-purple/20 focus:border-royal-purple focus:ring-royal-purple/20 focus:outline-none focus-visible:ring-0"
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
              <SelectTrigger className="border-royal-purple/20 focus:border-royal-purple focus:ring-royal-purple/20 focus:outline-none focus-visible:ring-0">
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
              <DropdownMenuContent
                align="end"
                className="w-48 max-h-80 overflow-y-auto scrollbar-hide"
              >
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
        <CardHeader className="bg-muted/50 border-b border-royal-purple/20 dark:border-border">
          <CardTitle className="text-foreground">Bookings Data</CardTitle>
          <CardDescription className="text-muted-foreground">
            Showing {table.getFilteredRowModel().rows.length} of {data.length}{" "}
            rows with numeric IDs (1, 2, 3...){" "}
            {table.getFilteredRowModel().rows.length < 10 &&
              `(${
                10 - table.getFilteredRowModel().rows.length
              } empty rows for layout)`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div
            ref={containerRef}
            className="relative rounded-md border border-royal-purple/40 dark:border-border overflow-x-auto"
            onPointerDownCapture={handlePointerDownSelect}
          >
            <TooltipProvider>
              <Table className="border border-royal-purple/40 dark:border-border min-w-full table-fixed">
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow
                      key={headerGroup.id}
                      className="bg-light-grey/30 dark:bg-muted"
                    >
                      {headerGroup.headers.map((header) => {
                        // Handle row number column header
                        if (header.id === "rowNumber") {
                          return (
                            <TableHead
                              key={header.id}
                              className="relative border border-royal-purple/40 dark:border-border p-0"
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
                            className="relative border border-royal-purple/40 dark:border-border p-0"
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
                    const pageSize = table.getState().pagination.pageSize;
                    const currentPage = table.getState().pagination.pageIndex;
                    const startIndex = currentPage * pageSize;
                    const endIndex = startIndex + pageSize;

                    // Only show add button if we have space for more rows on the current page
                    const hasSpaceForMoreRows = visibleRows.length < pageSize;
                    const rowsToShow = hasSpaceForMoreRows
                      ? pageSize
                      : visibleRows.length;

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
                            className={`border-b border-royal-purple/20 transition-colors duration-200 bg-white dark:bg-background hover:bg-royal-purple/5 dark:hover:bg-muted/50`}
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
                                  className="border border-royal-purple/40 dark:border-border p-0"
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
                      const isFirstEmptyRowAfterData = i === visibleRows.length; // Add button should be on the first empty row after data
                      const isEmptyRow = i >= visibleRows.length;
                      const shouldShowAddButton =
                        hasSpaceForMoreRows && isFirstEmptyRowAfterData;
                      emptyRows.push(
                        <TableRow
                          key={`empty-${i}`}
                          className={`border-b border-royal-purple/20 bg-white dark:bg-background ${
                            isFirstEmptyRow ? "opacity-100" : "opacity-60"
                          }`}
                        >
                          {table
                            .getAllLeafColumns()
                            .map((column, columnIndex) => {
                              // Handle row number column
                              if (column.id === "rowNumber") {
                                // Calculate the actual row number for empty rows
                                const actualRowNumber = i;
                                return (
                                  <TableCell
                                    key={column.id}
                                    className="border border-royal-purple/40 p-0"
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
                                  className="border border-royal-purple/40 p-0"
                                  style={{
                                    minWidth: `${columnDef?.width || 150}px`,
                                    maxWidth: `${columnDef?.width || 150}px`,
                                    width: `${columnDef?.width || 150}px`,
                                  }}
                                >
                                  <div className="h-12 w-full px-2 flex items-center">
                                    {isEmptyRow &&
                                    shouldShowAddButton &&
                                    columnIndex === 1 ? (
                                      // Plus button only in the last empty row, second column (after row number)
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleAddNewRow()}
                                        disabled={isAddingRow}
                                        className="h-8 w-8 p-0 border-royal-purple/20 text-royal-purple hover:bg-royal-purple/20 hover:border-royal-purple transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title={
                                          isAddingRow
                                            ? "Adding new row..."
                                            : "Add new booking"
                                        }
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
            {selectionBox &&
              !(
                editingCell &&
                selectedCell &&
                editingCell.rowId === selectedCell.rowId &&
                editingCell.columnId === selectedCell.columnId
              ) && (
                <div
                  style={{
                    position: "absolute",
                    top: selectionBox.top,
                    left: selectionBox.left,
                    width: selectionBox.width,
                    height: selectionBox.height,
                    pointerEvents: selectedType === "boolean" ? "none" : "auto",
                    zIndex: 50,
                  }}
                  className={`border-2 border-royal-purple shadow-sm ${
                    selectedType === "boolean" ? "bg-transparent" : "bg-white"
                  }`}
                  ref={overlayRef}
                  onClick={(e) => {
                    // Intercept single clicks for non-text cells so legacy click doesn't open controls
                    if (
                      selectedType === "date" ||
                      selectedType === "select" ||
                      selectedType === "boolean"
                    ) {
                      e.preventDefault();
                      e.stopPropagation();
                      return;
                    }
                    handleOverlayDoubleClick();
                  }}
                  onDoubleClick={() => {
                    if (selectedType === "date") {
                      try {
                        const input = lastSelectedCellEl.current?.querySelector(
                          'input[type="date"]'
                        ) as HTMLInputElement | null;
                        if (input) {
                          if ((input as any).showPicker) {
                            (input as any).showPicker();
                          } else {
                            input.focus();
                            setTimeout(() => input.click(), 0);
                          }
                        }
                      } catch {}
                      return;
                    }
                    if (selectedType === "select") {
                      try {
                        const trigger =
                          lastSelectedCellEl.current?.querySelector(
                            '[role="combobox"],button'
                          ) as HTMLElement | null;
                        if (trigger) trigger.click();
                      } catch {}
                      return;
                    }
                  }}
                >
                  {overlayEditing ? (
                    <textarea
                      autoFocus
                      ref={overlayTextareaRef}
                      defaultValue={overlayInitialValueRef.current}
                      onBlur={handleOverlayCommit}
                      onKeyDown={handleOverlayKeyDown}
                      className={`w-full h-full resize-none outline-none focus:outline-none focus:ring-0 px-2 py-1 text-sm bg-white ${getColumnTextColor(
                        selectedColDef?.color
                      )}`}
                      style={{
                        fontFamily: "inherit",
                        lineHeight: 1.2,
                      }}
                    />
                  ) : (
                    selectedDisplayValue !== null && (
                      <div className="absolute inset-0 flex items-center px-2 text-sm select-none">
                        <span
                          className={`truncate w-full ${getColumnTextColor(
                            selectedColDef?.color
                          )}`}
                        >
                          {selectedDisplayValue}
                        </span>
                        {selectedType === "date" && (
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded hover:bg-royal-purple/10 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              try {
                                const input =
                                  lastSelectedCellEl.current?.querySelector(
                                    'input[type="date"]'
                                  ) as HTMLInputElement | null;
                                if (input) {
                                  if ((input as any).showPicker) {
                                    (input as any).showPicker();
                                  } else {
                                    input.focus();
                                    setTimeout(() => input.click(), 0);
                                  }
                                }
                              } catch {}
                            }}
                            aria-label="Open date picker"
                            title="Open date picker"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4 text-royal-purple"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM18 9H2v7a2 2 0 002 2h12a2 2 0 002-2V9z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        )}
                        {selectedType === "select" && (
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded hover:bg-royal-purple/10 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              try {
                                const trigger =
                                  lastSelectedCellEl.current?.querySelector(
                                    '[role="combobox"],button'
                                  ) as HTMLElement | null;
                                if (trigger) trigger.click();
                              } catch {}
                            }}
                            aria-label="Open options"
                            title="Open options"
                          >
                            <ChevronDown className="h-4 w-4 text-royal-purple" />
                          </button>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between space-x-2 py-4 px-6">
            <div className="flex-1 text-sm text-muted-foreground">
              {table.getFilteredSelectedRowModel().rows.length} of{" "}
              {table.getFilteredRowModel().rows.length} row(s) selected.
            </div>
            <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium text-foreground">
                  Rows per page
                </p>
                <Select
                  value={`${table.getState().pagination.pageSize}`}
                  onValueChange={(value) => {
                    table.setPageSize(Number(value));
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px] border-royal-purple/20 focus:border-royal-purple focus:ring-royal-purple/20 focus:outline-none focus-visible:ring-0">
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
              <div className="flex w-[100px] items-center justify-center text-sm font-medium text-foreground">
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

      {/* Loading Modal for Adding Row */}
      {isAddingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center space-x-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-royal-purple"></div>
              <div>
                <h3 className="text-lg font-semibold text-creative-midnight">
                  Adding New Row
                </h3>
                <p className="text-sm text-grey">
                  Please wait while we create your new booking row...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
