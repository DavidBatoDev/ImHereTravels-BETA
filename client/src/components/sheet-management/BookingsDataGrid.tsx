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
import { DataGrid } from "react-data-grid";

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
import { Progress } from "@/components/ui/progress";
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
  Upload,
  FileSpreadsheet,
  AlertTriangle,
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
import { typescriptFunctionService } from "@/services/firebase-function-service";
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
import CSVImport from "./CSVImport";

// Toggle to control error logging from function recomputation paths
const LOG_FUNCTION_ERRORS = false;
const logFunctionError = (...args: any[]) => {
  if (LOG_FUNCTION_ERRORS) {
    console.error(...args);
  }
};

// Store navigation function and column metadata globally for function editor
let globalNavigateToFunctions: (() => void) | null = null;
let globalAvailableFunctions: TypeScriptFunction[] = [];
const globalColumnDefs: Map<string, SheetColumn> = new Map();
let globalAllColumns: SheetColumn[] = [];

interface BookingsDataGridProps {
  columns: SheetColumn[];
  data: SheetData[];
  updateColumn: (column: SheetColumn) => void;
  deleteColumn: (columnId: string) => void;
  updateData: (data: SheetData[]) => void;
  updateRow: (rowId: string, updates: Partial<SheetData>) => void;
  deleteRow: (rowId: string) => Promise<void>;
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
  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    columnId: string;
  } | null>(null);

  // Track currently selected cell
  const [selectedCellInfo, setSelectedCellInfo] = useState<{
    rowId: string;
    columnId: string;
    rowIndex: number;
    columnIndex: number;
    cellElement: HTMLElement | null;
  } | null>(null);

  // Debug function to manually check selected cell
  const debugSelectedCell = useCallback(() => {
    const selectedCellElement = document.querySelector(
      '.rdg [role="gridcell"][aria-selected="true"]'
    ) as HTMLElement;
    console.log("🔍 [DEBUG] Current selected cell:", {
      element: selectedCellElement,
      ariaSelected: selectedCellElement?.getAttribute("aria-selected"),
      ariaColIndex: selectedCellElement?.getAttribute("aria-colindex"),
      className: selectedCellElement?.className,
      value:
        selectedCellElement?.querySelector("input")?.value ||
        selectedCellElement?.textContent?.trim(),
      allAriaSelectedCells: document.querySelectorAll(
        '.rdg [role="gridcell"][aria-selected="true"]'
      ),
      allGridCells: document.querySelectorAll('.rdg [role="gridcell"]').length,
    });
  }, []);

  // Local state for input values to avoid laggy typing
  const [localInputValues, setLocalInputValues] = useState<Map<string, string>>(
    new Map()
  );

  // Debounced Firebase update refs
  const firebaseUpdateTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Track when we're canceling changes to prevent handleBlur from saving
  const isCancelingChanges = useRef<boolean>(false);

  // Helper function to get input value (local state or Firebase data)
  const getInputValue = useCallback(
    (rowId: string, columnId: string, fallbackValue: any): string => {
      const key = `${rowId}:${columnId}`;
      const localValue = localInputValues.get(key);
      return localValue !== undefined
        ? localValue
        : fallbackValue?.toString() || "";
    },
    [localInputValues]
  );

  // Monitor selected cell by watching aria-selected="true"
  const monitorSelectedCell = useCallback(() => {
    // Look for the cell with aria-selected="true"
    const selectedCellElement = document.querySelector(
      '.rdg [role="gridcell"][aria-selected="true"]'
    ) as HTMLElement;

    if (!selectedCellElement) {
      // No cell is selected
      if (selectedCellInfo) {
        setSelectedCellInfo(null);
      }
      return;
    }

    // Get the row element
    const rowElement = selectedCellElement.closest(
      '[role="row"]'
    ) as HTMLElement;
    if (!rowElement) return;

    // Get aria-colindex (React Data Grid uses this for column position)
    const ariaColIndex = selectedCellElement.getAttribute("aria-colindex");
    const actualColumnIndex = ariaColIndex ? parseInt(ariaColIndex) - 1 : -1;

    // Get only visible columns (aria-colindex is based on visible columns only)
    const visibleColumns = columns.filter((col) => col.showColumn !== false);

    if (actualColumnIndex >= 0 && actualColumnIndex < visibleColumns.length) {
      // Try to get row ID from row attributes or data
      const rowDataAttributes = Array.from(rowElement.attributes).filter(
        (attr) =>
          attr.name.startsWith("data-") &&
          (attr.name.includes("row") || attr.name.includes("id"))
      );

      // Try to find row ID from data attributes
      let rowId = rowDataAttributes.find(
        (attr) => attr.name.includes("row") || attr.name.includes("id")
      )?.value;

      // If no data attributes, try to find by row index
      if (!rowId) {
        const allRows = document.querySelectorAll('.rdg [role="row"]');
        const rowIndex = Array.from(allRows).indexOf(rowElement);
        if (rowIndex >= 0 && rowIndex < data.length) {
          rowId = data[rowIndex].id;
        }
      }

      if (rowId) {
        const targetColumn = visibleColumns[actualColumnIndex];

        const newSelectedCellInfo = {
          rowId: rowId,
          columnId: targetColumn.id,
          rowIndex: actualColumnIndex,
          columnIndex: actualColumnIndex,
          cellElement: selectedCellElement,
        };

        // Only update if the selected cell has changed
        if (
          !selectedCellInfo ||
          selectedCellInfo.rowId !== newSelectedCellInfo.rowId ||
          selectedCellInfo.columnId !== newSelectedCellInfo.columnId
        ) {
          setSelectedCellInfo(newSelectedCellInfo);
        }
      }
    }
  }, [selectedCellInfo, columns, data]);

  // Set up monitoring for aria-selected changes
  useEffect(() => {
    // Monitor immediately
    monitorSelectedCell();

    // Set up MutationObserver to watch for aria-selected changes
    const observer = new MutationObserver((mutations) => {
      let shouldCheck = false;

      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "aria-selected"
        ) {
          shouldCheck = true;
        }

        // Also check for added/removed nodes that might be cells
        if (mutation.type === "childList") {
          const addedNodes = Array.from(mutation.addedNodes);
          const removedNodes = Array.from(mutation.removedNodes);

          const hasGridCells = [...addedNodes, ...removedNodes].some(
            (node) =>
              node.nodeType === Node.ELEMENT_NODE &&
              (node as Element).matches?.('[role="gridcell"]')
          );

          if (hasGridCells) {
            shouldCheck = true;
          }
        }
      });

      if (shouldCheck) {
        // Use setTimeout to ensure DOM is fully updated
        setTimeout(monitorSelectedCell, 0);
      }
    });

    // Start observing the entire document for aria-selected changes
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["aria-selected"],
      childList: true,
      subtree: true,
    });

    // Fallback interval in case MutationObserver misses something
    const interval = setInterval(monitorSelectedCell, 500); // Check every 500ms as fallback

    // Expose debug function globally for console access
    (window as any).debugSelectedCell = debugSelectedCell;
    (window as any).monitorSelectedCell = monitorSelectedCell;

    return () => {
      observer.disconnect();
      clearInterval(interval);
      // Clean up global functions
      delete (window as any).debugSelectedCell;
      delete (window as any).monitorSelectedCell;
    };
  }, [monitorSelectedCell, debugSelectedCell]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      firebaseUpdateTimeouts.current.forEach((timeout) =>
        clearTimeout(timeout)
      );
      firebaseUpdateTimeouts.current.clear();
    };
  }, []);

  const [columnSettingsModal, setColumnSettingsModal] = useState<{
    isOpen: boolean;
    column: SheetColumn | null;
  }>({ isOpen: false, column: null });
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [sortColumns, setSortColumns] = useState<readonly SortColumn[]>([]);
  const [localData, setLocalData] = useState<SheetData[]>([]);

  // Force re-render state for Escape key cancellation
  const [forceRerender, setForceRerender] = useState<number>(0);

  // Keep refs of latest data to avoid stale closures in async handlers
  const latestDataRef = useRef<SheetData[]>([]);
  const latestLocalDataRef = useRef<SheetData[]>([]);
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
  const [isRecomputingAll, setIsRecomputingAll] = useState(false);
  const isRecomputingAllRef = useRef(false);
  useEffect(() => {
    isRecomputingAllRef.current = isRecomputingAll;
  }, [isRecomputingAll]);
  const [recomputeProgress, setRecomputeProgress] = useState<{
    completed: number;
    total: number;
    phase: "init" | "acyclic" | "cyclic" | "flushing" | "done";
    currentRowId?: string;
    currentColId?: string;
    attempt?: number;
    maxAttempts?: number;
    errorDetected?: boolean;
    errorCount?: number;
  }>({
    completed: 0,
    total: 0,
    phase: "init",
    attempt: 0,
    maxAttempts: 4,
    errorDetected: false,
    errorCount: 0,
  });
  const MAX_RECOMPUTE_ATTEMPTS = 30;
  const attemptErrorCountRef = useRef<number>(0);

  // Configuration for handling slow/async functions during recompute
  const FUNCTION_EXECUTION_DELAY = 10; // 0ms delay between function executions
  const ASYNC_FUNCTION_DELAY = 50; // 100ms delay for async functions
  const executionTimesRef = useRef<Map<string, number[]>>(new Map());

  // Cache for function arguments to detect actual changes
  const functionArgsCacheRef = useRef<Map<string, any[]>>(new Map());

  // Helper to check if a function is likely to be slow/async
  const isFunctionLikelyAsync = useCallback(
    async (functionId: string): Promise<boolean> => {
      try {
        // First check function metadata for async indicators
        const tsFunction = await typescriptFunctionsService.getFunction(
          functionId
        );
        if (tsFunction) {
          // Check if function has async-related metadata
          if (
            tsFunction.functionName?.toLowerCase().includes("async") ||
            tsFunction.name?.toLowerCase().includes("async")
          ) {
            return true;
          }
        }

        // Then check the actual function content
        const tsFile = await typescriptFunctionService.files.getById(
          functionId
        );
        if (!tsFile?.content) return false;

        const content = tsFile.content.toLowerCase();
        // Check for async/await patterns, HTTP calls, database operations, etc.
        return (
          content.includes("async") ||
          content.includes("await") ||
          content.includes("fetch") ||
          content.includes("httpscallable") ||
          content.includes("getdocs") ||
          content.includes("updatedoc") ||
          content.includes("adddoc") ||
          content.includes("deletedoc") ||
          content.includes("settimeout") ||
          content.includes("setinterval") ||
          content.includes("promise") ||
          content.includes("sendemail") ||
          content.includes("generateemail") ||
          content.includes(".then(") ||
          content.includes(".catch(")
        );
      } catch {
        return false;
      }
    },
    []
  );

  // Track execution times and determine if function is consistently slow
  const isSlowFunction = useCallback((functionId: string): boolean => {
    const times = executionTimesRef.current.get(functionId) || [];
    if (times.length < 3) return false; // Need at least 3 samples
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    return avgTime > 1000; // Consider slow if average > 1 second
  }, []);

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

  // Handle keyboard events to clear editing state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && editingCell) {
        setEditingCell(null);
        setSelectedCell(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editingCell]);

  // Auto-clear editing state after 30 seconds to prevent stuck states
  useEffect(() => {
    if (editingCell) {
      const timeout = setTimeout(() => {
        setEditingCell(null);
        setSelectedCell(null);
      }, 30000); // 30 seconds

      return () => clearTimeout(timeout);
    }
  }, [editingCell]);

  // Track previous data to detect changes
  const prevDataRef = useRef<SheetData[]>([]);

  // Keep refs in sync with state/props
  useEffect(() => {
    latestDataRef.current = data;
  }, [data]);
  useEffect(() => {
    latestLocalDataRef.current = localData;
  }, [localData]);

  // Helper: get the most up-to-date rows snapshot
  const getCurrentRows = useCallback((): SheetData[] => {
    const ld = latestLocalDataRef.current || [];
    const d = latestDataRef.current || [];
    return ld.length > 0 ? ld : d;
  }, []);

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
        // Use longer timeout during recompute process for slow functions
        const timeout = skipInitialCheck ? 30000 : 10000; // 30s for recompute, 10s for normal
        const executionResult = await functionExecutionService.executeFunction(
          funcCol.function,
          args,
          timeout
        );

        if (!executionResult.success) {
          // record attempt error for retry loop tracking
          attemptErrorCountRef.current =
            (attemptErrorCountRef.current || 0) + 1;
          if (isRecomputingAllRef.current) {
            setRecomputeProgress((prev) => ({
              ...prev,
              errorDetected: true,
              errorCount: (prev.errorCount || 0) + 1,
            }));
          }
          logFunctionError(
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
        attemptErrorCountRef.current = (attemptErrorCountRef.current || 0) + 1;
        if (isRecomputingAllRef.current) {
          setRecomputeProgress((prev) => ({
            ...prev,
            errorDetected: true,
            errorCount: (prev.errorCount || 0) + 1,
          }));
        }
        logFunctionError(
          `Function execution error for ${funcCol.function}:`,
          err
        );
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

      // Create row snapshot with updated value and any other local input values
      const rowSnapshot: SheetData = {
        ...baseRow,
        [changedColumnId]: updatedValue,
      };

      // Note: We don't include local input values here since this function
      // is only called after saving to Firebase, so Firebase data is up-to-date

      // Use column ID instead of column name for precise tracking
      const directDependents = dependencyGraph.get(changedColumnId) || [];

      // Clear cache for affected functions since data has changed
      directDependents.forEach((funcCol) => {
        const cacheKey = `${rowId}:${funcCol.id}:${funcCol.function}`;
        functionArgsCacheRef.current.delete(cacheKey);
      });

      // Compute all direct dependents in parallel for speed
      const results = await Promise.all(
        directDependents.map(async (funcCol) => {
          const result = await computeFunctionForRow(
            rowSnapshot,
            funcCol,
            true
          ); // Skip initial check for user-triggered changes
          return { funcCol, result };
        })
      );

      // Note: We don't update local state here since function results
      // will be updated via Firebase listeners after saving

      // Do not force flush; allow debounced batch to commit to keep UI snappy
    },
    [columns, localData, data, dependencyGraph, computeFunctionForRow]
  );

  // Helper function to save changes to Firebase (called on blur)
  const saveToFirebase = useCallback(
    async (
      rowId: string,
      columnId: string,
      value: string,
      dataType?: string
    ) => {
      const key = `${rowId}:${columnId}`;

      // Convert value based on data type
      let finalValue: any = value;
      if (dataType === "currency") {
        finalValue = value === "" ? "" : parseFloat(value) || 0;
      }

      // Update Firebase immediately
      batchedWriter.queueFieldUpdate(rowId, columnId, finalValue);

      // Also save any other local input values for this row
      localInputValues.forEach((localValue, localKey) => {
        const [localRowId, localColumnId] = localKey.split(":");
        if (localRowId === rowId && localColumnId !== columnId) {
          // Convert based on column type
          const col = columns.find((c) => c.id === localColumnId);
          let convertedValue: any = localValue;
          if (col?.dataType === "currency") {
            convertedValue =
              localValue === "" ? "" : parseFloat(localValue) || 0;
          }

          // Save to Firebase
          batchedWriter.queueFieldUpdate(rowId, localColumnId, convertedValue);
        }
      });

      // CRITICAL: Trigger function recomputation AFTER saving to Firebase
      // This ensures dependent functions recompute with the latest saved values
      await recomputeDirectDependentsForRow(rowId, columnId, finalValue);

      // Clear ALL local state for this row after Firebase updates and recomputation
      setLocalInputValues((prev) => {
        const newMap = new Map(prev);
        // Remove all entries for this row
        Array.from(newMap.keys()).forEach((key) => {
          if (key.startsWith(`${rowId}:`)) {
            newMap.delete(key);
          }
        });
        return newMap;
      });
    },
    [localInputValues, columns, recomputeDirectDependentsForRow]
  );

  // Helper function to update input value - ONLY local state updates during typing!
  const updateInputValue = useCallback(
    (rowId: string, columnId: string, value: string, dataType?: string) => {
      const key = `${rowId}:${columnId}`;

      // Update local state immediately for responsive UI - NO Firebase calls!
      setLocalInputValues((prev) => new Map(prev).set(key, value));

      // Clear any existing timeout - we only save on blur now
      const existingTimeout = firebaseUpdateTimeouts.current.get(key);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        firebaseUpdateTimeouts.current.delete(key);
      }

      // NO function recomputation during typing - only on save/blur for performance
    },
    []
  );

  // Handle keyboard input to replace selected cell value
  const handleKeyboardInput = useCallback(
    (event: KeyboardEvent) => {
      const key = event.key;

      // Handle Escape key globally (works regardless of selected cell)
      if (key === "Escape") {
        event.preventDefault();
        event.stopPropagation();

        // Remove focus from any active input field
        const activeElement = document.activeElement;
        if (
          activeElement &&
          (activeElement.tagName === "INPUT" ||
            activeElement.tagName === "TEXTAREA" ||
            (activeElement as HTMLElement).contentEditable === "true")
        ) {
          // Set flag to prevent handleBlur from saving
          isCancelingChanges.current = true;

          // Force complete re-render by clearing all local state
          // This will make the table get fresh values from Firebase
          setLocalInputValues(new Map()); // Clear all local input values
          setLocalData(data); // Reset localData to match Firebase data

          // Force a re-render by updating a dummy state
          setForceRerender((prev) => prev + 1);

          (activeElement as HTMLElement).blur();

          // Reset the cancel flag after a short delay to allow handleBlur to check it
          setTimeout(() => {
            isCancelingChanges.current = false;
          }, 0);

          // Ensure the cell remains selected for arrow key navigation
          const cellElement = activeElement.closest('[role="gridcell"]');
          if (cellElement) {
            // Set the cell as selected for React Data Grid
            cellElement.setAttribute("aria-selected", "true");
            (cellElement as HTMLElement).focus();
          }
        }
        return;
      }

      // Handle Enter key - save and exit if editing, or start editing if not
      if (key === "Enter") {
        const activeElement = document.activeElement;

        // Check if we're already editing (input field is focused)
        if (
          activeElement &&
          (activeElement.tagName === "INPUT" ||
            activeElement.tagName === "TEXTAREA" ||
            (activeElement as HTMLElement).contentEditable === "true")
        ) {
          // We're editing - save and exit edit mode
          event.preventDefault();
          event.stopPropagation();

          // Save the current value and exit edit mode
          const cellElement = activeElement.closest('[role="gridcell"]');
          if (cellElement) {
            // Get row element and extract rowId using same logic as monitorSelectedCell
            const rowElement = cellElement.closest(
              '[role="row"]'
            ) as HTMLElement;
            if (rowElement) {
              // Try to get row ID from row attributes or data
              const rowDataAttributes = Array.from(
                rowElement.attributes
              ).filter(
                (attr) =>
                  attr.name.startsWith("data-") &&
                  (attr.name.includes("row") || attr.name.includes("id"))
              );

              let rowId = rowDataAttributes.find(
                (attr) => attr.name.includes("row") || attr.name.includes("id")
              )?.value;

              // If no data attributes, try to find by row index
              if (!rowId) {
                const allRows = document.querySelectorAll('.rdg [role="row"]');
                const rowIndex = Array.from(allRows).indexOf(rowElement);
                if (rowIndex >= 0 && rowIndex < data.length) {
                  rowId = data[rowIndex].id;
                }
              }

              // Get column ID from aria-colindex
              const ariaColIndex = cellElement.getAttribute("aria-colindex");
              const actualColumnIndex = ariaColIndex
                ? parseInt(ariaColIndex) - 1
                : -1;
              const visibleColumns = columns.filter(
                (col) => col.showColumn !== false
              );

              if (
                rowId &&
                actualColumnIndex >= 0 &&
                actualColumnIndex < visibleColumns.length
              ) {
                const columnId = visibleColumns[actualColumnIndex].id;
                const currentValue = getInputValue(
                  rowId,
                  columnId,
                  data.find((row) => row.id === rowId)?.[
                    columnId as keyof SheetData
                  ]
                );

                // Get the original value from the row data
                const originalValue = data.find((row) => row.id === rowId)?.[
                  columnId as keyof SheetData
                ];

                // Check if it's a currency field
                const column = columns.find((col) => col.id === columnId);
                const isCurrency = column?.dataType === "currency";

                // Convert values for comparison
                let shouldSave = false;
                if (isCurrency) {
                  const currentValueConverted =
                    currentValue === "" ? "" : parseFloat(currentValue) || 0;
                  const originalValueConverted =
                    originalValue === ""
                      ? ""
                      : parseFloat(originalValue?.toString() || "0") || 0;
                  shouldSave = currentValueConverted !== originalValueConverted;
                } else {
                  shouldSave = currentValue !== originalValue?.toString();
                }

                // Only save if the value has actually changed
                if (shouldSave) {
                  saveToFirebase(
                    rowId,
                    columnId,
                    currentValue,
                    isCurrency ? "currency" : undefined
                  );
                }
              }
            }
          }

          (activeElement as HTMLElement).blur();

          // Ensure the cell remains selected for arrow key navigation
          if (cellElement) {
            cellElement.setAttribute("aria-selected", "true");
            (cellElement as HTMLElement).focus();
          }
        } else {
          // We're not editing - start editing by focusing the input
          if (selectedCellInfo) {
            event.preventDefault();
            event.stopPropagation();

            // Focus the input field in the selected cell to start editing
            const selectedCellElement = selectedCellInfo.cellElement;
            if (selectedCellElement) {
              const inputElement = selectedCellElement.querySelector("input");
              if (inputElement) {
                inputElement.focus();
                // Don't select all text - just focus for editing
              }
            }
          }
        }
        return;
      }

      // Handle arrow keys when editing - prevent cell navigation
      if (
        key === "ArrowLeft" ||
        key === "ArrowRight" ||
        key === "ArrowUp" ||
        key === "ArrowDown"
      ) {
        const activeElement = document.activeElement;
        if (
          activeElement &&
          (activeElement.tagName === "INPUT" ||
            activeElement.tagName === "TEXTAREA" ||
            (activeElement as HTMLElement).contentEditable === "true")
        ) {
          // Prevent default to stop React Data Grid from handling arrow keys
          event.preventDefault();
          event.stopPropagation();

          // Manually trigger arrow key behavior in the input field
          const inputElement = activeElement as HTMLInputElement;
          if (inputElement) {
            const currentPosition = inputElement.selectionStart || 0;
            const textLength = inputElement.value.length;

            switch (key) {
              case "ArrowLeft":
                inputElement.setSelectionRange(
                  Math.max(0, currentPosition - 1),
                  Math.max(0, currentPosition - 1)
                );
                break;
              case "ArrowRight":
                inputElement.setSelectionRange(
                  Math.min(textLength, currentPosition + 1),
                  Math.min(textLength, currentPosition + 1)
                );
                break;
              case "ArrowUp":
                // For single-line inputs, move to beginning
                inputElement.setSelectionRange(0, 0);
                break;
              case "ArrowDown":
                // For single-line inputs, move to end
                inputElement.setSelectionRange(textLength, textLength);
                break;
            }
          }
          return;
        }
      }

      // Only handle other keys if we have a selected cell and it's not already being edited
      if (!selectedCellInfo) return;

      // Check if we're already in an input field (don't interfere with existing editing)
      const activeElement = document.activeElement;
      if (
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          (activeElement as HTMLElement).contentEditable === "true")
      ) {
        return;
      }

      // Handle special keys
      if (key === "Delete" || key === "Backspace") {
        // Clear the cell value
        event.preventDefault();
        event.stopPropagation();

        // Clear the cell value
        updateInputValue(selectedCellInfo.rowId, selectedCellInfo.columnId, "");

        // Force immediate re-render by updating localData state
        setLocalData((prevData) => {
          return prevData.map((row) =>
            row.id === selectedCellInfo.rowId
              ? { ...row, [selectedCellInfo.columnId]: "" }
              : row
          );
        });

        // Focus the input field after state update
        setTimeout(() => {
          const selectedCellElement = selectedCellInfo.cellElement;
          if (selectedCellElement) {
            const inputElement = selectedCellElement.querySelector("input");
            if (inputElement) {
              inputElement.focus();
            }
          }
        }, 0);
        return;
      }

      // Only handle printable characters (not special keys like Enter, Escape, etc.)
      if (
        key.length === 1 &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        // Focus the input field and select all text immediately
        const selectedCellElement = selectedCellInfo.cellElement;
        if (selectedCellElement) {
          const inputElement = selectedCellElement.querySelector("input");
          if (inputElement) {
            // Focus the input field
            inputElement.focus();

            // Select all text so the typed character will replace it
            inputElement.select();

            // The typed character will naturally replace the selected text
            // No need to manually update state - the onChange handler will handle it
          }
        }

        // Don't prevent default - let the character be typed naturally
      }
    },
    [
      selectedCellInfo,
      updateInputValue,
      localInputValues,
      data,
      getInputValue,
      setLocalData,
    ]
  );

  // Set up keyboard event listener for cell value replacement
  useEffect(() => {
    // Add keyboard event listener with capture phase to intercept arrow keys early
    document.addEventListener("keydown", handleKeyboardInput, true); // true = capture phase

    return () => {
      document.removeEventListener("keydown", handleKeyboardInput, true);
    };
  }, [handleKeyboardInput]);

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
        // Skip recomputation if the cell is currently being edited
        for (const field of changedFields) {
          // Skip recomputation if this specific cell is being edited
          if (
            editingCell &&
            editingCell.rowId === changedRow.id &&
            editingCell.columnId === field.id
          ) {
            continue;
          }

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
  }, [data, columns, recomputeDirectDependentsForRow, editingCell]);

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

  // Recompute all function columns for all rows (used after CSV import)
  // This function is RECURSIVE - it calls itself on errors with progressive backoff
  // Maximum attempts: MAX_RECOMPUTE_ATTEMPTS (30)
  // Backoff strategy: 2s, 4s, 8s, 16s, 30s, then 30s for remaining attempts
  const recomputeAllFunctionColumns = useCallback(
    async (isRetry = false, retryAttempt = 1) => {
      try {
        // Safety check to prevent infinite recursion
        if (retryAttempt > MAX_RECOMPUTE_ATTEMPTS) {
          console.error(
            `🚫 [FUNCTION RECOMPUTE] Maximum attempts (${MAX_RECOMPUTE_ATTEMPTS}) exceeded, aborting recursion`
          );
          setRecomputeProgress({
            completed: 1,
            total: 1,
            phase: "done",
            attempt: retryAttempt,
            maxAttempts: MAX_RECOMPUTE_ATTEMPTS,
            errorDetected: true,
            errorCount: attemptErrorCountRef.current || 0,
          });
          setIsRecomputingAll(false);
          return;
        }

        if (!isRetry) {
          console.log(
            "🔄 [FUNCTION RECOMPUTE] Starting recomputation of all function columns"
          );
          setIsRecomputingAll(true);
          // Reset error count for fresh start
          attemptErrorCountRef.current = 0;
          setRecomputeProgress({
            completed: 0,
            total: 0,
            phase: "init",
            attempt: retryAttempt,
            maxAttempts: MAX_RECOMPUTE_ATTEMPTS,
            errorDetected: false,
            errorCount: 0,
          });
        } else {
          console.log(
            `🔄 [FUNCTION RECOMPUTE] Retrying recomputation (attempt ${retryAttempt}/${MAX_RECOMPUTE_ATTEMPTS})`
          );
          setRecomputeProgress({
            completed: 0,
            total: 0,
            phase: "init",
            attempt: retryAttempt,
            maxAttempts: MAX_RECOMPUTE_ATTEMPTS,
            errorDetected: false,
            errorCount: 0,
          });
        }

        const functionColumns = columns.filter(
          (c) => c.dataType === "function" && !!c.function
        );

        if (functionColumns.length === 0) {
          console.log("✅ [FUNCTION RECOMPUTE] No function columns found");
          setRecomputeProgress({
            completed: 1,
            total: 1,
            phase: "done",
            attempt: 0,
            maxAttempts: MAX_RECOMPUTE_ATTEMPTS,
            errorDetected: false,
            errorCount: 0,
          });
          setIsRecomputingAll(false);
          return;
        }

        // Use live rows to avoid stale state during async flows (like CSV import)
        const rows = getCurrentRows();

        console.log(
          `🔄 [FUNCTION RECOMPUTE] Processing ${functionColumns.length} function columns for ${rows.length} rows`
        );

        // Build function-to-function dependency order using existing dependencyGraph
        // Edge A -> B means B depends on A (A should be computed before B)
        const funcIdToCol = new Map<string, SheetColumn>();
        const funcIds = new Set<string>();
        functionColumns.forEach((fc) => {
          funcIdToCol.set(fc.id, fc);
          funcIds.add(fc.id);
        });

        const adj = new Map<string, Set<string>>();
        const indegree = new Map<string, number>();
        functionColumns.forEach((fc) => {
          adj.set(fc.id, new Set());
          indegree.set(fc.id, 0);
        });

        // dependencyGraph: source column id -> function columns depending on it
        // Only keep edges where source is also a function column
        dependencyGraph.forEach((dependents, sourceColId) => {
          if (!funcIds.has(sourceColId)) return;
          dependents.forEach((depCol) => {
            if (!funcIds.has(depCol.id)) return;
            const set = adj.get(sourceColId)!;
            if (!set.has(depCol.id)) {
              set.add(depCol.id);
              indegree.set(depCol.id, (indegree.get(depCol.id) || 0) + 1);
            }
          });
        });

        // Kahn's algorithm for topological sort
        const queue: string[] = [];
        indegree.forEach((deg, id) => {
          if ((deg || 0) === 0) queue.push(id);
        });
        const topoOrderIds: string[] = [];
        while (queue.length > 0) {
          const id = queue.shift()!;
          topoOrderIds.push(id);
          (adj.get(id) || new Set()).forEach((nbr) => {
            const nextDeg = (indegree.get(nbr) || 0) - 1;
            indegree.set(nbr, nextDeg);
            if (nextDeg === 0) queue.push(nbr);
          });
        }

        const topoOrderedCols: SheetColumn[] = topoOrderIds
          .map((id) => funcIdToCol.get(id)!)
          .filter(Boolean);
        const visitedIds = new Set(topoOrderIds);
        const cyclicCols: SheetColumn[] = functionColumns.filter(
          (fc) => !visitedIds.has(fc.id)
        );

        // Initialize progress totals (best effort upper bound)
        const MAX_PASSES = 5;
        const totalWorkBase =
          rows.length * topoOrderedCols.length +
          rows.length *
            cyclicCols.length *
            (cyclicCols.length > 0 ? MAX_PASSES : 0);

        // Clear cache for all function columns
        rows.forEach((row) => {
          functionColumns.forEach((funcCol) => {
            const cacheKey = `${row.id}:${funcCol.id}:${funcCol.function}`;
            functionArgsCacheRef.current.delete(cacheKey);
          });
        });

        // Reset error tracking for this attempt
        attemptErrorCountRef.current = 0;

        setRecomputeProgress({
          completed: 0,
          total: Math.max(totalWorkBase, 1),
          phase: "acyclic",
          attempt: retryAttempt,
          maxAttempts: MAX_RECOMPUTE_ATTEMPTS,
          errorDetected: false,
          errorCount: 0,
          currentRowId: undefined,
          currentColId: undefined,
        });

        // Process rows in parallel batches for better performance
        const BATCH_SIZE = 10; // Process 10 rows at a time
        const totalBatches = Math.ceil(rows.length / BATCH_SIZE);

        console.log(
          `🚀 [FUNCTION RECOMPUTE] Processing ${rows.length} rows in ${totalBatches} parallel batches of ${BATCH_SIZE}`
        );

        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
          const batchStart = batchIndex * BATCH_SIZE;
          const batchEnd = Math.min(batchStart + BATCH_SIZE, rows.length);
          const batchRows = rows.slice(batchStart, batchEnd);

          console.log(
            `📦 [BATCH ${batchIndex + 1}/${totalBatches}] Processing rows ${
              batchStart + 1
            }-${batchEnd}`
          );

          // Process all rows in this batch in parallel
          const batchPromises = batchRows.map(async (originalRow) => {
            const rowSnapshot: SheetData = { ...originalRow };
            let rowErrors = 0;

            // 1) Acyclic: compute in dependency order
            for (const funcCol of topoOrderedCols) {
              try {
                // Check if function is likely to be slow/async
                const isLikelyAsync = await isFunctionLikelyAsync(
                  funcCol.function || ""
                );
                const isSlow = isSlowFunction(funcCol.function || "");

                // Track execution time
                const executionStart = performance.now();
                const result = await computeFunctionForRow(
                  rowSnapshot,
                  funcCol,
                  true
                );
                const executionTime = performance.now() - executionStart;

                // Update execution time tracking
                const functionId = funcCol.function || "";
                const times = executionTimesRef.current.get(functionId) || [];
                times.push(executionTime);
                if (times.length > 10) times.shift(); // Keep only last 10 measurements
                executionTimesRef.current.set(functionId, times);

                // Log slow functions for monitoring
                if (executionTime > 2000) {
                  console.log(
                    `⏰ [SLOW FUNCTION] ${
                      funcCol.columnName
                    } (${functionId}) took ${executionTime.toFixed(2)}ms`
                  );
                }

                if (!isEqual(rowSnapshot[funcCol.id], result)) {
                  rowSnapshot[funcCol.id] = result as any;
                }

                // Add minimal delay for async/slow functions only
                if (isLikelyAsync || isSlow) {
                  await new Promise((resolve) => setTimeout(resolve, 50)); // Reduced delay
                }
              } catch (error) {
                rowErrors++;
                logFunctionError(
                  `❌ [FUNCTION RECOMPUTE] Error computing ${funcCol.id} for row ${originalRow.id}:`,
                  error
                );
              }
            }

            // 2) Cyclic or unresolved: bounded multi-pass across the remaining set
            if (cyclicCols.length > 0) {
              for (let pass = 1; pass <= MAX_PASSES; pass++) {
                let changedInPass = false;
                for (const funcCol of cyclicCols) {
                  try {
                    // Check if function is likely to be slow/async
                    const isLikelyAsync = await isFunctionLikelyAsync(
                      funcCol.function || ""
                    );
                    const isSlow = isSlowFunction(funcCol.function || "");

                    // Track execution time
                    const executionStart = performance.now();
                    const result = await computeFunctionForRow(
                      rowSnapshot,
                      funcCol,
                      true
                    );
                    const executionTime = performance.now() - executionStart;

                    // Update execution time tracking
                    const functionId = funcCol.function || "";
                    const times =
                      executionTimesRef.current.get(functionId) || [];
                    times.push(executionTime);
                    if (times.length > 10) times.shift(); // Keep only last 10 measurements
                    executionTimesRef.current.set(functionId, times);

                    // Log slow functions for monitoring
                    if (executionTime > 2000) {
                      console.log(
                        `⏰ [SLOW FUNCTION] ${
                          funcCol.columnName
                        } (${functionId}) took ${executionTime.toFixed(
                          2
                        )}ms (cyclic pass ${pass})`
                      );
                    }

                    if (!isEqual(rowSnapshot[funcCol.id], result)) {
                      rowSnapshot[funcCol.id] = result as any;
                      changedInPass = true;
                    }

                    // Add minimal delay for async/slow functions only
                    if (isLikelyAsync || isSlow) {
                      await new Promise((resolve) => setTimeout(resolve, 50)); // Reduced delay
                    }
                  } catch (error) {
                    rowErrors++;
                    logFunctionError(
                      `❌ [FUNCTION RECOMPUTE] Error computing ${funcCol.id} for row ${originalRow.id}:`,
                      error
                    );
                  }
                }
                if (!changedInPass) break;
              }
            }

            return { rowId: originalRow.id, errors: rowErrors };
          });

          // Wait for all rows in this batch to complete
          const batchResults = await Promise.all(batchPromises);

          // Update error count for this batch
          const batchErrors = batchResults.reduce(
            (sum, result) => sum + result.errors,
            0
          );
          attemptErrorCountRef.current =
            (attemptErrorCountRef.current || 0) + batchErrors;

          // Update progress for this batch (throttled to reduce UI updates)
          const batchProgress =
            batchRows.length *
            (topoOrderedCols.length + cyclicCols.length * MAX_PASSES);

          // Only update progress every 2 batches to reduce UI update frequency
          if (batchIndex % 2 === 0 || batchIndex === totalBatches - 1) {
            setRecomputeProgress((prev) => ({
              ...prev,
              completed: Math.min(prev.completed + batchProgress, prev.total),
              phase: batchIndex === totalBatches - 1 ? "flushing" : "acyclic",
              attempt: retryAttempt,
              maxAttempts: MAX_RECOMPUTE_ATTEMPTS,
              errorDetected: batchErrors > 0,
              errorCount: (prev.errorCount || 0) + batchErrors,
            }));
          }

          console.log(
            `✅ [BATCH ${
              batchIndex + 1
            }/${totalBatches}] Completed with ${batchErrors} errors`
          );
        }

        // Force immediate persistence
        setRecomputeProgress((prev) => ({ ...prev, phase: "flushing" }));
        batchedWriter.flush();

        const finalErrorCount = attemptErrorCountRef.current || 0;

        // If there were errors and we haven't exceeded max attempts, retry after progressive delay
        if (finalErrorCount > 0 && retryAttempt < MAX_RECOMPUTE_ATTEMPTS) {
          // Progressive backoff: 2s, 4s, 8s, 16s, 30s, then 30s for remaining attempts
          const baseDelay = 2000;
          const progressiveDelay = Math.min(
            baseDelay * Math.pow(2, retryAttempt - 1),
            30000
          );

          console.log(
            `⏱️ [FUNCTION RECOMPUTE] Attempt ${retryAttempt} had ${finalErrorCount} errors, retrying in ${
              progressiveDelay / 1000
            } seconds...`
          );
          console.log(
            `🔄 [RECURSION] Will recursively call recomputeAllFunctionColumns(true, ${
              retryAttempt + 1
            })`
          );
          setRecomputeProgress((prev) => ({
            ...prev,
            phase: "init",
            completed: 0,
            currentRowId: undefined,
            currentColId: undefined,
          }));

          // Progressive delay before retry to give async functions more time
          setTimeout(() => {
            console.log(
              `🔄 [FUNCTION RECOMPUTE] Initiating recursive retry attempt ${
                retryAttempt + 1
              }/${MAX_RECOMPUTE_ATTEMPTS}`
            );
            // Wrap recursive call in try-catch to prevent unhandled errors
            try {
              recomputeAllFunctionColumns(true, retryAttempt + 1);
            } catch (error) {
              console.error(
                `❌ [FUNCTION RECOMPUTE] Error in recursive call attempt ${
                  retryAttempt + 1
                }:`,
                error
              );
              // If recursive call fails, mark as done with error
              setRecomputeProgress((prev) => ({
                ...prev,
                completed: prev.total,
                phase: "done",
                attempt: retryAttempt,
                errorDetected: true,
                errorCount: (prev.errorCount || 0) + 1,
              }));
              setIsRecomputingAll(false);
            }
          }, progressiveDelay);
          return;
        }

        // Completed (either successfully or max attempts reached)
        if (finalErrorCount > 0) {
          console.log(
            `⚠️ [FUNCTION RECOMPUTE] Completed with ${finalErrorCount} remaining errors after ${retryAttempt} attempts`
          );
        } else {
          console.log(
            "✅ [FUNCTION RECOMPUTE] Completed recomputation of all function columns with no errors"
          );
        }

        setRecomputeProgress((prev) => ({
          ...prev,
          completed: prev.total,
          phase: "done",
          attempt: 0,
        }));
        // Small delay to let users see 100%
        setTimeout(() => setIsRecomputingAll(false), 400);
      } catch (error) {
        console.error(
          `❌ [FUNCTION RECOMPUTE] Critical error in recompute process (attempt ${retryAttempt}):`,
          error
        );
        // Mark as failed and stop recomputing
        setRecomputeProgress({
          completed: 1,
          total: 1,
          phase: "done",
          attempt: retryAttempt,
          maxAttempts: MAX_RECOMPUTE_ATTEMPTS,
          errorDetected: true,
          errorCount: (attemptErrorCountRef.current || 0) + 1,
        });
        setIsRecomputingAll(false);
      }
    },
    [columns, computeFunctionForRow, getCurrentRows]
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
    } else {
      // Default sorting by row field if no explicit sorting is applied
      filtered = [...filtered].sort((a, b) => {
        const aRow = typeof a.row === "number" ? a.row : 0;
        const bRow = typeof b.row === "number" ? b.row : 0;
        return aRow - bRow;
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
  // Always show at least one empty row for the add button, even when page is full
  const rowsToShow = Math.max(pageSize, currentPageData.length + 1);

  // Calculate dynamic height based on number of rows
  //   const dynamicHeight = rowsToShow * rowHeight + headerHeight + 150;

  // Use state for dynamic height to avoid hydration mismatch
  const [dynamicHeight, setDynamicHeight] = useState(
    isFullscreen ? 800 : 450 // Default values for SSR
  );

  // Update height after component mounts to avoid hydration mismatch
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (isFullscreen) {
        setDynamicHeight(window.innerHeight - 150);
      } else {
        // Calculate 20vh in pixels
        const vh20 = window.innerHeight * 0.48;
        setDynamicHeight(window.innerHeight - vh20);
      }
    }
  }, [isFullscreen]);

  // Helper function to render empty row cells
  const renderEmptyRowCell = (
    column: any,
    isFirstEmptyRow: boolean,
    shouldShowAddButton: boolean
  ) => {
    const isFirstColumn = column.key === columns[0]?.id;

    // Debug logging
    if (isFirstEmptyRow) {
      console.log("🔍 [ADD BUTTON DEBUG]", {
        columnKey: column.key,
        firstColumnId: columns[0]?.id,
        isFirstColumn,
        shouldShowAddButton,
        hasActiveFilters: getActiveFiltersCount() > 0,
        activeFiltersCount: getActiveFiltersCount(),
      });
    }

    if (isFirstColumn && shouldShowAddButton) {
      return (
        <span
          className={`h-8 w-full flex items-center px-2 ${
            isFirstEmptyRow ? "opacity-100" : "opacity-60"
          }`}
        >
          <Button
            onClick={handleAddNewRow}
            disabled={isAddingRow}
            className="bg-royal-purple hover:bg-royal-purple/90 h-6 px-2 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Booking
          </Button>
        </span>
      );
    }

    return (
      <span
        className={`h-8 w-full flex items-center text-sm px-2 ${
          isFirstEmptyRow ? "opacity-100" : "opacity-60"
        }`}
      >
        -
      </span>
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
      const shouldShowAddButton = isFirstEmptyRow && !hasActiveFilters;

      // Debug logging for first empty row
      // if (isFirstEmptyRow) {
      //   console.log("🔍 [EMPTY ROW DEBUG]", {
      //     currentPageDataLength: currentPageData.length,
      //     rowsToShow,
      //     hasActiveFilters,
      //     activeFiltersCount: getActiveFiltersCount(),
      //     shouldShowAddButton,
      //     isFirstEmptyRow,
      //   });
      // }

      emptyRows.push({
        id: `empty-${i}`,
        _isDataRow: false,
        _isEmptyRow: true,
        _isFirstEmptyRow: isFirstEmptyRow,
        _displayIndex: actualRowNumber,
        _shouldShowAddButton: shouldShowAddButton,
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

  // Custom select editor with dropdown functionality
  const selectEditor = useCallback(
    ({ row, column, onRowChange, onClose }: RenderEditCellProps<SheetData>) => {
      // Get column definition to access options
      const columnDef = columns.find((col) => col.id === column.key);
      const options = columnDef?.options || [];

      const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newValue = e.target.value;

        // Update local row state
        onRowChange({ ...row, [column.key]: newValue });

        // Save to Firestore
        try {
          await bookingService.updateBookingField(row.id, column.key, newValue);
          // Trigger recomputation for dependent function columns
          await recomputeDirectDependentsForRow(row.id, column.key, newValue);
        } catch (error) {
          console.error("Failed to update select field:", error);
        }

        onClose(true); // Auto-close after selection
      };

      const handleKeyDown = (e: React.KeyboardEvent<HTMLSelectElement>) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose(false);
        } else if (e.key === "Enter") {
          e.preventDefault();
          onClose(true);
        }
      };

      const cellValue = row[column.key as keyof SheetData];
      const displayValue = cellValue?.toString() || "";

      return (
        <select
          value={displayValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={() => onClose(true)}
          autoFocus
          className="h-8 w-full px-2 text-xs border-none outline-none bg-white cursor-pointer"
        >
          <option value=""></option>
          {options.map((option: string) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    },
    [columns, recomputeDirectDependentsForRow]
  );

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
            // Special case: "ID" refers to the document ID
            if (arg.columnReference === "ID") {
              const value = row.id;
              if (value === undefined || value === null) return "null";
              if (typeof value === "string") return `"${value}"`;
              if (typeof value === "object") return JSON.stringify(value);
              return String(value);
            }
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
              // Special case: "ID" refers to the document ID
              if (ref === "ID") {
                const value = row.id;
                if (value === undefined || value === null) return "null";
                if (typeof value === "string") return `"${value}"`;
                return String(value);
              }
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
      <span className="h-8 w-full flex items-center justify-center px-2">
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
      </span>
    );
  }

  const FunctionFormatter = memo(function FunctionFormatter({
    row,
    column,
  }: RenderCellProps<SheetData>) {
    const columnDef = (column as any).columnDef as SheetColumn;
    const deleteRow = (column as any).deleteRow as
      | ((rowId: string) => Promise<void>)
      | undefined;
    const recomputeCell = (column as any).recomputeCell as
      | ((rowId: string, columnId: string) => Promise<void>)
      | undefined;
    const openDebugConsole = (column as any).openDebugConsole as
      | ((rowId: string, columnId: string) => void)
      | undefined;

    const [isRecomputing, setIsRecomputing] = useState(false);

    if (columnDef.id === "delete") {
      return (
        <span className="h-8 w-full flex items-center justify-center px-2">
          <Button
            variant="destructive"
            size="sm"
            className="bg-crimson-red hover:bg-crimson-red/90"
            onClick={async () => {
              if (deleteRow) {
                try {
                  await deleteRow(row.id);
                } catch (error) {
                  console.error("Failed to delete row:", error);
                  // The error will be handled by the hook's error handling
                }
              }
            }}
          >
            Delete
          </Button>
        </span>
      );
    }

    const value = row[column.key as keyof SheetData];

    const handleRetry = async (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent cell click
      if (recomputeCell && !isRecomputing) {
        setIsRecomputing(true);
        try {
          await recomputeCell(row.id, column.key);
        } catch (error) {
          logFunctionError("Failed to recompute cell:", error);
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
        <span className="h-8 w-full flex items-center text-xs px-2 relative group">
          <span className="flex-1 h-full flex items-center pr-16">
            <span className="text-xs">{value?.toString() || ""}</span>
          </span>
          <span className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
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
              className={`p-1 hover:bg-royal-purple/10 rounded transition-all disabled:cursor-not-allowed ${
                isRecomputing
                  ? "opacity-50"
                  : "opacity-0 group-hover:opacity-100"
              }`}
              title="Retry computation"
            >
              <RefreshCw
                className={`h-3 w-3 text-royal-purple ${
                  isRecomputing ? "animate-spin" : ""
                }`}
              />
            </button>
          </span>
        </span>
      </>
    );
  });

  // Convert SheetColumn to react-data-grid Column format
  const gridColumns = useMemo<Column<SheetData>[]>(() => {
    // Safety check for columns
    if (!columns || !Array.isArray(columns)) {
      return [];
    }

    // Add row number column first
    const rowNumberColumn: Column<SheetData> = {
      key: "rowNumber",
      name: "Doc #",
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
              #
            </div>
            {/* Column Name Row */}
            <div className="flex items-center justify-center flex-1 px-2 mt-10">
              <span className="font-medium text-foreground">Row #</span>
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
          // Show add button in first empty row
          if (isFirstEmptyRow && shouldShowAddButton) {
            return (
              <span className="h-8 w-16 flex items-center justify-center px-2 bg-muted relative z-[999999999]">
                <Button
                  onClick={handleAddNewRow}
                  disabled={isAddingRow}
                  className="bg-royal-purple hover:bg-royal-purple/90 h-6 px-2 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                </Button>
              </span>
            );
          }

          // Calculate what the next row number would be for the first empty row (filling gaps)
          let nextRowNumber = "-";
          if (isFirstEmptyRow && data && data.length > 0) {
            // Find the first missing row number (same logic as handleAddNewRow)
            const rowNumbers = data
              .map((item) => {
                const row = item.row;
                return typeof row === "number" ? row : 0;
              })
              .filter((row) => row > 0)
              .sort((a, b) => a - b);

            let firstGap = 1;
            for (let i = 0; i < rowNumbers.length; i++) {
              if (rowNumbers[i] !== i + 1) {
                firstGap = i + 1;
                break;
              }
              firstGap = i + 2;
            }
            nextRowNumber = firstGap.toString();
          } else if (!isFirstEmptyRow) {
            // For subsequent empty rows, just show placeholder
            nextRowNumber = "-";
          }

          return (
            <span
              className={`h-8 w-16 flex items-center justify-center text-xs font-mono px-2 bg-muted relative z-[999999999] ${
                isFirstEmptyRow
                  ? "text-muted-foreground"
                  : "text-muted-foreground/60"
              }`}
            >
              {nextRowNumber}
            </span>
          );
        }

        const rowNumber = row.row;
        const isSelected = selectedRowId === row.id;
        return (
          <span
            onClick={() => setSelectedRowId(isSelected ? null : row.id)}
            className={`h-8 w-16 flex items-center justify-center text-xs font-mono text-foreground px-2 bg-muted relative z-[999999999] cursor-pointer hover:bg-royal-purple/20 transition-colors ${
              isSelected ? "ring-2 ring-inset ring-royal-purple" : ""
            }`}
            title={`Row ${rowNumber} (ID: ${row.id})`} // Show row number and ID on hover
          >
            {rowNumber || "-"}
          </span>
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
        (baseColumn as any).headerCellClass = "bg-black h-20 !p-0 text-xs"; // Increased height for two-row header, no padding

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
                  className="parent-tab-seperator bg-gray-400 border-r border-gray-900 px-2 py-1 text-xs font-semibold text-white uppercase tracking-wide absolute top-0 left-0 z-10 flex items-center"
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
                <div className="flex items-center gap-1 flex-1 justify-center text-xs">
                  {col.dataType === "function" && (
                    <FunctionSquare className="h-4 w-4 text-white" />
                  )}
                  {frozenColumnIds.has(col.id) && (
                    <Pin className="h-3 w-3 text-white" />
                  )}
                  <span className="font-medium truncate text-white text-xs">
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
              <span className="h-8 w-full flex items-center justify-center px-2">
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
              </span>
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
                className={`h-8 w-full border-0 focus:border-0 focus:ring-0 focus:outline-none focus-visible:ring-0 rounded-none text-xs px-2 ${
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
                className={`h-8 w-full border-0 focus:border-0 focus:ring-0 focus:outline-none focus-visible:ring-0 rounded-none text-xs px-2 ${
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
          baseColumn.renderEditCell = selectEditor;
          baseColumn.editable = true;
        } else if (col.dataType === "currency") {
          // Always render currency input (like select/date inputs)
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

            const cellValue = row[column.key as keyof SheetData];
            const displayValue = getInputValue(row.id, column.key, cellValue);

            // Check if this cell has unsaved changes
            const hasUnsavedChanges = localInputValues.has(
              `${row.id}:${column.key}`
            );

            const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
              const inputValue = e.target.value;
              // Only allow numeric characters and one decimal point
              const filteredValue = inputValue.replace(/[^0-9.]/g, "");
              // Ensure only one decimal point
              const parts = filteredValue.split(".");
              const finalValue =
                parts.length > 2
                  ? parts[0] + "." + parts.slice(1).join("")
                  : filteredValue;

              // Update with debounced Firebase update
              updateInputValue(row.id, column.key, finalValue, "currency");
            };

            const handleBlur = () => {
              // Don't save if we're canceling changes (Escape key)
              if (isCancelingChanges.current) {
                return;
              }

              // Save to Firebase on blur only if value has changed
              const currentValue = getInputValue(
                row.id,
                column.key,
                row[column.key as keyof SheetData]
              );

              // Get the original value from the row data
              const originalValue = row[column.key as keyof SheetData];

              // Convert values for comparison (handle currency type)
              const currentValueConverted =
                currentValue === "" ? "" : parseFloat(currentValue) || 0;
              const originalValueConverted =
                originalValue === ""
                  ? ""
                  : parseFloat(originalValue?.toString() || "0") || 0;

              // Only save if the value has actually changed
              if (currentValueConverted !== originalValueConverted) {
                saveToFirebase(row.id, column.key, currentValue, "currency");
              }
            };

            return (
              <input
                type="text"
                value={displayValue}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`h-8 w-full px-2 text-xs border-none outline-none bg-transparent ${
                  hasColor ? "text-black" : ""
                }`}
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
              <span className="h-8 w-full flex items-center text-xs px-2">
                <FunctionFormatter row={row} column={column} />
              </span>
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
        } else {
          // Always render text input (like select/date inputs)
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

            const cellValue = row[column.key as keyof SheetData];
            const displayValue = getInputValue(row.id, column.key, cellValue);

            const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
              const newValue = e.target.value;
              // Update with debounced Firebase update
              updateInputValue(row.id, column.key, newValue);
            };

            const handleBlur = () => {
              // Don't save if we're canceling changes (Escape key)
              if (isCancelingChanges.current) {
                return;
              }

              // Save to Firebase on blur only if value has changed
              const currentValue = getInputValue(
                row.id,
                column.key,
                row[column.key as keyof SheetData]
              );

              // Get the original value from the row data
              const originalValue = row[column.key as keyof SheetData];

              // Only save if the value has actually changed
              if (currentValue !== originalValue?.toString()) {
                saveToFirebase(row.id, column.key, currentValue);
              }
            };

            return (
              <input
                type="text"
                value={displayValue}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`h-8 w-full px-2 text-xs border-none outline-none bg-transparent ${
                  hasColor ? "text-black" : ""
                }`}
              />
            );
          };
          baseColumn.editable = false; // We handle editing through the input
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

            const cellValue = row[column.key as keyof SheetData];
            const displayValue = getInputValue(row.id, column.key, cellValue);

            const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
              const newValue = e.target.value;
              // Update with debounced Firebase update
              updateInputValue(row.id, column.key, newValue);
            };

            const handleBlur = () => {
              // Don't save if we're canceling changes (Escape key)
              if (isCancelingChanges.current) {
                return;
              }

              // Save to Firebase on blur only if value has changed
              const currentValue = getInputValue(
                row.id,
                column.key,
                row[column.key as keyof SheetData]
              );

              // Get the original value from the row data
              const originalValue = row[column.key as keyof SheetData];

              // Only save if the value has actually changed
              if (currentValue !== originalValue?.toString()) {
                saveToFirebase(row.id, column.key, currentValue);
              }
            };

            return (
              <input
                type="text"
                value={displayValue}
                onChange={handleChange}
                onBlur={handleBlur}
                className="h-8 w-full px-2 text-xs border-none outline-none bg-transparent"
              />
            );
          };
          baseColumn.editable = false; // We handle editing through the input
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
              <span
                className={`h-8 w-full flex items-center text-sm px-2 ${
                  hasColor ? "text-black" : ""
                }`}
              >
                {row[col.key as keyof SheetData]?.toString() || ""}
              </span>
            );
          },
          renderEditCell: undefined, // Not needed - we handle editing in renderCell
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
    getInputValue,
    updateInputValue,
    saveToFirebase,
    forceRerender,
  ]);

  const handleAddNewRow = async () => {
    try {
      setIsAddingRow(true);

      // Get all existing row numbers and find the first gap
      const existingRows = data || [];
      const rowNumbers = existingRows
        .map((item) => {
          const row = item.row;
          return typeof row === "number" ? row : 0;
        })
        .filter((row) => row > 0)
        .sort((a, b) => a - b); // Sort ascending

      // Find the first missing row number
      let nextRowNumber = 1;
      for (let i = 0; i < rowNumbers.length; i++) {
        if (rowNumbers[i] !== i + 1) {
          nextRowNumber = i + 1;
          break;
        }
        nextRowNumber = i + 2; // If no gap found, use next number
      }

      console.log("🔍 [ADD ROW DEBUG]", {
        existingRowNumbers: rowNumbers,
        nextRowNumber,
        totalRows: existingRows.length,
      });

      // Let Firebase generate the document ID automatically first
      const newRowId = await bookingService.createBooking({});

      // Create new row data with row field and id field populated
      const newRowData = {
        id: newRowId, // Save the document UID as a field in the document
        row: nextRowNumber,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Update the document with the complete data including the id field
      await bookingService.updateBooking(newRowId, newRowData);

      // Create the complete SheetData object for local state
      const newRow: SheetData = {
        id: newRowId,
        ...newRowData,
      };

      updateData([...data, newRow]);

      toast({
        title: "✅ Booking Created",
        description: `Successfully created a booking in row ${nextRowNumber}`,
        variant: "default",
      });
    } catch (error) {
      console.error("❌ Failed to add new row:", error);
      toast({
        title: "❌ Failed to Create Booking",
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

  const handleCSVImportComplete = useCallback(
    async (info?: { expectedRows?: number }) => {
      // Clear function cache to trigger recomputation
      clearFunctionCache();

      // Wait until Firestore subscription reflects the new dataset size.
      // Use refs to avoid stale closures while awaiting.
      const target = info?.expectedRows;
      const start = Date.now();
      const timeoutMs = 8000; // up to 8s to be safe on large imports
      if (typeof target === "number" && target > 0) {
        let stableCount = 0;
        while (Date.now() - start < timeoutMs) {
          const currentLen = getCurrentRows().length;
          if (currentLen === target) {
            stableCount++;
            if (stableCount >= 3) break; // ensure it's stable for a few checks
          } else {
            stableCount = 0;
          }
          await new Promise((r) => setTimeout(r, 120));
        }
      } else {
        // small debounce if no target provided
        await new Promise((r) => setTimeout(r, 250));
      }

      // Recompute all function columns after data is refreshed
      await recomputeAllFunctionColumns();

      console.log(
        "✅ [CSV IMPORT] CSV import complete and function columns recomputed"
      );
    },
    [clearFunctionCache, recomputeAllFunctionColumns, toast, getCurrentRows]
  );

  return (
    <div className="booking-data-grid space-y-6 relative">
      {!isFullscreen && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground font-hk-grotesk">
                Sheet Management (Legacy)
              </h2>
              <p className="text-muted-foreground">
                Manage your bookings data with spreadsheets
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleAddNewRow}
                disabled={isAddingRow}
                className="bg-royal-purple hover:bg-royal-purple/90"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Booking
              </Button>
              <CSVImport
                onImportComplete={handleCSVImportComplete}
                trigger={
                  <Button variant="outline" size="sm">
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Import CSV
                  </Button>
                }
              />
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
            isRowSelectable={(row) => {
              // Prevent empty rows from being selectable/editable
              return !(row as any)._isEmptyRow;
            }}
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

              // Helper function to convert value based on column type
              const convertValueByType = (
                value: any,
                columnDef: SheetColumn | undefined
              ) => {
                if (!columnDef) return value;

                // Convert currency to number
                if (columnDef.dataType === "currency") {
                  if (value === "" || value === null || value === undefined)
                    return 0;
                  const numericValue =
                    typeof value === "number" ? value : parseFloat(value);
                  return isNaN(numericValue) ? 0 : numericValue;
                }

                return value;
              };

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
                  let newValue = changedRow[fieldKey as keyof SheetData];

                  // Convert value based on column type
                  newValue = convertValueByType(newValue, columnDef);

                  if (oldValue !== newValue) {
                    batchedWriter.queueFieldUpdate(
                      changedRow.id,
                      fieldKey,
                      newValue
                    );
                    // Note: Recomputation will be triggered by Firebase listener
                  }

                  // Clear editing state after successful update
                  if (
                    editingCell &&
                    editingCell.rowId === changedRow.id &&
                    editingCell.columnId === fieldKey
                  ) {
                    setEditingCell(null);
                  }
                } else if (originalRow) {
                  // Multiple field changes - compare all fields
                  const changedFields = Object.keys(changedRow).filter(
                    (key) =>
                      key !== "id" && originalRow[key] !== changedRow[key]
                  );

                  // Process each changed field
                  for (const fieldKey of changedFields) {
                    let newValue = changedRow[fieldKey as keyof SheetData];
                    const fieldColumnDef = columns.find(
                      (col) => col.id === fieldKey
                    );

                    // Convert value based on column type
                    newValue = convertValueByType(newValue, fieldColumnDef);

                    batchedWriter.queueFieldUpdate(
                      changedRow.id,
                      fieldKey,
                      newValue
                    );
                    // Note: Recomputation will be triggered by Firebase listener
                  }

                  // Clear editing state after successful update
                  if (editingCell && editingCell.rowId === changedRow.id) {
                    setEditingCell(null);
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
                // Don't set editingCell - this prevents input focus
                // The cell will be selected and ready for keyboard input
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
              editable: false, // We handle editing through renderCell inputs
              renderCell: ({ row, column }) => {
                // Check if this column has a color by finding the column definition
                const columnDef = columns.find((col) => col.id === column.key);
                const hasColor = columnDef?.color && columnDef.color !== "none";

                const cellValue = row[column.key as keyof SheetData];
                const displayValue = getInputValue(
                  row.id,
                  column.key,
                  cellValue
                );

                const handleChange = (
                  e: React.ChangeEvent<HTMLInputElement>
                ) => {
                  const newValue = e.target.value;
                  // Update with debounced Firebase update
                  updateInputValue(row.id, column.key, newValue);
                };

                const handleBlur = () => {
                  // Don't save if we're canceling changes (Escape key)
                  if (isCancelingChanges.current) {
                    return;
                  }

                  // Force immediate Firebase update on blur
                  const key = `${row.id}:${column.key}`;
                  const existingTimeout =
                    firebaseUpdateTimeouts.current.get(key);
                  if (existingTimeout) {
                    clearTimeout(existingTimeout);
                    firebaseUpdateTimeouts.current.delete(key);
                  }

                  const currentValue = getInputValue(
                    row.id,
                    column.key,
                    row[column.key as keyof SheetData]
                  );
                  batchedWriter.queueFieldUpdate(
                    row.id,
                    column.key,
                    currentValue
                  );

                  // Clear local state
                  setLocalInputValues((prev) => {
                    const newMap = new Map(prev);
                    newMap.delete(key);
                    return newMap;
                  });
                };

                return (
                  <input
                    type="text"
                    value={displayValue}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`h-8 w-full px-2 text-xs border-none outline-none bg-transparent ${
                      hasColor ? "text-black" : ""
                    }`}
                  />
                );
              },
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

      {/* Floating Add Row Button for Fullscreen Mode */}
      {isFullscreen && (
        <div className="fixed bottom-6 right-6 z-40">
          <Button
            onClick={handleAddNewRow}
            disabled={isAddingRow}
            className="bg-royal-purple hover:bg-royal-purple/90 shadow-lg"
            size="lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Row
          </Button>
        </div>
      )}

      {/* Recompute progress overlay */}
      {isRecomputingAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-background rounded-lg shadow-xl p-6 w-full max-w-md mx-4 border border-royal-purple/20">
            <div className="flex items-center gap-3 mb-3">
              <RefreshCw className="h-5 w-5 text-royal-purple animate-spin" />
              <h3 className="text-lg font-semibold text-foreground">
                Recomputing function columns…
              </h3>
            </div>
            <div className="text-sm text-muted-foreground mb-2">
              {recomputeProgress.phase === "acyclic" &&
                "Computing in dependency order"}
              {recomputeProgress.phase === "cyclic" &&
                "Resolving cyclic dependencies"}
              {recomputeProgress.phase === "flushing" && "Saving changes"}
              {recomputeProgress.phase === "init" &&
                recomputeProgress.attempt &&
                recomputeProgress.attempt > 1 &&
                "Waiting to retry..."}
              {recomputeProgress.phase === "init" &&
                (!recomputeProgress.attempt ||
                  recomputeProgress.attempt === 1) &&
                "Preparing"}
              {recomputeProgress.attempt && (
                <span className="ml-1">
                  • Attempt {recomputeProgress.attempt}/
                  {recomputeProgress.maxAttempts}
                </span>
              )}
            </div>
            <Progress
              value={
                recomputeProgress.total > 0
                  ? Math.round(
                      (recomputeProgress.completed / recomputeProgress.total) *
                        100
                    )
                  : 0
              }
            />
            <div className="mt-2 text-xs text-muted-foreground flex justify-between items-center">
              <span>
                {Math.min(recomputeProgress.completed, recomputeProgress.total)}
                /{recomputeProgress.total} steps
              </span>
              <span className="flex items-center gap-2">
                {recomputeProgress.currentRowId
                  ? `Row ${recomputeProgress.currentRowId}`
                  : ""}
                {recomputeProgress.currentColId
                  ? ` • Col ${recomputeProgress.currentColId}`
                  : ""}
                {recomputeProgress.errorDetected && (
                  <span className="flex items-center text-amber-600">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    {recomputeProgress.errorCount || 0} error
                    {(recomputeProgress.errorCount || 0) === 1 ? "" : "s"}
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
