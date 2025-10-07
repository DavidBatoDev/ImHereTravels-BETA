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
  RefreshCw,
  Terminal,
  Bug,
  ExternalLink,
  Pin,
  PinOff,
  Eye,
  EyeOff,
  Maximize,
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
import { useRouter } from "next/navigation";
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
import SheetConsole from "./SheetConsole";

// Custom editors for different data types
const DateEditor = memo(function DateEditor({
  row,
  column,
  onRowChange,
  onClose,
}: RenderEditCellProps<SheetData>) {
  const [value, setValue] = useState(() => {
    const cellValue = row[column.key as keyof SheetData];

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
        }
        // Handle Firestore timestamp objects with seconds property
        else if (
          cellValue &&
          typeof cellValue === "object" &&
          "seconds" in cellValue &&
          typeof (cellValue as any).seconds === "number"
        ) {
          date = new Date((cellValue as any).seconds * 1000);
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
          } else {
            // Regular date string
            date = new Date(cellValue);
          }
        }
        // Handle Date objects
        else if (cellValue instanceof Date) {
          date = cellValue;
        }

        if (date && !isNaN(date.getTime())) {
          const isoString = date.toISOString().split("T")[0];
          return isoString;
        }
      } catch (error) {
        // Handle date parsing errors silently
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

// Store navigation function and column metadata globally for function editor
let globalNavigateToFunctions: (() => void) | null = null;
let globalAvailableFunctions: TypeScriptFunction[] = [];
let globalColumnDefs: Map<string, SheetColumn> = new Map();
let globalAllColumns: SheetColumn[] = [];

function FunctionEditor({
  row,
  column,
  onRowChange,
  onClose,
}: RenderEditCellProps<SheetData>) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Get function name from global column defs map
  const columnDef = globalColumnDefs.get(column.key);
  const functionId = columnDef?.function;
  const functionDetails = globalAvailableFunctions?.find(
    (f) => f.id === functionId
  );
  const functionName = functionDetails?.functionName || "EditFunction";

  // Build function signature with arguments
  // Build function signature with actual values from row
  const args =
    columnDef?.arguments
      ?.map((arg) => {
        if (arg.columnReference) {
          // Find the column and get value from row
          const refCol = globalAllColumns.find(
            (c) => c.columnName === arg.columnReference
          );
          if (refCol) {
            const value = row[refCol.id];
            if (value === undefined || value === null) return "null";
            if (typeof value === "string") return `"${value}"`;
            if (typeof value === "object") return JSON.stringify(value);
            return String(value);
          }
          return arg.columnReference;
        }
        if (arg.columnReferences && arg.columnReferences.length > 0) {
          const values = arg.columnReferences.map((ref) => {
            const refCol = globalAllColumns.find((c) => c.columnName === ref);
            if (refCol) {
              const value = row[refCol.id];
              if (value === undefined || value === null) return "null";
              if (typeof value === "string") return `"${value}"`;
              return String(value);
            }
            return ref;
          });
          return `[${values.join(", ")}]`;
        }
        if (arg.value !== undefined) {
          return typeof arg.value === "string"
            ? `"${arg.value}"`
            : String(arg.value);
        }
        return arg.name;
      })
      .join(", ") || "";
  const signature = `${functionName}(${args})`;

  return (
    <div className="h-8 w-full flex items-center justify-center px-2">
      <button
        onClick={() => {
          if (globalNavigateToFunctions) {
            globalNavigateToFunctions();
          }
          onClose(false);
        }}
        className="text-sm text-royal-purple hover:text-royal-purple/80 underline flex items-center gap-1 hover:no-underline transition-all"
      >
        <ExternalLink className="h-4 w-4" />
        {signature}
      </button>
    </div>
  );
}

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
    // Handle date parsing errors silently
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
  const recomputeCell = (column as any).recomputeCell as
    | ((rowId: string, columnId: string) => Promise<void>)
    | undefined;
  const openDebugConsole = (column as any).openDebugConsole as
    | ((rowId: string, columnId: string) => void)
    | undefined;

  const [isRecomputing, setIsRecomputing] = useState(false);

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

  const handleRetry = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent cell click
    if (recomputeCell && !isRecomputing) {
      setIsRecomputing(true);
      try {
        await recomputeCell(row.id, column.key);
      } catch (error) {
        console.error("Failed to recompute cell:", error);
      } finally {
        setIsRecomputing(false);
      }
    }
  };

  const handleDebug = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent cell click
    if (openDebugConsole) {
      openDebugConsole(row.id, column.key);
    }
  };

  return (
    <>
      <div className="h-8 w-full flex items-center text-sm px-2 border-r border-b border-border relative group">
        <div className="flex-1 h-full flex items-center pr-16">
          {value?.toString() || ""}
        </div>
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <button
            onClick={handleDebug}
            className="p-1 hover:bg-blue-50 rounded transition-all opacity-0 group-hover:opacity-100"
            title="Debug in console"
          >
            <Bug className="h-3 w-3 text-blue-600" />
          </button>
          <button
            onClick={handleRetry}
            disabled={isRecomputing}
            className="p-1 hover:bg-royal-purple/10 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            title="Retry computation"
          >
            <RefreshCw
              className={`h-3 w-3 text-royal-purple ${
                isRecomputing ? "animate-spin" : ""
              }`}
            />
          </button>
        </div>
      </div>
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
  // Fullscreen mode props
  isFullscreen?: boolean;
  pageSize?: number;
  globalFilter?: string;
  columnFilters?: Record<string, any>;
  dateRangeFilters?: Record<string, { from?: Date; to?: Date }>;
  currencyRangeFilters?: Record<string, { min?: number; max?: number }>;
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
  isFullscreen = false,
  pageSize: initialPageSize,
  globalFilter: externalGlobalFilter,
  columnFilters: externalColumnFilters,
  dateRangeFilters: externalDateRangeFilters,
  currencyRangeFilters: externalCurrencyRangeFilters,
}: BookingsDataGridProps) {
  // Debug logging
  const { toast } = useToast();
  const router = useRouter();
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
  const [localData, setLocalData] = useState<SheetData[]>([]);
  const functionSubscriptionsRef = useRef<Map<string, () => void>>(new Map());
  const isInitialLoadRef = useRef<boolean>(true);
  const [isSheetConsoleVisible, setIsSheetConsoleVisible] = useState(false);
  const [debugCell, setDebugCell] = useState<{
    rowId: string;
    columnId: string;
  } | null>(null);
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [frozenColumnIds, setFrozenColumnIds] = useState<Set<string>>(
    new Set()
  );

  // Cache for function arguments to detect actual changes
  const functionArgsCacheRef = useRef<Map<string, any[]>>(new Map());

  // Clear function cache when data changes
  const clearFunctionCache = useCallback(() => {
    functionArgsCacheRef.current.clear();
    functionExecutionService.clearAllResultCache();
  }, []);

  // Enhanced filtering state (use external values in fullscreen mode)
  const [internalGlobalFilter, setInternalGlobalFilter] = useState("");
  const globalFilter = isFullscreen
    ? externalGlobalFilter || ""
    : internalGlobalFilter;
  const setGlobalFilter = isFullscreen ? () => {} : setInternalGlobalFilter;

  const [internalColumnFilters, setInternalColumnFilters] = useState<
    Record<string, any>
  >({});
  const columnFilters = isFullscreen
    ? externalColumnFilters || {}
    : internalColumnFilters;
  const setColumnFilters = isFullscreen ? () => {} : setInternalColumnFilters;

  const [showFilters, setShowFilters] = useState(false);
  const [showColumnsDialog, setShowColumnsDialog] = useState(false);

  const [internalDateRangeFilters, setInternalDateRangeFilters] = useState<
    Record<string, { from?: Date; to?: Date }>
  >({});
  const dateRangeFilters = isFullscreen
    ? externalDateRangeFilters || {}
    : internalDateRangeFilters;
  const setDateRangeFilters = isFullscreen
    ? () => {}
    : setInternalDateRangeFilters;

  const [internalCurrencyRangeFilters, setInternalCurrencyRangeFilters] =
    useState<Record<string, { min?: number; max?: number }>>({});
  const currencyRangeFilters = isFullscreen
    ? externalCurrencyRangeFilters || {}
    : internalCurrencyRangeFilters;
  const setCurrencyRangeFilters = isFullscreen
    ? () => {}
    : setInternalCurrencyRangeFilters;

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize || 25);

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

            await updateColumn(updatedColumn);
          }
        } catch (error) {
          // Handle column update errors silently
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

  // Track previous data to detect changes
  const prevDataRef = useRef<SheetData[]>([]);

  // Debug selectedCell changes

  // Compute one function column for a single row
  const computeFunctionForRow = useCallback(
    async (
      row: SheetData,
      funcCol: SheetColumn,
      skipInitialCheck = false
    ): Promise<any> => {
      if (!funcCol.function) return;

      // Skip computation during initial load unless explicitly requested
      if (isInitialLoadRef.current && !skipInitialCheck) {
        return row[funcCol.id]; // Return existing value
      }

      try {
        const args = functionExecutionService.buildArgs(funcCol, row, columns);

        // Create a cache key for this specific function call
        const cacheKey = `${row.id}:${funcCol.id}:${funcCol.function}`;
        const cachedArgs = functionArgsCacheRef.current.get(cacheKey);

        // Check if arguments have actually changed
        const argsChanged = !cachedArgs || !isEqual(cachedArgs, args);

        // Skip only if a REQUIRED argument is missing.
        // Allow undefined/null when the argument is optional or has a default.
        // const meta = Array.isArray(funcCol.arguments) ? funcCol.arguments : [];
        // const missingRequiredArg = args.some((argVal, idx) => {
        //   const m = meta[idx];
        //   if (argVal === undefined || argVal === null) {
        //     // If we have metadata and it's optional or has default, allow it
        //     if (m && (m.isOptional || m.hasDefault)) return false;
        //     // Otherwise this is a required missing value
        //     return true;
        //   }
        //   return false;
        // });
        // if (missingRequiredArg) {
        //   return row[funcCol.id]; // Return existing value without recomputing
        // }

        // Skip recomputation if arguments haven't changed
        if (!argsChanged) {
          return row[funcCol.id]; // Return existing value without recomputing
        }

        // Update cache with new arguments
        functionArgsCacheRef.current.set(cacheKey, [...args]);

        // Execute function with proper async handling
        // The function execution service will handle caching based on arguments
        const executionResult = await functionExecutionService.executeFunction(
          funcCol.function,
          args,
          10000 // 10 second timeout
        );

        if (!executionResult.success) {
          console.error(
            `Function execution failed for ${funcCol.function}:`,
            executionResult.error
          );
          return row[funcCol.id]; // Return existing value on error
        }

        const result = executionResult.result;

        if (!isEqual(row[funcCol.id], result)) {
          // Batch persist to Firestore (debounced)
          // Firebase listener will update the UI when confirmed
          batchedWriter.queueFieldUpdate(row.id, funcCol.id, result);
        }
        return result;
      } catch (err) {
        console.error(`Function execution error for ${funcCol.function}:`, err);
        return undefined;
      }
    },
    [columns]
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

  // Recompute a specific function cell (manual retry)
  const recomputeCell = useCallback(
    async (rowId: string, columnId: string) => {
      const funcCol = columns.find((c) => c.id === columnId);
      if (!funcCol || funcCol.dataType !== "function") return;

      // Build a working snapshot of the row values
      const baseRow =
        localData.find((r) => r.id === rowId) ||
        data.find((r) => r.id === rowId);
      if (!baseRow) return;

      // Clear cache for this specific cell
      const cacheKey = `${rowId}:${funcCol.id}:${funcCol.function}`;
      functionArgsCacheRef.current.delete(cacheKey);

      // Force recomputation
      await computeFunctionForRow(baseRow, funcCol, true);

      // Flush immediately for manual retries
      batchedWriter.flush();
    },
    [columns, localData, data, computeFunctionForRow]
  );

  // Open debug console for a specific cell
  const openDebugConsole = useCallback((rowId: string, columnId: string) => {
    setDebugCell({ rowId, columnId });
    setIsSheetConsoleVisible(true);
  }, []);

  // Navigate to functions page
  const navigateToFunctions = useCallback(() => {
    router.push("/functions");
  }, [router]);

  // Toggle column freeze
  const toggleColumnFreeze = useCallback(
    (columnId: string, e?: React.MouseEvent) => {
      if (e) {
        e.stopPropagation(); // Prevent header click
      }
      setFrozenColumnIds((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(columnId)) {
          newSet.delete(columnId);
        } else {
          newSet.add(columnId);
        }
        return newSet;
      });
    },
    []
  );

  // Toggle column visibility
  const toggleColumnVisibility = useCallback(
    async (columnId: string) => {
      const column = columns.find((col) => col.id === columnId);
      if (!column) return;

      const updatedColumn = {
        ...column,
        showColumn: column.showColumn === false ? true : false,
      };

      try {
        await updateColumn(updatedColumn);
        toast({
          title: updatedColumn.showColumn
            ? "✅ Column Shown"
            : "✅ Column Hidden",
          description: `Column "${column.columnName}" ${
            updatedColumn.showColumn ? "is now visible" : "is now hidden"
          }`,
          variant: "default",
        });
      } catch (error) {
        console.error("Failed to toggle column visibility:", error);
        toast({
          title: "❌ Failed to Update Column",
          description: `Error: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          variant: "destructive",
        });
      }
    },
    [columns, updateColumn, toast]
  );

  // Update global navigation function, available functions, and column definitions
  useEffect(() => {
    globalNavigateToFunctions = navigateToFunctions;
    globalAvailableFunctions = availableFunctions;
    globalAllColumns = columns;
    globalColumnDefs.clear();
    columns.forEach((col) => {
      globalColumnDefs.set(col.id, col);
    });
    return () => {
      globalNavigateToFunctions = null;
      globalAvailableFunctions = [];
      globalAllColumns = [];
      globalColumnDefs.clear();
    };
  }, [navigateToFunctions, availableFunctions, columns]);

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

      // Clear cache for affected functions since data has changed
      directDependents.forEach((funcCol) => {
        const cacheKey = `${rowId}:${funcCol.id}:${funcCol.function}`;
        functionArgsCacheRef.current.delete(cacheKey);
      });

      // Compute all direct dependents in parallel for speed
      await Promise.all(
        directDependents.map(
          (funcCol) => computeFunctionForRow(rowSnapshot, funcCol, true) // Skip initial check for user-triggered changes
        )
      );
      // Do not force flush; allow debounced batch to commit to keep UI snappy
    },
    [columns, localData, data, dependencyGraph, computeFunctionForRow]
  );

  // Sync local data with props data and trigger recomputation on Firebase changes
  useEffect(() => {
    const prevData = prevDataRef.current;
    const currentData = data;

    // Update local data
    setLocalData(data);

    // Skip recomputation during initial load
    if (isInitialLoadRef.current) {
      if (data && data.length > 0) {
        // Use a small delay to ensure all subscriptions are set up
        setTimeout(() => {
          isInitialLoadRef.current = false;
        }, 100);
      }
      prevDataRef.current = [...currentData];
      return;
    }

    // Detect changes (including function columns) and trigger recomputation for affected rows
    if (prevData.length > 0 && currentData.length > 0) {
      const changedRows = currentData.filter((currentRow) => {
        const prevRow = prevData.find((p) => p.id === currentRow.id);
        if (!prevRow) return false;

        // Check if any fields have changed (including function columns)
        return columns.some((col) => {
          return !isEqual(prevRow[col.id], currentRow[col.id]);
        });
      });

      // Trigger recomputation for changed rows
      changedRows.forEach(async (changedRow) => {
        const prevRow = prevData.find((p) => p.id === changedRow.id);
        if (!prevRow) return;

        // Find which fields changed (including function columns)
        const changedFields = columns.filter((col) => {
          return !isEqual(prevRow[col.id], changedRow[col.id]);
        });

        // Trigger recomputation for each changed field's direct dependents
        for (const field of changedFields) {
          await recomputeDirectDependentsForRow(
            changedRow.id,
            field.id,
            changedRow[field.id]
          );
        }
      });
    }

    // Update previous data reference
    prevDataRef.current = [...currentData];
  }, [data, columns, recomputeDirectDependentsForRow]);

  // Recompute for columns bound to a specific function id (and their dependents)
  const recomputeForFunction = useCallback(
    async (funcId: string) => {
      const impactedColumns = columns.filter(
        (c) => c.dataType === "function" && c.function === funcId
      );
      if (impactedColumns.length === 0) return;

      const rows = localData.length > 0 ? localData : data;

      // Clear cache for all affected functions since function definition changed
      rows.forEach((row) => {
        impactedColumns.forEach((funcCol) => {
          const cacheKey = `${row.id}:${funcCol.id}:${funcCol.function}`;
          functionArgsCacheRef.current.delete(cacheKey);
        });
      });

      for (const row of rows) {
        for (const funcCol of impactedColumns) {
          await computeFunctionForRow(row, funcCol, true); // Skip initial check for function changes
        }
      }
      // Expedite persistence
      batchedWriter.flush();
    },
    [columns, localData, data]
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

              // Skip recomputation during initial load
              if (isInitialLoadRef.current) {
                return;
              }

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
  }, [columns]);

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

  // Use state for dynamic height to avoid hydration mismatch
  const [dynamicHeight, setDynamicHeight] = useState(
    isFullscreen ? 800 : 450 // Default values for SSR
  );

  // Update height after component mounts to avoid hydration mismatch
  useEffect(() => {
    if (isFullscreen && typeof window !== "undefined") {
      setDynamicHeight(window.innerHeight - 150);
    }
  }, [isFullscreen]);

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
      return [];
    }

    // Add row number column first
    const rowNumberColumn: Column<SheetData> = {
      key: "rowNumber",
      name: "#",
      width: 64,
      minWidth: 50,
      maxWidth: 100,
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
        const isSelected = selectedRowId === row.id;
        return (
          <div
            onClick={() => setSelectedRowId(isSelected ? null : row.id)}
            className={`h-8 w-16 flex items-center justify-center text-sm font-mono text-foreground px-2 border-r border-b border-border bg-muted relative z-[999999999] cursor-pointer hover:bg-royal-purple/20 transition-colors ${
              isSelected ? "ring-2 ring-inset ring-royal-purple" : ""
            }`}
          >
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
      .filter(
        (col) => col && col.id && col.columnName && col.showColumn !== false
      ) // Filter out invalid columns and hidden columns
      .sort((a, b) => a.order - b.order)
      .map((col) => {
        const baseColumn: Column<SheetData> = {
          key: col.id,
          name: col.columnName,
          width: col.width || 150,
          minWidth: 50,
          maxWidth: 3000,
          resizable: true,
          sortable: false,
          frozen: frozenColumnIds.has(col.id),
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
        (baseColumn as any).cellClass = (row: SheetData) => {
          const isColumnSelected = selectedColumnId === col.id;
          const isRowSelected = selectedRowId === row.id;
          const isFrozen = frozenColumnIds.has(col.id);

          // Build classes array for easier management
          const classes = [cellClass];

          // Add ring if column is selected, frozen, or row is selected
          if (isColumnSelected || isFrozen || isRowSelected) {
            classes.push("ring-2 ring-inset ring-royal-purple/40");
          }

          return classes.join(" ");
        };

        // Add header height styling for two-row header structure and remove padding
        (baseColumn as any).headerCellClass = "bg-black h-20 !p-0"; // Increased height for two-row header, no padding

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
              <div
                className={`flex items-center justify-between flex-1 px-2 mt-10 cursor-pointer hover:bg-gray-700 transition-colors group/header ${
                  selectedColumnId === col.id
                    ? "bg-gray-600 ring-2 ring-inset ring-white"
                    : ""
                } ${frozenColumnIds.has(col.id) ? "bg-gray-800" : ""}`}
                onClick={() =>
                  setSelectedColumnId(
                    selectedColumnId === col.id ? null : col.id
                  )
                }
                title="Click to highlight column"
              >
                <div className="flex items-center gap-1 flex-1 justify-center">
                  {col.dataType === "function" && (
                    <FunctionSquare className="h-4 w-4 text-white" />
                  )}
                  {frozenColumnIds.has(col.id) && (
                    <Pin className="h-3 w-3 text-white" />
                  )}
                  <span className="font-medium truncate text-white">
                    {column.name}
                  </span>
                </div>
                <button
                  onClick={(e) => toggleColumnFreeze(col.id, e)}
                  className={`p-1 hover:bg-gray-600 rounded transition-all ${
                    frozenColumnIds.has(col.id)
                      ? "opacity-100"
                      : "opacity-0 group-hover/header:opacity-100"
                  }`}
                  title={
                    frozenColumnIds.has(col.id)
                      ? "Unfreeze column"
                      : "Freeze column"
                  }
                >
                  {frozenColumnIds.has(col.id) ? (
                    <PinOff className="h-3 w-3 text-white" />
                  ) : (
                    <Pin className="h-3 w-3 text-white" />
                  )}
                </button>
              </div>
            </div>
          );
        };

        // Add column-specific properties
        if (col.dataType === "boolean") {
          // Always render checkbox input for boolean columns
          baseColumn.renderCell = ({ row, column }) => {
            const cellValue = !!row[column.key as keyof SheetData];

            const hasColor = col.color && col.color !== "none";

            return (
              <div className="h-8 w-full flex items-center justify-center px-2 border-r border-b border-border">
                <input
                  type="checkbox"
                  checked={cellValue}
                  onChange={async (e) => {
                    const newValue = e.target.checked;

                    // Save to Firestore - Firebase listener will update the UI
                    try {
                      await bookingService.updateBookingField(
                        row.id,
                        column.key,
                        newValue
                      );
                      // Note: Recomputation will be triggered by Firebase listener
                    } catch (error) {
                      console.error("Failed to update boolean field:", error);
                    }
                  }}
                  className="w-5 h-5 text-royal-purple bg-white border-2 border-royal-purple/30 rounded focus:ring-offset-0 cursor-pointer transition-all duration-200 hover:border-royal-purple/50 checked:bg-royal-purple checked:border-royal-purple"
                />
              </div>
            );
          };
          baseColumn.editable = false; // We handle editing through the checkbox
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
                    } catch (error) {}
                  }
                  return "";
                })()}
                onChange={async (e) => {
                  const newValue = e.target.value
                    ? new Date(e.target.value)
                    : null;

                  // Save to Firestore - Firebase listener will update the UI
                  try {
                    await bookingService.updateBookingField(
                      row.id,
                      column.key,
                      newValue
                    );
                    // Note: Recomputation will be triggered by Firebase listener
                  } catch (error) {
                    console.error("Failed to update date field:", error);
                  }
                }}
                className={`h-8 w-full border-0 focus:border-2 focus:border-royal-purple focus:ring-0 focus:outline-none focus-visible:ring-0 rounded-none text-sm px-2 ${
                  hasColor ? "text-black" : ""
                } ${!cellValue ? "text-transparent" : ""}`}
                style={{
                  backgroundColor: "transparent",
                  colorScheme: !cellValue ? "light" : "auto",
                }}
              />
            );
          };
          baseColumn.editable = false; // We handle editing through the input
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

            return (
              <select
                value={cellValue?.toString() || ""}
                onChange={async (e) => {
                  const newValue = e.target.value;

                  // Save to Firestore - Firebase listener will update the UI
                  try {
                    await bookingService.updateBookingField(
                      row.id,
                      column.key,
                      newValue
                    );
                    // Note: Recomputation will be triggered by Firebase listener
                  } catch (error) {
                    console.error("Failed to update select field:", error);
                  }
                }}
                className={`h-8 w-full border-0 focus:border-2 focus:border-royal-purple focus:ring-0 focus:outline-none focus-visible:ring-0 rounded-none text-sm px-2 ${
                  hasColor ? "text-black" : ""
                }`}
                style={{ backgroundColor: "transparent" }}
              >
                <option value=""></option>
                {options.map((option: string) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            );
          };
          baseColumn.editable = false; // We handle editing through the select
        } else if (col.dataType === "currency") {
          // Always render currency input for currency columns
          baseColumn.renderCell = ({ row, column }) => {
            const cellValue = row[column.key as keyof SheetData];
            const numericValue =
              typeof cellValue === "number"
                ? cellValue
                : parseFloat(cellValue?.toString() || "0") || 0;
            const hasColor = col.color && col.color !== "none";

            return (
              <input
                type="number"
                step="0.01"
                value={numericValue.toString()}
                onChange={async (e) => {
                  const newValue = parseFloat(e.target.value) || 0;

                  // Save to Firestore - Firebase listener will update the UI
                  try {
                    await bookingService.updateBookingField(
                      row.id,
                      column.key,
                      newValue
                    );
                    // Note: Recomputation will be triggered by Firebase listener
                  } catch (error) {
                    console.error("Failed to update currency field:", error);
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
          baseColumn.renderEditCell = FunctionEditor; // Show button when editing
          baseColumn.sortable = false;
          baseColumn.editable = true; // Make editable so user can click to "edit"
          (baseColumn as any).columnDef = col;
          (baseColumn as any).deleteRow = deleteRow;
          (baseColumn as any).availableFunctions = availableFunctions;
          (baseColumn as any).recomputeCell = recomputeCell;
          (baseColumn as any).openDebugConsole = openDebugConsole;
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

    // Validate all columns have renderCell
    const invalidColumns = validatedColumns.filter(
      (col) => typeof col.renderCell !== "function"
    );
    if (invalidColumns.length > 0) {
      console.error("Columns without renderCell:", invalidColumns);
    }

    return validatedColumns;
  }, [
    columns,
    deleteRow,
    recomputeCell,
    openDebugConsole,
    navigateToFunctions,
    selectedColumnId,
    selectedRowId,
    frozenColumnIds,
    toggleColumnFreeze,
  ]);

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
    <div className="booking-data-grid space-y-6 relative">
      {!isFullscreen && (
        <>
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
                    <Button
                      variant="outline"
                      className="flex items-center gap-2"
                    >
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
                                        selected={
                                          dateRangeFilters[col.id]?.from
                                        }
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
                                    value={
                                      currencyRangeFilters[col.id]?.min || ""
                                    }
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
                                    value={
                                      currencyRangeFilters[col.id]?.max || ""
                                    }
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
                <Popover
                  open={showColumnsDialog}
                  onOpenChange={setShowColumnsDialog}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Show
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 max-h-[500px] overflow-y-auto p-2">
                    <div className="space-y-1">
                      {columns.map((col) => {
                        const isVisible = col.showColumn !== false;
                        return (
                          <button
                            key={col.id}
                            onClick={() => toggleColumnVisibility(col.id)}
                            className="w-full flex items-center justify-between p-2 rounded-md hover:bg-royal-purple/10 transition-colors text-left"
                          >
                            <span className="text-sm font-medium text-foreground">
                              {col.columnName}
                            </span>
                            {isVisible ? (
                              <Eye className="h-4 w-4 text-green-600 flex-shrink-0" />
                            ) : (
                              <EyeOff className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
                {!isFullscreen && (
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => router.push("/bookings/fullscreen")}
                  >
                    <Maximize className="h-4 w-4" />
                  </Button>
                )}
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
        </>
      )}

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
              // Note: Don't update local data - Firebase listener is the source of truth

              // Find the column definition for debugging
              const columnDef = column
                ? columns.find((col) => col.id === column.key)
                : null;

              // Update Firestore for each changed row
              indexes.forEach(async (index) => {
                const changedRow = rows[index] as SheetData;
                const originalRow = data.find(
                  (row) => row.id === changedRow.id
                );

                if (originalRow && column) {
                  // Single field change
                  const fieldKey = column.key as string;
                  const oldValue = originalRow[fieldKey as keyof SheetData];
                  const newValue = changedRow[fieldKey as keyof SheetData];

                  if (oldValue !== newValue) {
                    batchedWriter.queueFieldUpdate(
                      changedRow.id,
                      fieldKey,
                      newValue
                    );
                    // Note: Recomputation will be triggered by Firebase listener
                  }
                } else if (originalRow) {
                  // Multiple field changes - compare all fields
                  const changedFields = Object.keys(changedRow).filter(
                    (key) =>
                      key !== "id" && originalRow[key] !== changedRow[key]
                  );

                  // Process each changed field
                  for (const fieldKey of changedFields) {
                    const newValue = changedRow[fieldKey as keyof SheetData];
                    const fieldColumnDef = columns.find(
                      (col) => col.id === fieldKey
                    );

                    batchedWriter.queueFieldUpdate(
                      changedRow.id,
                      fieldKey,
                      newValue
                    );
                    // Note: Recomputation will be triggered by Firebase listener
                  }
                }
              });
            }}
            onCellClick={(args) => {
              const columnDef = columns.find(
                (col) => col.id === args.column.key
              );

              // Skip date columns - they handle their own clicking
              if (columnDef?.dataType === "date") {
                return;
              }

              // Only allow editing for non-function columns
              if (columnDef?.dataType !== "function") {
                setSelectedCell({
                  rowId: args.row.id,
                  columnId: args.column.key as string,
                });
              } else {
              }
            }}
            sortColumns={sortColumns}
            onSortColumnsChange={setSortColumns}
            onColumnResize={(columnKey, width) => {
              // Handle both string key and column object
              let actualColumnKey = columnKey;
              let actualWidth = width;

              // If columnKey is an object (column definition), extract the key and width
              if (typeof columnKey === "object" && columnKey !== null) {
                actualColumnKey = columnKey.key;
                // The width parameter should contain the new width, not the column object's width
                actualWidth = width; // Use the width parameter directly
              }

              // Find the column and update its width
              const columnToUpdate = columns.find(
                (col) => col.id === actualColumnKey
              );

              if (columnToUpdate) {
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
              // Check if any column width changed
              for (const newCol of newColumns) {
                const existingCol = columns.find(
                  (col) => col.id === newCol.key
                );
                if (existingCol && existingCol.width !== newCol.width) {
                  try {
                    const updatedColumn = {
                      ...existingCol,
                      width: newCol.width,
                    };

                    await updateColumn(updatedColumn);
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
      {!isFullscreen && (
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
                {[25, 50, 100, 200, 500, 1000].map((size) => (
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
      )}

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

      {/* Sheet Console - Slide-out panel */}
      <div
        className={`fixed right-0 top-0 h-screen w-96 bg-background shadow-2xl transition-transform duration-300 ease-in-out z-40 ${
          isSheetConsoleVisible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <SheetConsole
          columns={columns}
          data={data}
          availableFunctions={availableFunctions}
          onClose={() => {
            setIsSheetConsoleVisible(false);
            setDebugCell(null);
          }}
          debugCell={debugCell}
        />
      </div>

      {/* Backdrop for console */}
      {isSheetConsoleVisible && (
        <div
          className="fixed inset-0 bg-black/20 z-30"
          onClick={() => setIsSheetConsoleVisible(false)}
        />
      )}
    </div>
  );
}
