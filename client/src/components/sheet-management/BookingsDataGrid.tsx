"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  memo,
  useRef,
} from "react";
// Import react-data-grid components
// @ts-expect-error - react-data-grid v7 has incorrect type definitions
import { DataGrid, textEditor } from "react-data-grid";

// Debug the textEditor
console.log("textEditor from react-data-grid:", typeof textEditor, textEditor);

// Define types manually since the package types are not matching
type Column<TRow> = {
  key: string;
  name: string;
  width?: number | string;
  resizable?: boolean;
  sortable?: boolean;
  frozen?: boolean;
  renderCell?: (props: { row: TRow; column: any }) => React.ReactNode;
  renderEditCell?: (props: {
    row: TRow;
    column: any;
    onRowChange: (row: TRow) => void;
    onClose: (commit: boolean) => void;
  }) => React.ReactNode;
  [key: string]: any;
};

type RenderEditCellProps<TRow> = {
  row: TRow;
  column: any;
  onRowChange: (row: TRow) => void;
  onClose: (commit: boolean) => void;
};

type RenderCellProps<TRow> = {
  row: TRow;
  column: any;
};

type SortColumn = {
  columnKey: string;
  direction: "ASC" | "DESC";
};
import "react-data-grid/lib/styles.css";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FunctionSquare } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Settings,
  Trash2,
  X,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar as CalendarIcon,
} from "lucide-react";
import {
  SheetColumn,
  SheetData,
  TypeScriptFunction,
} from "@/types/sheet-management";
import { useSheetManagement } from "@/hooks/use-sheet-management";
import { useToast } from "@/hooks/use-toast";
import { functionExecutionService } from "@/services/function-execution-service";
import { batchedWriter } from "@/services/batched-writer";
import { bookingService } from "@/services/booking-service";
import { typescriptFunctionsService } from "@/services/typescript-functions-service";
// Simple deep equality check
const isEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return a === b;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isEqual(a[i], b[i])) return false;
    }
    return true;
  }
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!isEqual(a[key], b[key])) return false;
  }
  return true;
};
import ColumnSettingsModal from "./ColumnSettingsModal";

// Custom editors for different data types
const DateEditor = memo(function DateEditor({
  row,
  column,
  onRowChange,
  onClose,
}: RenderEditCellProps<SheetData>) {
  console.log(
    "📅 DateEditor component rendered for column:",
    column.key,
    "row:",
    row.id
  );

  const [value, setValue] = useState(() => {
    const cellValue = row[column.key as keyof SheetData];
    console.log("📅 DateEditor - Processing cell value:", {
      cellValue,
      type: typeof cellValue,
      isObject: typeof cellValue === "object",
      hasToDate:
        cellValue && typeof cellValue === "object" && "toDate" in cellValue,
      hasSeconds:
        cellValue && typeof cellValue === "object" && "seconds" in cellValue,
    });

    if (cellValue) {
      try {
        let date: Date | null = null;

        // Handle Firestore Timestamp objects
        if (
          cellValue &&
          typeof cellValue === "object" &&
          "toDate" in cellValue &&
          typeof (cellValue as any).toDate === "function"
        ) {
          date = (cellValue as any).toDate();
          console.log("📅 Converted from Firestore Timestamp:", date);
        }
        // Handle Firestore timestamp objects with seconds property
        else if (
          cellValue &&
          typeof cellValue === "object" &&
          "seconds" in cellValue &&
          typeof (cellValue as any).seconds === "number"
        ) {
          date = new Date((cellValue as any).seconds * 1000);
          console.log("📅 Converted from seconds timestamp:", date);
        }
        // Handle numeric timestamps (milliseconds)
        else if (typeof cellValue === "number") {
          // Check if it's a timestamp in milliseconds or seconds
          if (cellValue > 1000000000000) {
            // Milliseconds timestamp
            date = new Date(cellValue);
          } else {
            // Seconds timestamp
            date = new Date(cellValue * 1000);
          }
          console.log("📅 Converted from numeric timestamp:", date);
        }
        // Handle string timestamps or date strings
        else if (typeof cellValue === "string") {
          // Check if it's a numeric string (timestamp)
          const numericValue = parseFloat(cellValue);
          if (!isNaN(numericValue)) {
            if (numericValue > 1000000000000) {
              // Milliseconds timestamp
              date = new Date(numericValue);
            } else {
              // Seconds timestamp
              date = new Date(numericValue * 1000);
            }
            console.log("📅 Converted from string timestamp:", date);
          } else {
            // Regular date string
            date = new Date(cellValue);
            console.log("📅 Converted from date string:", date);
          }
        }
        // Handle Date objects
        else if (cellValue instanceof Date) {
          date = cellValue;
          console.log("📅 Using existing Date object:", date);
        }

        if (date && !isNaN(date.getTime())) {
          const isoString = date.toISOString().split("T")[0];
          console.log("📅 Final date value for input:", isoString);
          return isoString;
        } else {
          console.log("📅 Invalid date, returning empty string");
        }
      } catch (error) {
        console.error("📅 Error parsing date:", error, "Value:", cellValue);
      }
    }
    return "";
  });

  const handleSave = useCallback(() => {
    const processedValue = value ? new Date(value) : null;
    onRowChange({ ...row, [column.key]: processedValue });
    onClose(true);
  }, [value, row, column.key, onRowChange, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Escape") {
        onClose(false);
      }
    },
    [handleSave, onClose]
  );

  return (
    <Input
      type="date"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleSave}
      onKeyDown={handleKeyDown}
      autoFocus
      className="h-8 border-2 border-royal-purple focus:border-royal-purple focus:ring-0 focus:outline-none focus-visible:ring-0 rounded-none"
    />
  );
});

const BooleanEditor = memo(function BooleanEditor({
  row,
  column,
  onRowChange,
  onClose,
}: RenderEditCellProps<SheetData>) {
  const value = !!row[column.key as keyof SheetData];

  const handleToggle = useCallback(() => {
    onRowChange({ ...row, [column.key]: !value });
    onClose(true);
  }, [row, column.key, value, onRowChange, onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleToggle();
      } else if (e.key === "Escape") {
        onClose(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleToggle, onClose]);

  return (
    <div className="flex items-center justify-center h-8 w-full">
      <input
        type="checkbox"
        checked={value}
        onChange={handleToggle}
        className="w-5 h-5 text-royal-purple bg-white border-2 border-royal-purple/30 rounded focus:ring-offset-0 cursor-pointer transition-all duration-200 hover:border-royal-purple/50 checked:bg-royal-purple checked:border-royal-purple"
      />
    </div>
  );
});

const SelectEditor = memo(function SelectEditor({
  row,
  column,
  onRowChange,
  onClose,
}: RenderEditCellProps<SheetData>) {
  const value = row[column.key as keyof SheetData]?.toString() || "";
  const options = (column as any).options || [];

  const handleChange = useCallback(
    (newValue: string) => {
      onRowChange({ ...row, [column.key]: newValue });
      onClose(true);
    },
    [row, column.key, onRowChange, onClose]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger className="h-8 border-0 focus:border-0 text-sm transition-colors duration-200 focus:ring-0 focus:outline-none focus-visible:ring-0 rounded-none bg-transparent">
        <SelectValue placeholder="Select option" />
      </SelectTrigger>
      <SelectContent className="bg-white dark:bg-background border border-royal-purple/20 dark:border-border shadow-lg max-h-60 z-50">
        {options.map((option: string) => (
          <SelectItem
            key={option}
            value={option}
            className="text-sm transition-colors duration-200 hover:bg-royal-purple/10 focus:bg-royal-purple/20 focus:text-royal-purple"
          >
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});

const NumberEditor = memo(function NumberEditor({
  row,
  column,
  onRowChange,
  onClose,
}: RenderEditCellProps<SheetData>) {
  const [value, setValue] = useState(() => {
    const cellValue = row[column.key as keyof SheetData];
    return cellValue?.toString() || "";
  });

  const handleSave = useCallback(() => {
    const processedValue = parseFloat(value) || 0;
    onRowChange({ ...row, [column.key]: processedValue });
    onClose(true);
  }, [value, row, column.key, onRowChange, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Escape") {
        onClose(false);
      }
    },
    [handleSave, onClose]
  );

  return (
    <Input
      type="number"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleSave}
      onKeyDown={handleKeyDown}
      autoFocus
      className="h-8 border-2 border-royal-purple focus:border-royal-purple focus:ring-0 focus:outline-none focus-visible:ring-0 rounded-none"
    />
  );
});

// Custom cell renderers
const BooleanFormatter = memo(function BooleanFormatter({
  row,
  column,
}: RenderCellProps<SheetData>) {
  const value = !!row[column.key as keyof SheetData];
  return (
    <div className="flex items-center justify-center h-8 w-full px-2 border-r border-b border-border">
      <span
        className={`text-sm font-medium ${
          value ? "text-royal-purple font-semibold" : "text-muted-foreground"
        }`}
      >
        {value ? "Yes" : "No"}
      </span>
    </div>
  );
});

const DateFormatter = memo(function DateFormatter({
  row,
  column,
}: RenderCellProps<SheetData>) {
  const value = row[column.key as keyof SheetData];

  if (!value)
    return (
      <div className="h-8 w-full flex items-center text-sm text-muted-foreground px-2 border-r border-b border-border">
        -
      </div>
    );

  try {
    let date: Date | null = null;

    // Handle Firestore Timestamp objects
    if (
      value &&
      typeof value === "object" &&
      "toDate" in value &&
      typeof (value as any).toDate === "function"
    ) {
      date = (value as any).toDate();
    }
    // Handle Firestore timestamp objects with seconds property
    else if (
      value &&
      typeof value === "object" &&
      "seconds" in value &&
      typeof (value as any).seconds === "number"
    ) {
      date = new Date((value as any).seconds * 1000);
    }
    // Handle numeric timestamps (milliseconds)
    else if (typeof value === "number") {
      // Check if it's a timestamp in milliseconds or seconds
      if (value > 1000000000000) {
        // Milliseconds timestamp
        date = new Date(value);
      } else {
        // Seconds timestamp
        date = new Date(value * 1000);
      }
    }
    // Handle string timestamps or date strings
    else if (typeof value === "string") {
      // Check if it's a numeric string (timestamp)
      const numericValue = parseFloat(value);
      if (!isNaN(numericValue)) {
        if (numericValue > 1000000000000) {
          // Milliseconds timestamp
          date = new Date(numericValue);
        } else {
          // Seconds timestamp
          date = new Date(numericValue * 1000);
        }
      } else {
        // Regular date string
        date = new Date(value);
      }
    }
    // Handle Date objects
    else if (value instanceof Date) {
      date = value;
    }

    if (date && !isNaN(date.getTime())) {
      return (
        <div className="h-8 w-full flex items-center text-sm px-2 border-r border-b border-border">
          {date.toLocaleDateString()}
        </div>
      );
    }
  } catch (error) {
    console.error("Error parsing date:", value, error);
  }

  return (
    <div className="h-8 w-full flex items-center text-sm text-destructive px-2 border-r border-b border-border">
      Invalid Date
    </div>
  );
});

const CurrencyFormatter = memo(function CurrencyFormatter({
  row,
  column,
}: RenderCellProps<SheetData>) {
  const value = row[column.key as keyof SheetData];
  const formatted = value
    ? `€${parseFloat(value.toString()).toLocaleString()}`
    : "";
  return (
    <div className="h-8 w-full flex items-center text-sm px-2 border-r border-b border-border">
      {formatted}
    </div>
  );
});

const FunctionFormatter = memo(function FunctionFormatter({
  row,
  column,
}: RenderCellProps<SheetData>) {
  const columnDef = (column as any).columnDef as SheetColumn;
  const deleteRow = (column as any).deleteRow as
    | ((rowId: string) => void)
    | undefined;
  const availableFunctions = (column as any)
    .availableFunctions as TypeScriptFunction[];

  const [showFunctionPopup, setShowFunctionPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showFunctionPopup) {
        setShowFunctionPopup(false);
      }
    };

    if (showFunctionPopup) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showFunctionPopup]);

  // Close popup when arrow keys are pressed
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        showFunctionPopup &&
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
      ) {
        setShowFunctionPopup(false);
      }
    };

    if (showFunctionPopup) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showFunctionPopup]);

  if (columnDef.id === "delete") {
    return (
      <div className="h-8 w-full flex items-center justify-center px-2 border-r border-b border-border">
        <Button
          variant="destructive"
          size="sm"
          className="bg-crimson-red hover:bg-crimson-red/90"
          onClick={() => {
            if (deleteRow) {
              deleteRow(row.id);
            }
          }}
        >
          Delete
        </Button>
      </div>
    );
  }

  const value = row[column.key as keyof SheetData];
  const functionId = columnDef.function;
  const functionDetails = availableFunctions?.find((f) => f.id === functionId);

  const handleCellClick = (e: React.MouseEvent) => {
    if (functionDetails) {
      const rect = e.currentTarget.getBoundingClientRect();
      const popupWidth = 300; // Approximate popup width
      const popupHeight = 200; // Approximate popup height

      // Calculate position with boundary detection
      let x = rect.left - 200 + rect.width / 2 - popupWidth / 2; // Center horizontally
      let y = rect.top - 100 - popupHeight - 10; // Above the cell

      // Boundary checks
      if (x < 10) x = 10; // Left boundary
      if (x + popupWidth > window.innerWidth - 10) {
        x = window.innerWidth - popupWidth - 10; // Right boundary
      }

      if (y < 10) {
        // If not enough space above, position below
        y = rect.bottom + 10;
      }

      setPopupPosition({ x, y });
      setShowFunctionPopup(true);
    }
  };

  return (
    <>
      <div
        className="h-8 w-full flex items-center text-sm px-2 border-r border-b border-border cursor-pointer hover:bg-gray-50"
        onClick={handleCellClick}
        title={
          functionDetails
            ? `Click to view function details: ${functionDetails.name}`
            : ""
        }
      >
        {value?.toString() || ""}
      </div>

      {showFunctionPopup && functionDetails && (
        <div
          className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm"
          style={{
            left: popupPosition.x,
            top: popupPosition.y,
          }}
        >
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-gray-900">
              {functionDetails.name}
            </h3>
            <button
              onClick={() => setShowFunctionPopup(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium text-gray-700">Function Name:</span>
              <span className="ml-2 text-gray-600">
                {functionDetails.functionName}
              </span>
            </div>

            <div>
              <span className="font-medium text-gray-700">File Type:</span>
              <span className="ml-2 text-gray-600">
                {functionDetails.fileType}
              </span>
            </div>

            <div>
              <span className="font-medium text-gray-700">Export Type:</span>
              <span className="ml-2 text-gray-600">
                {functionDetails.exportType}
              </span>
            </div>

            <div>
              <span className="font-medium text-gray-700">Parameters:</span>
              <span className="ml-2 text-gray-600">
                {functionDetails.parameterCount}
              </span>
            </div>

            {functionDetails.arguments &&
              functionDetails.arguments.length > 0 && (
                <div>
                  <span className="font-medium text-gray-700">Arguments:</span>
                  <ul className="ml-2 mt-1 space-y-1">
                    {functionDetails.arguments.map((arg, index) => (
                      <li key={index} className="text-gray-600">
                        • {arg.name}: {arg.type}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            <div>
              <span className="font-medium text-gray-700">Status:</span>
              <span
                className={`ml-2 ${
                  functionDetails.isActive ? "text-green-600" : "text-red-600"
                }`}
              >
                {functionDetails.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

interface BookingsDataGridProps {
  columns: SheetColumn[];
  data: SheetData[];
  updateColumn: (column: SheetColumn) => void;
  deleteColumn: (columnId: string) => void;
  updateData: (data: SheetData[]) => void;
  updateRow: (rowId: string, updates: Partial<SheetData>) => void;
  deleteRow: (rowId: string) => void;
  availableFunctions: TypeScriptFunction[];
}

export default function BookingsDataGrid({
  columns,
  data,
  updateColumn,
  deleteColumn,
  updateData,
  updateRow,
  deleteRow,
  availableFunctions,
}: BookingsDataGridProps) {
  const { toast } = useToast();
  const [selectedCell, setSelectedCell] = useState<{
    rowId: string;
    columnId: string;
  } | null>(null);
  const [columnSettingsModal, setColumnSettingsModal] = useState<{
    isOpen: boolean;
    column: SheetColumn | null;
  }>({ isOpen: false, column: null });
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [sortColumns, setSortColumns] = useState<readonly SortColumn[]>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [localData, setLocalData] = useState<SheetData[]>([]);
  const functionSubscriptionsRef = useRef<Map<string, () => void>>(new Map());

  // Enhanced filtering state
  const [columnFilters, setColumnFilters] = useState<Record<string, any>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [dateRangeFilters, setDateRangeFilters] = useState<
    Record<string, { from?: Date; to?: Date }>
  >({});
  const [currencyRangeFilters, setCurrencyRangeFilters] = useState<
    Record<string, { min?: number; max?: number }>
  >({});

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Debounced resize handler
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced function to update column width in Firebase
  const debouncedUpdateColumnWidth = useCallback(
    async (columnId: string, newWidth: number) => {
      // Clear any existing timeout
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }

      // Set a new timeout
      resizeTimeoutRef.current = setTimeout(async () => {
        try {
          const columnToUpdate = columns.find((col) => col.id === columnId);
          if (columnToUpdate) {
            const updatedColumn = {
              ...columnToUpdate,
              width: newWidth,
            };

            console.log("📏 Debounced update - updating column width:", {
              columnId,
              newWidth,
              columnName: columnToUpdate.columnName,
            });

            await updateColumn(updatedColumn);
            console.log(
              "✅ Debounced column width updated in Firebase successfully"
            );
          }
        } catch (error) {
          console.error("❌ Failed to update column width in Firebase:", error);
        }
      }, 300); // 300ms delay
    },
    [columns, updateColumn]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

  // Sync local data with props data
  useEffect(() => {
    setLocalData(data);
  }, [data]);

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
    [columns]
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

  // Recompute only direct dependent function columns for a single row
  const recomputeDirectDependentsForRow = useCallback(
    async (rowId: string, changedColumnId: string, updatedValue: any) => {
      const changedCol = columns.find((c) => c.id === changedColumnId);
      if (!changedCol || !changedCol.columnName) return;

      // Build a working snapshot of the row values
      const baseRow =
        localData.find((r) => r.id === rowId) ||
        data.find((r) => r.id === rowId) ||
        ({ id: rowId } as SheetData);
      const rowSnapshot: SheetData = {
        ...baseRow,
        [changedColumnId]: updatedValue,
      };

      const directDependents = dependencyGraph.get(changedCol.columnName) || [];
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
        let isInitialCallback = true; // Flag to skip the first callback

        const unsubscribe =
          typescriptFunctionsService.subscribeToFunctionChanges(
            funcId,
            (updated) => {
              // Skip the initial callback from Firestore subscription
              if (isInitialCallback) {
                isInitialCallback = false;
                return;
              }

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

    // Clean up subscriptions for functions no longer in use
    const currentSubscriptions = Array.from(
      functionSubscriptionsRef.current.keys()
    );
    currentSubscriptions.forEach((funcId) => {
      if (!inUseFunctionIds.has(funcId)) {
        const unsubscribe = functionSubscriptionsRef.current.get(funcId);
        if (unsubscribe) {
          unsubscribe();
          functionSubscriptionsRef.current.delete(funcId);
        }
      }
    });

    // Cleanup on unmount
    return () => {
      functionSubscriptionsRef.current.forEach((unsubscribe) => unsubscribe());
      functionSubscriptionsRef.current.clear();
    };
  }, [columns, recomputeForFunction]);

  // Enhanced filtering and sorting logic
  const filteredAndSortedData = useMemo(() => {
    let filtered = localData.length > 0 ? localData : data;

    // Apply global filter
    if (globalFilter) {
      filtered = filtered.filter((row) => {
        return Object.values(row).some((value) => {
          if (value === null || value === undefined) return false;
          return value
            .toString()
            .toLowerCase()
            .includes(globalFilter.toLowerCase());
        });
      });
    }

    // Apply column-specific filters
    filtered = filtered.filter((row) => {
      return columns.every((col) => {
        const columnKey = col.id;
        const cellValue = row[columnKey as keyof SheetData];

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
    });

    // Apply sorting
    if (sortColumns.length > 0) {
      filtered = [...filtered].sort((a, b) => {
        for (const sort of sortColumns) {
          const aValue = a[sort.columnKey as keyof SheetData];
          const bValue = b[sort.columnKey as keyof SheetData];

          if (aValue === bValue) continue;

          let comparison = 0;
          if (aValue < bValue) comparison = -1;
          else if (aValue > bValue) comparison = 1;

          return sort.direction === "DESC" ? -comparison : comparison;
        }
        return 0;
      });
    }

    return filtered;
  }, [
    localData,
    data,
    globalFilter,
    sortColumns,
    columnFilters,
    dateRangeFilters,
    currencyRangeFilters,
    columns,
  ]);

  // Filter management functions
  const clearAllFilters = useCallback(() => {
    setGlobalFilter("");
    setColumnFilters({});
    setDateRangeFilters({});
    setCurrencyRangeFilters({});
  }, []);

  const clearColumnFilter = useCallback((columnId: string) => {
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
  }, []);

  const getActiveFiltersCount = useCallback(() => {
    let count = 0;
    if (globalFilter) count++;
    count += Object.keys(columnFilters).length;
    count += Object.keys(dateRangeFilters).length;
    count += Object.keys(currencyRangeFilters).length;
    return count;
  }, [globalFilter, columnFilters, dateRangeFilters, currencyRangeFilters]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredAndSortedData.length / pageSize);
  const startIndex = currentPage * pageSize;
  const endIndex = startIndex + pageSize;
  const currentPageData = filteredAndSortedData.slice(startIndex, endIndex);

  // Calculate if we need to show empty rows
  const hasSpaceForMoreRows = currentPageData.length < pageSize;
  const rowsToShow = hasSpaceForMoreRows ? pageSize : currentPageData.length;

  // Calculate dynamic height based on number of rows
  const rowHeight = 32; // Height of each row in pixels
  const headerHeight = 40; // Height of header row in pixels
  //   const dynamicHeight = rowsToShow * rowHeight + headerHeight + 150;
  const dynamicHeight = 450;

  // Helper function to render empty row cells
  const renderEmptyRowCell = (
    column: any,
    isFirstEmptyRow: boolean,
    shouldShowAddButton: boolean
  ) => {
    const isFirstColumn = column.key === columns[0]?.id;

    if (isFirstColumn && shouldShowAddButton) {
      return (
        <div
          className={`h-8 w-full flex items-center px-2 border-r border-b border-border ${
            isFirstEmptyRow ? "opacity-100" : "opacity-60"
          }`}
        >
          <Button
            onClick={handleAddNewRow}
            disabled={isAddingRow}
            className="bg-royal-purple hover:bg-royal-purple/90 h-6 px-2 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Row
          </Button>
        </div>
      );
    }

    return (
      <div
        className={`h-8 w-full flex items-center text-sm px-2 border-r border-b border-border ${
          isFirstEmptyRow ? "opacity-100" : "opacity-60"
        }`}
      >
        -
      </div>
    );
  };

  // Create data with empty rows for layout
  const dataWithEmptyRows = useMemo(() => {
    const dataRows = currentPageData.map((row, index) => ({
      ...row,
      _isDataRow: true,
      _displayIndex: startIndex + index,
    }));

    // Add empty rows to reach minimum
    const emptyRows = [];
    const hasActiveFilters = getActiveFiltersCount() > 0;

    for (let i = currentPageData.length; i < rowsToShow; i++) {
      const isFirstEmptyRow = i === currentPageData.length;
      const actualRowNumber = startIndex + i;

      emptyRows.push({
        id: `empty-${i}`,
        _isDataRow: false,
        _isEmptyRow: true,
        _isFirstEmptyRow: isFirstEmptyRow,
        _displayIndex: actualRowNumber,
        _shouldShowAddButton:
          hasSpaceForMoreRows && isFirstEmptyRow && !hasActiveFilters,
      });
    }

    return [...dataRows, ...emptyRows];
  }, [
    currentPageData,
    rowsToShow,
    hasSpaceForMoreRows,
    startIndex,
    getActiveFiltersCount,
  ]);

  // Convert SheetColumn to react-data-grid Column format
  const gridColumns = useMemo<Column<SheetData>[]>(() => {
    // Safety check for columns
    if (!columns || !Array.isArray(columns)) {
      console.warn("Invalid columns array:", columns);
      return [];
    }

    // Add row number column first
    const rowNumberColumn: Column<SheetData> = {
      key: "rowNumber",
      name: "#",
      width: 64,
      resizable: false,
      sortable: false,
      frozen: true,
      editable: false,
      renderHeaderCell: () => {
        return (
          <div className="flex flex-col w-full h-full relative overflow-visible">
            {/* Parent Tab Row */}
            <div
              className="bg-gray-400 border-b border-r border-gray-400 px-2 py-1 text-lg font-semibold text-white uppercase tracking-wide absolute top-0 left-0 z-10 w-full flex items-center"
              style={{ height: "40px" }}
            >
              Row
            </div>
            {/* Column Name Row */}
            <div className="flex items-center justify-center flex-1 px-2 mt-10">
              <span className="font-medium text-foreground">#</span>
            </div>
          </div>
        );
      },
      renderCell: ({ row }) => {
        const isDataRow = (row as any)._isDataRow;
        const isEmptyRow = (row as any)._isEmptyRow;
        const isFirstEmptyRow = (row as any)._isFirstEmptyRow;
        const shouldShowAddButton = (row as any)._shouldShowAddButton;
        const displayIndex = (row as any)._displayIndex;

        if (isEmptyRow) {
          return (
            <div
              className={`h-8 w-16 flex items-center justify-center text-sm font-mono px-2 border-r border-b border-border bg-muted relative z-[999999999] ${
                isFirstEmptyRow
                  ? "text-muted-foreground"
                  : "text-muted-foreground/60"
              }`}
            >
              {displayIndex}
            </div>
          );
        }

        const rowNumber = parseInt(row.id);
        return (
          <div className="h-8 w-16 flex items-center justify-center text-sm font-mono text-foreground px-2 border-r border-b border-border bg-muted relative z-[999999999]">
            {!isNaN(rowNumber) ? rowNumber : "-"}
          </div>
        );
      },
    };

    // Add background color styling for the row number column
    (rowNumberColumn as any).headerCellClass =
      "bg-muted border-l border-r border-border h-20 !p-0"; // Increased height for two-row header, no padding
    (rowNumberColumn as any).cellClass = "bg-muted";

    const dataColumns = columns
      .filter((col) => col && col.id && col.columnName) // Filter out invalid columns
      .sort((a, b) => a.order - b.order)
      .map((col) => {
        const baseColumn: Column<SheetData> = {
          key: col.id,
          name: col.columnName,
          width: col.width || 150,
          resizable: true,
          sortable: false,
        };

        // Add group-based background styling for cells
        const parentTab = col.parentTab || "General";
        const sortedColumns = columns
          .filter((c) => c && c.id && c.columnName)
          .sort((a, b) => a.order - b.order);
        const currentIndex = sortedColumns.findIndex((c) => c.id === col.id);
        const isFirstInGroup =
          currentIndex === 0 ||
          sortedColumns[currentIndex - 1].parentTab !== parentTab;
        const isLastInGroup =
          currentIndex === sortedColumns.length - 1 ||
          sortedColumns[currentIndex + 1].parentTab !== parentTab;

        // Apply group-based cell styling
        let cellClass = "";
        if (isFirstInGroup && isLastInGroup) {
          // Single column group
          cellClass = "bg-gray-100 border-l border-r border-gray-300";
        } else if (isFirstInGroup) {
          // First column in group
          cellClass = "bg-gray-100 border-l border-r border-gray-300";
        } else if (isLastInGroup) {
          // Last column in group
          cellClass = "bg-gray-100 border-l border-r border-gray-300";
        } else {
          // Middle column in group
          cellClass = "bg-gray-100 border-l border-r border-gray-300";
        }

        // Override with individual column color if specified and not "none"
        if (col.color && col.color !== "none") {
          const colorClasses = {
            purple:
              "bg-royal-purple/8 border-l border-r border-royal-purple/40 text-black",
            blue: "bg-blue-100 border-l border-r border-royal-purple/40 text-black",
            green:
              "bg-green-100 border-l border-r border-royal-purple/40 text-black",
            yellow:
              "bg-yellow-100 border-l border-r border-royal-purple/40 text-black",
            orange:
              "bg-orange-100 border-l border-r border-royal-purple/40 text-black",
            red: "bg-red-100 border-l border-r border-royal-purple/40 text-black",
            pink: "bg-pink-100 border-l border-r border-royal-purple/40 text-black",
            cyan: "bg-cyan-100 border-l border-r border-royal-purple/40 text-black",
            gray: "bg-gray-100 border-l border-r border-royal-purple/40 text-black",
          };
          cellClass = colorClasses[col.color] || cellClass;
        }

        // Apply cell styling
        (baseColumn as any).cellClass = cellClass;

        // Add header height styling for two-row header structure and remove padding
        (baseColumn as any).headerCellClass = "h-20 !p-0"; // Increased height for two-row header, no padding

        // Add custom header with parent tab (no sorting indicators)
        baseColumn.renderHeaderCell = ({ column }) => {
          const parentTab = col.parentTab || "General";

          // Find the current column index in the sorted columns
          const sortedColumns = columns
            .filter((c) => c && c.id && c.columnName)
            .sort((a, b) => a.order - b.order);
          const currentIndex = sortedColumns.findIndex((c) => c.id === col.id);

          // Check if this is the first column in a group of same parent tabs
          const isFirstInGroup =
            currentIndex === 0 ||
            sortedColumns[currentIndex - 1].parentTab !== parentTab;

          // Check if this is the last column in a group of same parent tabs
          const isLastInGroup =
            currentIndex === sortedColumns.length - 1 ||
            sortedColumns[currentIndex + 1].parentTab !== parentTab;

          // Calculate the width of the merged parent tab cell
          let parentTabWidth = column.width || 150;
          if (isFirstInGroup && !isLastInGroup) {
            // Calculate total width of all columns in this parent tab group
            let groupWidth = 0;
            for (let i = currentIndex; i < sortedColumns.length; i++) {
              if (sortedColumns[i].parentTab === parentTab) {
                groupWidth += sortedColumns[i].width || 150;
              } else {
                break;
              }
            }
            parentTabWidth = groupWidth;
          }

          return (
            <div className="flex flex-col w-full h-full relative">
              {/* Parent Tab Row - only show if first in group */}
              {isFirstInGroup && isLastInGroup && (
                <div
                  className="parent-tab-seperator bg-gray-400 border-r border-l border-gray-900 px-2 py-1 text-lg font-semibold text-white uppercase tracking-wide absolute top-0 left-0 z-10 flex items-center"
                  style={{ height: "40px" }}
                >
                  <div className="z-[999999999] flex items-center justify-center w-full">
                    {parentTab}
                  </div>
                </div>
              )}
              {isFirstInGroup && !isLastInGroup && (
                <div
                  className="parent-tab-seperator bg-gray-400 border-r border-gray-900 px-2 py-1 text-lg font-semibold text-white uppercase tracking-wide absolute top-0 left-0 z-10 flex items-center"
                  style={{
                    width: `${parentTabWidth}px`,
                    height: "40px",
                  }}
                >
                  <div className="z-[999999999] flex items-center justify-center ">
                    {parentTab}
                  </div>
                </div>
              )}
              {/* Background for all columns in the group - only show if NOT first in group */}
              {!isFirstInGroup && (
                <div
                  className="bg-gray-400 absolute top-0 left-0 z-5 w-full"
                  style={{ height: "40px" }}
                />
              )}
              {/* Background for last column in the group */}
              {isLastInGroup && (
                <div
                  className="bg-gray-400 border-r border-gray-900 absolute top-0 left-0 z-5 w-full"
                  style={{ height: "40px" }}
                />
              )}

              {/* Column Name Row */}
              <div className="flex items-center justify-center flex-1 px-2 mt-10">
                <div className="flex items-center gap-1">
                  {col.dataType === "function" && (
                    <FunctionSquare className="h-4 w-4 text-red-600" />
                  )}
                  <span className="font-medium truncate text-foreground">
                    {column.name}
                  </span>
                </div>
              </div>
            </div>
          );
        };

        // Add column-specific properties
        if (col.dataType === "boolean") {
          // Always render checkbox input for boolean columns
          baseColumn.renderCell = ({ row, column }) => {
            const cellValue = !!row[column.key as keyof SheetData];

            console.log("🔧 Boolean cell rendered (always input):", {
              columnName: col.columnName,
              rowId: row.id,
              columnKey: column.key,
              cellValue,
            });

            const hasColor = col.color && col.color !== "none";

            return (
              <div className="h-8 w-full flex items-center justify-center px-2 border-r border-b border-border">
                <input
                  type="checkbox"
                  checked={cellValue}
                  onChange={async (e) => {
                    const newValue = e.target.checked;
                    console.log("🔧 Boolean input changed:", {
                      rowId: row.id,
                      columnKey: column.key,
                      newValue,
                      originalValue: cellValue,
                    });

                    // Update local data immediately
                    setLocalData((prev) =>
                      prev.map((r) =>
                        r.id === row.id ? { ...r, [column.key]: newValue } : r
                      )
                    );

                    // Save to Firestore
                    try {
                      await bookingService.updateBookingField(
                        row.id,
                        column.key,
                        newValue
                      );
                      console.log("🔧 Boolean saved to Firestore successfully");
                    } catch (error) {
                      console.error(
                        "❌ Failed to save boolean to Firestore:",
                        error
                      );
                      // Revert local change on error
                      setLocalData((prev) =>
                        prev.map((r) =>
                          r.id === row.id
                            ? { ...r, [column.key]: cellValue }
                            : r
                        )
                      );
                    }
                  }}
                  className="w-5 h-5 text-royal-purple bg-white border-2 border-royal-purple/30 rounded focus:ring-offset-0 cursor-pointer transition-all duration-200 hover:border-royal-purple/50 checked:bg-royal-purple checked:border-royal-purple"
                />
              </div>
            );
          };
          baseColumn.editable = false; // We handle editing through the checkbox
          console.log("🔧 Boolean column configured (always input):", {
            columnName: col.columnName,
            hasRenderCell: !!baseColumn.renderCell,
            editable: baseColumn.editable,
          });
        } else if (col.dataType === "date") {
          // Always render date input for date columns
          baseColumn.renderCell = ({ row, column }) => {
            const isEmptyRow = (row as any)._isEmptyRow;
            const isFirstEmptyRow = (row as any)._isFirstEmptyRow;
            const shouldShowAddButton = (row as any)._shouldShowAddButton;

            if (isEmptyRow) {
              return renderEmptyRowCell(
                column,
                isFirstEmptyRow,
                shouldShowAddButton
              );
            }

            const cellValue = row[column.key as keyof SheetData];

            console.log("📅 Date cell rendered (always input):", {
              columnName: col.columnName,
              rowId: row.id,
              columnKey: column.key,
              cellValue,
            });

            const hasColor = col.color && col.color !== "none";

            return (
              <input
                type="date"
                value={(() => {
                  if (cellValue) {
                    try {
                      let date: Date | null = null;
                      if (
                        cellValue &&
                        typeof cellValue === "object" &&
                        "toDate" in cellValue &&
                        typeof (cellValue as any).toDate === "function"
                      ) {
                        date = (cellValue as any).toDate();
                      } else if (
                        cellValue &&
                        typeof cellValue === "object" &&
                        "seconds" in cellValue &&
                        typeof (cellValue as any).seconds === "number"
                      ) {
                        date = new Date((cellValue as any).seconds * 1000);
                      } else if (typeof cellValue === "number") {
                        if (cellValue > 1000000000000) {
                          date = new Date(cellValue);
                        } else {
                          date = new Date(cellValue * 1000);
                        }
                      } else if (typeof cellValue === "string") {
                        const numericValue = parseFloat(cellValue);
                        if (!isNaN(numericValue)) {
                          if (numericValue > 1000000000000) {
                            date = new Date(numericValue);
                          } else {
                            date = new Date(numericValue * 1000);
                          }
                        } else {
                          date = new Date(cellValue);
                        }
                      } else if (cellValue instanceof Date) {
                        date = cellValue;
                      }
                      if (date && !isNaN(date.getTime())) {
                        return date.toISOString().split("T")[0];
                      }
                    } catch (error) {
                      console.error("Error parsing date:", error);
                    }
                  }
                  return "";
                })()}
                onChange={async (e) => {
                  const newValue = e.target.value
                    ? new Date(e.target.value)
                    : null;
                  console.log("📅 Date input changed:", {
                    rowId: row.id,
                    columnKey: column.key,
                    newValue,
                    originalValue: cellValue,
                  });

                  // Update local data immediately
                  setLocalData((prev) =>
                    prev.map((r) =>
                      r.id === row.id ? { ...r, [column.key]: newValue } : r
                    )
                  );

                  // Save to Firestore
                  try {
                    await bookingService.updateBookingField(
                      row.id,
                      column.key,
                      newValue
                    );
                    console.log("📅 Date saved to Firestore successfully");
                  } catch (error) {
                    console.error(
                      "❌ Failed to save date to Firestore:",
                      error
                    );
                    // Revert local change on error
                    setLocalData((prev) =>
                      prev.map((r) =>
                        r.id === row.id ? { ...r, [column.key]: cellValue } : r
                      )
                    );
                  }
                }}
                className={`h-8 w-full border-0 focus:border-2 focus:border-royal-purple focus:ring-0 focus:outline-none focus-visible:ring-0 rounded-none text-sm px-2 ${
                  hasColor ? "text-black" : ""
                }`}
                style={{ backgroundColor: "transparent" }}
              />
            );
          };
          baseColumn.editable = false; // We handle editing through the input
          console.log("📅 Date column configured (always input):", {
            columnName: col.columnName,
            hasRenderCell: !!baseColumn.renderCell,
            editable: baseColumn.editable,
          });
        } else if (col.dataType === "select") {
          // Always render select input for select columns
          baseColumn.renderCell = ({ row, column }) => {
            const isEmptyRow = (row as any)._isEmptyRow;
            const isFirstEmptyRow = (row as any)._isFirstEmptyRow;
            const shouldShowAddButton = (row as any)._shouldShowAddButton;

            if (isEmptyRow) {
              return renderEmptyRowCell(
                column,
                isFirstEmptyRow,
                shouldShowAddButton
              );
            }

            const cellValue = row[column.key as keyof SheetData];
            const options = col.options || [];
            const hasColor = col.color && col.color !== "none";

            console.log("📋 Select cell rendered (always input):", {
              columnName: col.columnName,
              rowId: row.id,
              columnKey: column.key,
              cellValue,
              options,
            });

            return (
              <select
                value={cellValue?.toString() || ""}
                onChange={async (e) => {
                  const newValue = e.target.value;
                  console.log("📋 Select input changed:", {
                    rowId: row.id,
                    columnKey: column.key,
                    newValue,
                    originalValue: cellValue,
                  });

                  // Update local data immediately
                  setLocalData((prev) =>
                    prev.map((r) =>
                      r.id === row.id ? { ...r, [column.key]: newValue } : r
                    )
                  );

                  // Save to Firestore
                  try {
                    await bookingService.updateBookingField(
                      row.id,
                      column.key,
                      newValue
                    );
                    console.log("📋 Select saved to Firestore successfully");
                  } catch (error) {
                    console.error(
                      "❌ Failed to save select to Firestore:",
                      error
                    );
                    // Revert local change on error
                    setLocalData((prev) =>
                      prev.map((r) =>
                        r.id === row.id ? { ...r, [column.key]: cellValue } : r
                      )
                    );
                  }
                }}
                className={`h-8 w-full border-0 focus:border-2 focus:border-royal-purple focus:ring-0 focus:outline-none focus-visible:ring-0 rounded-none text-sm px-2 ${
                  hasColor ? "text-black" : ""
                }`}
                style={{ backgroundColor: "transparent" }}
              >
                <option value="">Select option</option>
                {options.map((option: string) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            );
          };
          baseColumn.editable = false; // We handle editing through the select
          console.log("📋 Select column configured (always input):", {
            columnName: col.columnName,
            hasRenderCell: !!baseColumn.renderCell,
            editable: baseColumn.editable,
            options: col.options,
          });
        } else if (col.dataType === "currency") {
          // Always render currency input for currency columns
          baseColumn.renderCell = ({ row, column }) => {
            const cellValue = row[column.key as keyof SheetData];
            const numericValue =
              typeof cellValue === "number"
                ? cellValue
                : parseFloat(cellValue?.toString() || "0") || 0;
            const hasColor = col.color && col.color !== "none";

            console.log("💰 Currency cell rendered (always input):", {
              columnName: col.columnName,
              rowId: row.id,
              columnKey: column.key,
              cellValue,
              numericValue,
            });

            return (
              <input
                type="number"
                step="0.01"
                value={numericValue || ""}
                onChange={async (e) => {
                  const newValue = parseFloat(e.target.value) || 0;
                  console.log("💰 Currency input changed:", {
                    rowId: row.id,
                    columnKey: column.key,
                    newValue,
                    originalValue: cellValue,
                  });

                  // Update local data immediately
                  setLocalData((prev) =>
                    prev.map((r) =>
                      r.id === row.id ? { ...r, [column.key]: newValue } : r
                    )
                  );

                  // Save to Firestore
                  try {
                    await bookingService.updateBookingField(
                      row.id,
                      column.key,
                      newValue
                    );
                    console.log("💰 Currency saved to Firestore successfully");
                  } catch (error) {
                    console.error(
                      "❌ Failed to save currency to Firestore:",
                      error
                    );
                    // Revert local change on error
                    setLocalData((prev) =>
                      prev.map((r) =>
                        r.id === row.id ? { ...r, [column.key]: cellValue } : r
                      )
                    );
                  }
                }}
                className={`h-8 w-full border-0 focus:border-2 focus:border-royal-purple focus:ring-0 focus:outline-none focus-visible:ring-0 rounded-none text-sm px-2 ${
                  hasColor ? "text-black" : ""
                }`}
                style={{ backgroundColor: "transparent" }}
                placeholder="0.00"
              />
            );
          };
          baseColumn.editable = false; // We handle editing through the input
          console.log("💰 Currency column configured (always input):", {
            columnName: col.columnName,
            hasRenderCell: !!baseColumn.renderCell,
            editable: baseColumn.editable,
          });
        } else if (col.dataType === "function") {
          baseColumn.renderCell = ({ row, column }) => {
            const isEmptyRow = (row as any)._isEmptyRow;
            const isFirstEmptyRow = (row as any)._isFirstEmptyRow;
            const shouldShowAddButton = (row as any)._shouldShowAddButton;

            if (isEmptyRow) {
              return renderEmptyRowCell(
                column,
                isFirstEmptyRow,
                shouldShowAddButton
              );
            }

            return (
              <div className="h-8 w-full flex items-center px-2 border-r border-b border-gray-200">
                <FunctionFormatter row={row} column={column} />
              </div>
            );
          };
          baseColumn.sortable = false;
          baseColumn.editable = false;
          (baseColumn as any).columnDef = col;
          (baseColumn as any).deleteRow = deleteRow;
          (baseColumn as any).availableFunctions = availableFunctions;
        } else if (col.dataType === "number") {
          baseColumn.renderCell = ({ row, column }) => {
            const isEmptyRow = (row as any)._isEmptyRow;
            const isFirstEmptyRow = (row as any)._isFirstEmptyRow;
            const shouldShowAddButton = (row as any)._shouldShowAddButton;
            const hasColor = col.color && col.color !== "none";

            if (isEmptyRow) {
              return renderEmptyRowCell(
                column,
                isFirstEmptyRow,
                shouldShowAddButton
              );
            }

            return (
              <div
                className={`h-8 w-full flex items-center text-sm px-2 border-r border-b border-border ${
                  hasColor ? "text-black" : ""
                }`}
              >
                {row[column.key as keyof SheetData]?.toString() || ""}
              </div>
            );
          };
          baseColumn.renderEditCell = NumberEditor; // Use direct reference
          baseColumn.editable = true;
          console.log("🔢 Number column configured:", {
            columnName: col.columnName,
            hasRenderEditCell: !!baseColumn.renderEditCell,
          });
        } else {
          // Default renderer for string, email, etc.
          baseColumn.renderCell = ({ row, column }) => {
            const isEmptyRow = (row as any)._isEmptyRow;
            const isFirstEmptyRow = (row as any)._isFirstEmptyRow;
            const shouldShowAddButton = (row as any)._shouldShowAddButton;
            const hasColor = col.color && col.color !== "none";

            if (isEmptyRow) {
              return renderEmptyRowCell(
                column,
                isFirstEmptyRow,
                shouldShowAddButton
              );
            }

            return (
              <div
                className={`h-8 w-full flex items-center text-sm px-2 border-r border-b border-border ${
                  hasColor ? "text-black" : ""
                }`}
              >
                {row[column.key as keyof SheetData]?.toString() || ""}
              </div>
            );
          };
          baseColumn.renderEditCell = textEditor; // Use direct reference
          baseColumn.editable = true;
          console.log("📝 Text column configured:", {
            columnName: col.columnName,
            hasRenderEditCell: !!baseColumn.renderEditCell,
          });
        }

        // Ensure every column has a renderCell function
        if (!baseColumn.renderCell) {
          baseColumn.renderCell = ({ row, column }) => {
            const isEmptyRow = (row as any)._isEmptyRow;
            const isFirstEmptyRow = (row as any)._isFirstEmptyRow;
            const shouldShowAddButton = (row as any)._shouldShowAddButton;

            if (isEmptyRow) {
              return renderEmptyRowCell(
                column,
                isFirstEmptyRow,
                shouldShowAddButton
              );
            }

            return (
              <div className="h-8 w-full flex items-center text-sm px-2 border-r border-b border-gray-200">
                {row[column.key as keyof SheetData]?.toString() || ""}
              </div>
            );
          };
          baseColumn.renderEditCell = textEditor; // Use direct reference
          baseColumn.editable = true;
          console.log(
            "📝 Fallback text editor configured for column:",
            col.columnName
          );
        }

        return baseColumn;
      });

    const allColumns = [rowNumberColumn, ...dataColumns];

    // Ensure every column has a renderCell function
    const validatedColumns = allColumns.map((col) => {
      if (typeof col.renderCell !== "function") {
        console.warn(`Column ${col.key} missing renderCell, adding fallback`);
        return {
          ...col,
          renderCell: ({ row }: { row: SheetData }) => {
            const hasColor = col.color && col.color !== "none";
            return (
              <div
                className={`h-8 w-full flex items-center text-sm px-2 border-r border-b border-border ${
                  hasColor ? "text-black" : ""
                }`}
              >
                {row[col.key as keyof SheetData]?.toString() || ""}
              </div>
            );
          },
          renderEditCell: textEditor, // Use direct reference
          editable: true,
        };
      }
      return col;
    });

    // Debug logging
    console.log("All columns:", validatedColumns);
    console.log(
      "Grid columns:",
      validatedColumns.map((col) => ({
        key: col.key,
        name: col.name,
        hasRenderCell: typeof col.renderCell === "function",
        renderCellType: typeof col.renderCell,
      }))
    );

    // Validate all columns have renderCell
    const invalidColumns = validatedColumns.filter(
      (col) => typeof col.renderCell !== "function"
    );
    if (invalidColumns.length > 0) {
      console.error("Columns without renderCell:", invalidColumns);
    }

    return validatedColumns;
  }, [columns, deleteRow]);

  const handleAddNewRow = async () => {
    try {
      setIsAddingRow(true);
      const nextRowNumber = await bookingService.getNextRowNumber();
      const newRowId = nextRowNumber.toString();
      const newRow: SheetData = {
        id: newRowId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await bookingService.createOrUpdateBooking(newRowId, newRow);
      updateData([...data, newRow]);

      toast({
        title: "✅ New Row Added",
        description: `Row ${newRowId} created successfully`,
        variant: "default",
      });
    } catch (error) {
      console.error("❌ Failed to add new row:", error);
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

  const openColumnSettings = (column: SheetColumn) => {
    setColumnSettingsModal({ isOpen: true, column });
  };

  const handleColumnSave = (updatedColumn: SheetColumn) => {
    updateColumn(updatedColumn);
  };

  const handleColumnDelete = (columnId: string) => {
    deleteColumn(columnId);
  };

  return (
    <div className="booking-data-grid space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground font-hk-grotesk">
            All Bookings Data
          </h2>
          <p className="text-muted-foreground">
            Manage your bookings data with spreadsheets
          </p>
        </div>
      </div>

      {/* Enhanced Search and Filters */}
      <div className="space-y-4">
        {/* Main Search and Filter Controls */}
        <div className="bg-background border border-royal-purple/20 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search all columns..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-10 border-royal-purple/20 focus:border-royal-purple focus:ring-royal-purple/20 focus:outline-none focus-visible:ring-0"
              />
            </div>
            <Dialog open={showFilters} onOpenChange={setShowFilters}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                  {getActiveFiltersCount() > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {getActiveFiltersCount()}
                    </Badge>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg font-semibold text-gray-900">
                    Advanced Filters
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {columns.map((col) => {
                      if (col.dataType === "date") {
                        return (
                          <div key={col.id} className="space-y-2">
                            <Label className="text-xs font-medium text-gray-700">
                              {col.columnName} (Date Range)
                            </Label>
                            <div className="flex gap-2">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 justify-start text-left font-normal"
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRangeFilters[col.id]?.from
                                      ? dateRangeFilters[
                                          col.id
                                        ].from?.toLocaleDateString()
                                      : "From"}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                  className="w-auto p-0"
                                  align="start"
                                >
                                  <Calendar
                                    mode="single"
                                    selected={dateRangeFilters[col.id]?.from}
                                    onSelect={(date) =>
                                      setDateRangeFilters((prev) => ({
                                        ...prev,
                                        [col.id]: {
                                          ...prev[col.id],
                                          from: date,
                                        },
                                      }))
                                    }
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 justify-start text-left font-normal"
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRangeFilters[col.id]?.to
                                      ? dateRangeFilters[
                                          col.id
                                        ].to?.toLocaleDateString()
                                      : "To"}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                  className="w-auto p-0"
                                  align="start"
                                >
                                  <Calendar
                                    mode="single"
                                    selected={dateRangeFilters[col.id]?.to}
                                    onSelect={(date) =>
                                      setDateRangeFilters((prev) => ({
                                        ...prev,
                                        [col.id]: {
                                          ...prev[col.id],
                                          to: date,
                                        },
                                      }))
                                    }
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              {(dateRangeFilters[col.id]?.from ||
                                dateRangeFilters[col.id]?.to) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => clearColumnFilter(col.id)}
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
                            <Label className="text-xs font-medium text-gray-700">
                              {col.columnName} (Range)
                            </Label>
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="Min"
                                value={currencyRangeFilters[col.id]?.min || ""}
                                onChange={(e) =>
                                  setCurrencyRangeFilters((prev) => ({
                                    ...prev,
                                    [col.id]: {
                                      ...prev[col.id],
                                      min: e.target.value
                                        ? parseFloat(e.target.value)
                                        : undefined,
                                    },
                                  }))
                                }
                                className="text-xs"
                              />
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="Max"
                                value={currencyRangeFilters[col.id]?.max || ""}
                                onChange={(e) =>
                                  setCurrencyRangeFilters((prev) => ({
                                    ...prev,
                                    [col.id]: {
                                      ...prev[col.id],
                                      max: e.target.value
                                        ? parseFloat(e.target.value)
                                        : undefined,
                                    },
                                  }))
                                }
                                className="text-xs"
                              />
                              {(currencyRangeFilters[col.id]?.min !==
                                undefined ||
                                currencyRangeFilters[col.id]?.max !==
                                  undefined) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => clearColumnFilter(col.id)}
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
                          <Label className="text-xs font-medium text-gray-700">
                            {col.columnName}
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder={`Filter ${col.columnName}...`}
                              value={columnFilters[col.id] || ""}
                              onChange={(e) =>
                                setColumnFilters((prev) => ({
                                  ...prev,
                                  [col.id]: e.target.value,
                                }))
                              }
                              className="text-xs"
                            />
                            {columnFilters[col.id] && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => clearColumnFilter(col.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Modal Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-600">
                      {getActiveFiltersCount() > 0 && (
                        <span>
                          {getActiveFiltersCount()} filter
                          {getActiveFiltersCount() !== 1 ? "s" : ""} applied
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={clearAllFilters}
                        disabled={getActiveFiltersCount() === 0}
                      >
                        Clear All
                      </Button>
                      <Button
                        onClick={() => setShowFilters(false)}
                        className="bg-royal-purple hover:bg-royal-purple/90"
                      >
                        Apply Filters
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            {getActiveFiltersCount() > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Results Summary */}
        {/* <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            Showing {filteredAndSortedData.length} of {data.length} rows
            {getActiveFiltersCount() > 0 && (
              <span className="ml-2 text-royal-purple">
                ({getActiveFiltersCount()} filter
                {getActiveFiltersCount() !== 1 ? "s" : ""} applied)
              </span>
            )}
          </div>
        </div> */}
      </div>

      {/* Data Grid */}
      <div className="border border-royal-purple/20 rounded-md shadow-lg overflow-hidden">
        <TooltipProvider>
          <DataGrid
            columns={gridColumns}
            rows={dataWithEmptyRows}
            headerRowHeight={80}
            onRowsChange={(rows, { indexes, column }) => {
              // Filter out empty rows and only process data rows
              const dataRows = rows.filter(
                (row: any) => row._isDataRow !== false
              );
              const newData = dataRows as SheetData[];
              updateData(newData);
              setLocalData(newData);

              // Find the column definition for debugging
              const columnDef = column
                ? columns.find((col) => col.id === column.key)
                : null;

              console.log("🔄 Row change detected:", {
                indexes,
                column: column?.key,
                columnName: columnDef?.columnName,
                dataType: columnDef?.dataType,
                isEditable: columnDef?.dataType !== "function",
                rowsCount: rows.length,
              });

              // Update Firestore for each changed row
              indexes.forEach(async (index) => {
                const changedRow = rows[index] as SheetData;
                const originalRow = data.find(
                  (row) => row.id === changedRow.id
                );

                console.log("📝 Processing row change:", {
                  rowId: changedRow.id,
                  hasOriginal: !!originalRow,
                  column: column?.key,
                  columnName: columnDef?.columnName,
                  dataType: columnDef?.dataType,
                  isFunctionColumn: columnDef?.dataType === "function",
                });

                if (originalRow && column) {
                  // Single field change
                  const fieldKey = column.key as string;
                  const oldValue = originalRow[fieldKey as keyof SheetData];
                  const newValue = changedRow[fieldKey as keyof SheetData];

                  if (oldValue !== newValue) {
                    console.log(
                      `💾 Updating field ${fieldKey} (${columnDef?.dataType}):`,
                      {
                        oldValue,
                        newValue,
                        columnName: columnDef?.columnName,
                        dataType: columnDef?.dataType,
                        isFunctionColumn: columnDef?.dataType === "function",
                      }
                    );
                    batchedWriter.queueFieldUpdate(
                      changedRow.id,
                      fieldKey,
                      newValue
                    );

                    // Trigger function recomputation for dependent columns
                    await recomputeDirectDependentsForRow(
                      changedRow.id,
                      fieldKey,
                      newValue
                    );
                  }
                } else if (originalRow) {
                  // Multiple field changes - compare all fields
                  const changedFields = Object.keys(changedRow).filter(
                    (key) =>
                      key !== "id" && originalRow[key] !== changedRow[key]
                  );

                  console.log(
                    "📝 Multiple field changes:",
                    changedFields.map((fieldKey) => {
                      const fieldColumnDef = columns.find(
                        (col) => col.id === fieldKey
                      );
                      return {
                        fieldKey,
                        columnName: fieldColumnDef?.columnName,
                        dataType: fieldColumnDef?.dataType,
                      };
                    })
                  );

                  // Process each changed field
                  for (const fieldKey of changedFields) {
                    const newValue = changedRow[fieldKey as keyof SheetData];
                    const fieldColumnDef = columns.find(
                      (col) => col.id === fieldKey
                    );
                    console.log(
                      `💾 Updating field ${fieldKey} (${fieldColumnDef?.dataType}):`,
                      {
                        newValue,
                        columnName: fieldColumnDef?.columnName,
                        dataType: fieldColumnDef?.dataType,
                      }
                    );
                    batchedWriter.queueFieldUpdate(
                      changedRow.id,
                      fieldKey,
                      newValue
                    );

                    // Trigger function recomputation for dependent columns
                    await recomputeDirectDependentsForRow(
                      changedRow.id,
                      fieldKey,
                      newValue
                    );
                  }
                }
              });
            }}
            onCellClick={(args) => {
              const columnDef = columns.find(
                (col) => col.id === args.column.key
              );
              console.log("🖱️ onCellClick handler called:", {
                rowId: args.row.id,
                columnId: args.column.key,
                columnName: columnDef?.columnName,
                dataType: columnDef?.dataType,
                isEditable: columnDef?.dataType !== "function",
                currentValue: args.row[args.column.key as keyof SheetData],
                allRowKeys: Object.keys(args.row),
                allColumnIds: columns.map((c) => c.id),
              });

              // Skip date columns - they handle their own clicking
              if (columnDef?.dataType === "date") {
                console.log(
                  "📅 Date column clicked - skipping onCellClick handler"
                );
                return;
              }

              // Only allow editing for non-function columns
              if (columnDef?.dataType !== "function") {
                setSelectedCell({
                  rowId: args.row.id,
                  columnId: args.column.key as string,
                });
                console.log("✅ Selected cell set:", {
                  rowId: args.row.id,
                  columnId: args.column.key,
                  dataType: columnDef?.dataType,
                });
              } else {
                console.log(
                  "❌ Function column clicked, not setting selected cell"
                );
              }
            }}
            sortColumns={sortColumns}
            onSortColumnsChange={setSortColumns}
            onColumnResize={(columnKey, width) => {
              console.log("📏 Column resized:", { columnKey, width });

              // Handle both string key and column object
              let actualColumnKey = columnKey;
              let actualWidth = width;

              // If columnKey is an object (column definition), extract the key and width
              if (typeof columnKey === "object" && columnKey !== null) {
                actualColumnKey = columnKey.key;
                // The width parameter should contain the new width, not the column object's width
                actualWidth = width; // Use the width parameter directly
                console.log("📏 Extracted from column object:", {
                  actualColumnKey,
                  actualWidth,
                  originalWidth: columnKey.width,
                  widthParameter: width,
                });
              }

              // Find the column and update its width
              const columnToUpdate = columns.find(
                (col) => col.id === actualColumnKey
              );

              if (columnToUpdate) {
                console.log("📏 Column resize - debouncing Firebase update:", {
                  columnId: actualColumnKey,
                  newWidth: actualWidth,
                  columnName: columnToUpdate.columnName,
                });

                // Only debounce the Firebase update - no immediate updateColumn call
                // The grid will handle the visual update internally
                debouncedUpdateColumnWidth(actualColumnKey, actualWidth);
              } else {
                console.warn(
                  "⚠️ Column not found for resize:",
                  actualColumnKey
                );
              }
            }}
            onColumnsChange={async (newColumns) => {
              console.log("📏 Columns changed:", newColumns);

              // Check if any column width changed
              for (const newCol of newColumns) {
                const existingCol = columns.find(
                  (col) => col.id === newCol.key
                );
                if (existingCol && existingCol.width !== newCol.width) {
                  console.log("📏 Column width changed:", {
                    columnKey: newCol.key,
                    oldWidth: existingCol.width,
                    newWidth: newCol.width,
                  });

                  try {
                    const updatedColumn = {
                      ...existingCol,
                      width: newCol.width,
                    };

                    await updateColumn(updatedColumn);
                    console.log(
                      "✅ Column width updated in Firebase successfully"
                    );
                  } catch (error) {
                    console.error(
                      "❌ Failed to update column width in Firebase:",
                      error
                    );
                  }
                }
              }
            }}
            className="rdg-light custom-grid"
            style={
              {
                height: dynamicHeight,
                "--rdg-border-color": "hsl(var(--border))",
                "--rdg-header-background-color": "hsl(var(--muted))",
                "--rdg-row-hover-background-color": "hsl(var(--muted) / 0.5)",
                "--rdg-cell-frozen-background-color": "hsl(var(--background))",
                "--rdg-row-border-color": "hsl(var(--border))",
                "--rdg-background-color": "hsl(var(--background))",
                "--rdg-text-color": "hsl(var(--foreground))",
                "--rdg-header-text-color": "hsl(var(--foreground))",
              } as React.CSSProperties
            }
            defaultColumnOptions={{
              sortable: true,
              resizable: true,
              editable: true,
              renderCell: ({ row, column }) => {
                // Check if this column has a color by finding the column definition
                const columnDef = columns.find((col) => col.id === column.key);
                const hasColor = columnDef?.color && columnDef.color !== "none";

                return (
                  <div
                    className={`h-8 w-full flex items-center text-sm px-2 border-r border-b border-border ${
                      hasColor ? "text-black" : ""
                    }`}
                  >
                    {row[column.key as keyof SheetData]?.toString() || ""}
                  </div>
                );
              },
              // Don't set a default renderEditCell - let each column define its own
            }}
            enableVirtualization
            renderers={{
              noRowsFallback: (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <p>No data available</p>
                  <Button
                    onClick={handleAddNewRow}
                    disabled={isAddingRow}
                    variant="outline"
                    className="mt-2"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Row
                  </Button>
                </div>
              ),
            }}
          />
        </TooltipProvider>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-4 py-3 bg-background border-t border-royal-purple/20">
        <div className="text-sm text-foreground">
          Showing {startIndex + 1} to{" "}
          {Math.min(endIndex, filteredAndSortedData.length)} of{" "}
          {filteredAndSortedData.length} entries
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-foreground">
              Rows per page:
            </label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(0); // Reset to first page when changing page size
              }}
              className="h-8 px-2 border border-royal-purple/20 rounded focus:border-royal-purple focus:ring-1 focus:ring-royal-purple/20 focus:outline-none"
            >
              {[10, 20, 30, 40, 50, 100, 200, 500, 1000].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(0)}
              disabled={currentPage === 0}
              className="px-2 py-1 text-sm border border-royal-purple/20 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-royal-purple/5"
            >
              First
            </button>
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 0}
              className="px-2 py-1 text-sm border border-royal-purple/20 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-royal-purple/5"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-foreground">
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage >= totalPages - 1}
              className="px-2 py-1 text-sm border border-royal-purple/20 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-royal-purple/5"
            >
              Next
            </button>
            <button
              onClick={() => setCurrentPage(totalPages - 1)}
              disabled={currentPage >= totalPages - 1}
              className="px-2 py-1 text-sm border border-royal-purple/20 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-royal-purple/5"
            >
              Last
            </button>
          </div>
        </div>
      </div>

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

      {/* Loading Modal for Adding Row */}
      {isAddingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center space-x-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-royal-purple"></div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Adding New Row
                </h3>
                <p className="text-sm text-muted-foreground">
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
