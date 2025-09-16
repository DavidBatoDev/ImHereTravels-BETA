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
const DataGrid = require("react-data-grid").DataGrid;
const textEditor = require("react-data-grid").textEditor;

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
import { Plus, Settings, Trash2 } from "lucide-react";
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
  const [value, setValue] = useState(() => {
    const cellValue = row[column.key as keyof SheetData];
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
        } else if (cellValue) {
          date = new Date(cellValue as string | number | Date);
        }
        if (date && !isNaN(date.getTime())) {
          return date.toISOString().split("T")[0];
        }
      } catch {
        // ignore
      }
    }
    return "";
  });

  const dateInputRef = useRef<HTMLInputElement>(null);

  // Trigger date picker when component mounts
  useEffect(() => {
    if (dateInputRef.current) {
      // Small delay to ensure the input is rendered
      setTimeout(() => {
        if (dateInputRef.current) {
          try {
            if (typeof dateInputRef.current.showPicker === "function") {
              dateInputRef.current.showPicker();
            } else {
              dateInputRef.current.focus();
              dateInputRef.current.click();
            }
          } catch (error) {
            console.log("Date picker trigger failed:", error);
            dateInputRef.current.focus();
          }
        }
      }, 150);
    }
  }, []);

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
    <div className="h-8 w-full px-2 border-r border-b border-gray-200">
      <Input
        ref={dateInputRef}
        type="date"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        onClick={() => {
          // Trigger the date picker when clicking on the input
          setTimeout(() => {
            if (dateInputRef.current) {
              try {
                if (typeof dateInputRef.current.showPicker === "function") {
                  dateInputRef.current.showPicker();
                } else {
                  dateInputRef.current.focus();
                  dateInputRef.current.click();
                }
              } catch (error) {
                console.log("Date picker click trigger failed:", error);
                dateInputRef.current.focus();
              }
            }
          }, 50);
        }}
        onDoubleClick={() => {
          // Double-click as additional trigger
          if (dateInputRef.current) {
            try {
              if (typeof dateInputRef.current.showPicker === "function") {
                dateInputRef.current.showPicker();
              } else {
                dateInputRef.current.focus();
              }
            } catch (error) {
              console.log("Date picker double-click trigger failed:", error);
            }
          }
        }}
        onFocus={() => {
          // Also try to trigger on focus
          setTimeout(() => {
            if (dateInputRef.current) {
              try {
                if (typeof dateInputRef.current.showPicker === "function") {
                  dateInputRef.current.showPicker();
                }
              } catch (error) {
                console.log("Date picker focus trigger failed:", error);
              }
            }
          }, 100);
        }}
        autoFocus
        className="h-8 border-2 border-royal-purple focus:border-royal-purple focus:ring-0 focus:outline-none focus-visible:ring-0 rounded-none w-full cursor-pointer"
      />
    </div>
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
    <div className="flex items-center justify-center h-8 w-full px-2 border-r border-b border-gray-200">
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
    <div className="h-8 w-full px-2 border-r border-b border-gray-200">
      <Select value={value} onValueChange={handleChange}>
        <SelectTrigger className="h-8 border-0 focus:border-0 text-sm transition-colors duration-200 focus:ring-0 focus:outline-none focus-visible:ring-0 rounded-none bg-transparent w-full">
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
    </div>
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
    <div className="h-8 w-full px-2 border-r border-b border-gray-200">
      <Input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        autoFocus
        className="h-8 border-2 border-royal-purple focus:border-royal-purple focus:ring-0 focus:outline-none focus-visible:ring-0 rounded-none w-full"
      />
    </div>
  );
});

// Custom cell editor component
const CustomCellEditor = memo(function CustomCellEditor({
  row,
  column,
  onSave,
  onCancel,
}: {
  row: SheetData;
  column: Column<SheetData>;
  onSave: (value: any) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(() => {
    const cellValue = row[column.key as keyof SheetData];
    if (cellValue && typeof cellValue === "object" && "toDate" in cellValue) {
      return (cellValue as any).toDate().toISOString().split("T")[0];
    }
    return cellValue?.toString() || "";
  });

  const columnDef = (column as any).columnDef as SheetColumn;
  const options = (column as any).options || [];
  const dateInputRef = useRef<HTMLInputElement>(null);

  console.log(
    "CustomCellEditor - Column key:",
    column.key,
    "ColumnDef:",
    columnDef,
    "DataType:",
    columnDef?.dataType
  );

  // Trigger date picker for date columns
  useEffect(() => {
    if (columnDef?.dataType === "date" && dateInputRef.current) {
      console.log(
        "Date editor useEffect triggered for column:",
        columnDef.columnName
      );
      // Small delay to ensure the input is rendered
      setTimeout(() => {
        if (dateInputRef.current) {
          console.log("Attempting to trigger date picker...");
          // Try multiple methods to trigger the date picker
          try {
            // Method 1: showPicker() if available
            if (typeof dateInputRef.current.showPicker === "function") {
              console.log("Using showPicker() method");
              dateInputRef.current.showPicker();
            } else {
              console.log("showPicker() not available, using focus + click");
              // Method 2: Focus and click
              dateInputRef.current.focus();
              dateInputRef.current.click();
            }
          } catch (error) {
            console.log("Date picker trigger failed:", error);
            // Method 3: Just focus as fallback
            dateInputRef.current.focus();
          }
        }
      }, 150);
    }
  }, [columnDef?.dataType]);

  const handleSave = useCallback(() => {
    let processedValue = value;

    if (columnDef?.dataType === "date") {
      processedValue = value ? new Date(value) : null;
    } else if (
      columnDef?.dataType === "number" ||
      columnDef?.dataType === "currency"
    ) {
      processedValue = parseFloat(value) || 0;
    } else if (columnDef?.dataType === "boolean") {
      processedValue = !!value;
    }

    onSave(processedValue);
  }, [value, columnDef, onSave]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Escape") {
        onCancel();
      }
    },
    [handleSave, onCancel]
  );

  const handleBlur = useCallback(() => {
    handleSave();
  }, [handleSave]);

  // Boolean editor
  if (columnDef?.dataType === "boolean") {
    return (
      <div className="h-8 w-full px-2 border-r border-b border-gray-200 flex items-center justify-center">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => {
            setValue(e.target.checked);
            onSave(e.target.checked);
          }}
          autoFocus
          className="w-5 h-5 text-royal-purple bg-white border-2 border-royal-purple/30 rounded focus:ring-offset-0 cursor-pointer transition-all duration-200 hover:border-royal-purple/50 checked:bg-royal-purple checked:border-royal-purple"
        />
      </div>
    );
  }

  // Select editor
  if (columnDef?.dataType === "select") {
    return (
      <div className="h-8 w-full px-2 border-r border-b border-gray-200">
        <Select
          value={value}
          onValueChange={(newValue) => {
            setValue(newValue);
            onSave(newValue);
          }}
        >
          <SelectTrigger className="h-8 border-0 focus:border-0 text-sm transition-colors duration-200 focus:ring-0 focus:outline-none focus-visible:ring-0 rounded-none bg-transparent w-full">
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
      </div>
    );
  }

  // Date editor
  if (columnDef?.dataType === "date") {
    console.log(
      "Rendering date editor for column:",
      columnDef.columnName,
      "with value:",
      value
    );
    return (
      <div className="h-8 w-full px-2 border-r border-b border-gray-200">
        <Input
          ref={dateInputRef}
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onClick={() => {
            // Trigger the date picker when clicking on the input
            setTimeout(() => {
              if (dateInputRef.current) {
                try {
                  if (typeof dateInputRef.current.showPicker === "function") {
                    dateInputRef.current.showPicker();
                  } else {
                    dateInputRef.current.focus();
                    dateInputRef.current.click();
                  }
                } catch (error) {
                  console.log("Date picker click trigger failed:", error);
                  dateInputRef.current.focus();
                }
              }
            }, 50);
          }}
          onDoubleClick={() => {
            // Double-click as additional trigger
            if (dateInputRef.current) {
              try {
                if (typeof dateInputRef.current.showPicker === "function") {
                  dateInputRef.current.showPicker();
                } else {
                  dateInputRef.current.focus();
                }
              } catch (error) {
                console.log("Date picker double-click trigger failed:", error);
              }
            }
          }}
          onFocus={() => {
            // Also try to trigger on focus
            setTimeout(() => {
              if (dateInputRef.current) {
                try {
                  if (typeof dateInputRef.current.showPicker === "function") {
                    dateInputRef.current.showPicker();
                  }
                } catch (error) {
                  console.log("Date picker focus trigger failed:", error);
                }
              }
            }, 100);
          }}
          autoFocus
          className="h-8 border-2 border-royal-purple focus:border-royal-purple focus:ring-0 focus:outline-none focus-visible:ring-0 rounded-none w-full cursor-pointer"
        />
      </div>
    );
  }

  // Number editor
  if (columnDef?.dataType === "number" || columnDef?.dataType === "currency") {
    return (
      <div className="h-8 w-full px-2 border-r border-b border-gray-200">
        <Input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus
          className="h-8 border-2 border-royal-purple focus:border-royal-purple focus:ring-0 focus:outline-none focus-visible:ring-0 rounded-none w-full"
        />
      </div>
    );
  }

  // Default text editor
  return (
    <div className="h-8 w-full px-2 border-r border-b border-gray-200">
      <Input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoFocus
        className="h-8 border-2 border-royal-purple focus:border-royal-purple focus:ring-0 focus:outline-none focus-visible:ring-0 rounded-none w-full"
      />
    </div>
  );
});

// Custom cell renderers
const BooleanFormatter = memo(function BooleanFormatter({
  row,
  column,
  onCellClick,
  onCellSave,
  isEditing,
}: RenderCellProps<SheetData> & {
  onCellClick?: (row: SheetData, column: any) => void;
  onCellSave?: (rowId: string, columnId: string, value: any) => void;
  isEditing?: boolean;
}) {
  const value = !!row[column.key as keyof SheetData];

  if (isEditing) {
    return (
      <CustomCellEditor
        row={row}
        column={column}
        onSave={(newValue) => {
          onCellSave?.(row.id, column.key, newValue);
        }}
        onCancel={() => {
          onCellClick?.(row, column);
        }}
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center h-8 w-full px-2 border-r border-b border-gray-200 cursor-pointer hover:bg-gray-50"
      onClick={() => onCellClick?.(row, column)}
    >
      <span
        className={`text-sm font-medium ${
          value ? "text-royal-purple font-semibold" : "text-gray-500"
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
  onCellClick,
  onCellSave,
  isEditing,
}: RenderCellProps<SheetData> & {
  onCellClick?: (row: SheetData, column: any) => void;
  onCellSave?: (rowId: string, columnId: string, value: any) => void;
  isEditing?: boolean;
}) {
  const value = row[column.key as keyof SheetData];

  if (isEditing) {
    return (
      <CustomCellEditor
        row={row}
        column={column}
        onSave={(newValue) => {
          onCellSave?.(row.id, column.key, newValue);
        }}
        onCancel={() => {
          onCellClick?.(row, column);
        }}
      />
    );
  }

  if (!value)
    return (
      <div
        className="h-8 w-full flex items-center text-sm text-gray-400 px-2 border-r border-b border-gray-200 cursor-pointer hover:bg-gray-50"
        onClick={() => onCellClick?.(row, column)}
      >
        -
      </div>
    );

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
    } else {
      date = new Date(value as string | number | Date);
    }

    if (date && !isNaN(date.getTime())) {
      return (
        <div
          className="h-8 w-full flex items-center text-sm px-2 border-r border-b border-gray-200 cursor-pointer hover:bg-gray-50"
          onClick={() => onCellClick?.(row, column)}
        >
          {date.toLocaleDateString()}
        </div>
      );
    }
  } catch (error) {
    console.error("Error parsing date:", value, error);
  }

  return (
    <div
      className="h-8 w-full flex items-center text-sm text-red-500 px-2 border-r border-b border-gray-200 cursor-pointer hover:bg-gray-50"
      onClick={() => onCellClick?.(row, column)}
    >
      Invalid Date
    </div>
  );
});

const CurrencyFormatter = memo(function CurrencyFormatter({
  row,
  column,
  onCellClick,
  onCellSave,
  isEditing,
}: RenderCellProps<SheetData> & {
  onCellClick?: (row: SheetData, column: any) => void;
  onCellSave?: (rowId: string, columnId: string, value: any) => void;
  isEditing?: boolean;
}) {
  const value = row[column.key as keyof SheetData];

  if (isEditing) {
    return (
      <CustomCellEditor
        row={row}
        column={column}
        onSave={(newValue) => {
          onCellSave?.(row.id, column.key, newValue);
        }}
        onCancel={() => {
          onCellClick?.(row, column);
        }}
      />
    );
  }

  const formatted = value
    ? `€${parseFloat(value.toString()).toLocaleString()}`
    : "";
  return (
    <div
      className="h-8 w-full flex items-center text-sm px-2 border-r border-b border-gray-200 cursor-pointer hover:bg-gray-50"
      onClick={() => onCellClick?.(row, column)}
    >
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

  if (columnDef.id === "delete") {
    return (
      <div className="h-8 w-full flex items-center justify-center px-2 border-r border-b border-gray-200">
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
  return (
    <div className="h-8 w-full flex items-center text-sm px-2 border-r border-b border-gray-200">
      {value?.toString() || ""}
    </div>
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
  // Debug logging
  console.log("BookingsDataGrid props:", {
    columnsCount: columns?.length || 0,
    dataCount: data?.length || 0,
    columns: columns,
    data: data,
  });
  const { toast } = useToast();
  const [selectedCell, setSelectedCell] = useState<{
    rowId: string;
    columnId: string;
  } | null>(null);
  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    columnId: string;
    value: any;
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

  const handleCellClick = useCallback(
    (row: SheetData, column: any) => {
      const columnDef = columns.find((col) => col.id === column.key);

      // Don't allow editing function columns
      if (columnDef?.dataType === "function") {
        return;
      }

      // If already editing this cell, save and exit
      if (
        editingCell?.rowId === row.id &&
        editingCell?.columnId === column.key
      ) {
        setEditingCell(null);
        return;
      }

      // Start editing this cell
      setEditingCell({
        rowId: row.id,
        columnId: column.key,
        value: row[column.key as keyof SheetData],
      });
    },
    [editingCell, columns]
  );

  const handleCellSave = useCallback(
    async (rowId: string, columnId: string, newValue: any) => {
      // Update local data
      const updatedData = localData.map((row) =>
        row.id === rowId ? { ...row, [columnId]: newValue } : row
      );

      setLocalData(updatedData);
      updateData(updatedData);

      // Save to Firestore
      batchedWriter.queueFieldUpdate(rowId, columnId, newValue);

      // Trigger function recomputation
      await recomputeDirectDependentsForRow(rowId, columnId, newValue);

      // Exit editing mode
      setEditingCell(null);
    },
    [localData, updateData, recomputeDirectDependentsForRow]
  );

  // Filter and sort data
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
  }, [localData, data, globalFilter, sortColumns]);

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
      renderCell: ({ row }) => {
        const rowNumber = parseInt(row.id);
        return (
          <div className="h-8 w-16 flex items-center justify-center text-sm font-mono text-grey px-2 border-r border-b border-gray-200">
            {!isNaN(rowNumber) ? rowNumber : "-"}
          </div>
        );
      },
    };

    const dataColumns = columns
      .filter((col) => col && col.id && col.columnName) // Filter out invalid columns
      .sort((a, b) => a.order - b.order)
      .map((col) => {
        const baseColumn: Column<SheetData> = {
          key: col.id,
          name: col.columnName,
          width: col.width || 150,
          resizable: true,
          sortable: true,
        };

        // Add column color styling
        if (col.color && col.color !== "none") {
          const colorClasses = {
            purple:
              "bg-royal-purple/8 border-l border-r border-royal-purple/40",
            blue: "bg-blue-100 border-l border-r border-royal-purple/40",
            green: "bg-green-100 border-l border-r border-royal-purple/40",
            yellow: "bg-yellow-100 border-l border-r border-royal-purple/40",
            orange: "bg-orange-100 border-l border-r border-royal-purple/40",
            red: "bg-red-100 border-l border-r border-royal-purple/40",
            pink: "bg-pink-100 border-l border-r border-royal-purple/40",
            cyan: "bg-cyan-100 border-l border-r border-royal-purple/40",
            gray: "bg-gray-100 border-l border-r border-royal-purple/40",
          };

          (baseColumn as any).headerCellClass = colorClasses[col.color] || "";
          (baseColumn as any).cellClass = colorClasses[col.color] || "";
        }

        // Add column-specific properties
        if (col.dataType === "boolean") {
          baseColumn.renderCell = ({ row, column }) => (
            <BooleanFormatter
              row={row}
              column={column}
              onCellClick={handleCellClick}
              onCellSave={handleCellSave}
              isEditing={
                editingCell?.rowId === row.id &&
                editingCell?.columnId === col.id
              }
            />
          );
          baseColumn.editable = true;
          (baseColumn as any).columnDef = col;
        } else if (col.dataType === "date") {
          baseColumn.renderCell = ({ row, column }) => (
            <DateFormatter
              row={row}
              column={column}
              onCellClick={handleCellClick}
              onCellSave={handleCellSave}
              isEditing={
                editingCell?.rowId === row.id &&
                editingCell?.columnId === col.id
              }
            />
          );
          baseColumn.editable = true;
          (baseColumn as any).columnDef = col;
        } else if (col.dataType === "select") {
          baseColumn.renderCell = ({ row, column }) => {
            const isEditing =
              editingCell?.rowId === row.id && editingCell?.columnId === col.id;
            if (isEditing) {
              return (
                <CustomCellEditor
                  row={row}
                  column={column}
                  onSave={(newValue) =>
                    handleCellSave(row.id, column.key, newValue)
                  }
                  onCancel={() => handleCellClick(row, column)}
                />
              );
            }
            return (
              <div
                className="h-8 w-full flex items-center text-sm px-2 border-r border-b border-gray-200 cursor-pointer hover:bg-gray-50"
                onClick={() => handleCellClick(row, column)}
              >
                {row[col.id]?.toString() || ""}
              </div>
            );
          };
          baseColumn.editable = true;
          (baseColumn as any).options = col.options || [];
          (baseColumn as any).columnDef = col;
        } else if (col.dataType === "currency") {
          baseColumn.renderCell = ({ row, column }) => (
            <CurrencyFormatter
              row={row}
              column={column}
              onCellClick={handleCellClick}
              onCellSave={handleCellSave}
              isEditing={
                editingCell?.rowId === row.id &&
                editingCell?.columnId === col.id
              }
            />
          );
          baseColumn.editable = true;
          (baseColumn as any).columnDef = col;
        } else if (col.dataType === "function") {
          baseColumn.renderCell = FunctionFormatter;
          baseColumn.sortable = false;
          baseColumn.editable = false;
          (baseColumn as any).columnDef = col;
          (baseColumn as any).deleteRow = deleteRow;
        } else if (col.dataType === "number") {
          baseColumn.renderCell = ({ row, column }) => {
            const isEditing =
              editingCell?.rowId === row.id && editingCell?.columnId === col.id;
            if (isEditing) {
              return (
                <CustomCellEditor
                  row={row}
                  column={column}
                  onSave={(newValue) =>
                    handleCellSave(row.id, column.key, newValue)
                  }
                  onCancel={() => handleCellClick(row, column)}
                />
              );
            }
            return (
              <div
                className="h-8 w-full flex items-center text-sm px-2 border-r border-b border-gray-200 cursor-pointer hover:bg-gray-50"
                onClick={() => handleCellClick(row, column)}
              >
                {row[col.id]?.toString() || ""}
              </div>
            );
          };
          baseColumn.editable = true;
          (baseColumn as any).columnDef = col;
        } else {
          // Default renderer for string, email, etc.
          baseColumn.renderCell = ({ row, column }) => {
            const isEditing =
              editingCell?.rowId === row.id && editingCell?.columnId === col.id;
            if (isEditing) {
              return (
                <CustomCellEditor
                  row={row}
                  column={column}
                  onSave={(newValue) =>
                    handleCellSave(row.id, column.key, newValue)
                  }
                  onCancel={() => handleCellClick(row, column)}
                />
              );
            }
            return (
              <div
                className="h-8 w-full flex items-center text-sm px-2 border-r border-b border-gray-200 cursor-pointer hover:bg-gray-50"
                onClick={() => handleCellClick(row, column)}
              >
                {row[col.id]?.toString() || ""}
              </div>
            );
          };
          baseColumn.editable = true;
          (baseColumn as any).columnDef = col;
        }

        // Ensure every column has a renderCell function
        if (!baseColumn.renderCell) {
          baseColumn.renderCell = ({ row }) => (
            <div className="h-8 w-full flex items-center text-sm px-2 border-r border-b border-gray-200">
              {row[col.id]?.toString() || ""}
            </div>
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
          renderCell: ({ row }: { row: SheetData }) => (
            <div className="h-8 w-full flex items-center text-sm px-2 border-r border-b border-gray-200">
              {row[col.key as keyof SheetData]?.toString() || ""}
            </div>
          ),
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
  }, [columns, deleteRow, editingCell, handleCellClick, handleCellSave]);

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
            Bookings Data Grid
          </h2>
          <p className="text-muted-foreground">
            Manage your bookings data with react-data-grid
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleAddNewRow}
            disabled={isAddingRow}
            className="bg-royal-purple hover:bg-royal-purple/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Row
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search all columns..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="border-royal-purple/20 focus:border-royal-purple focus:ring-royal-purple/20 focus:outline-none focus-visible:ring-0"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          Showing {filteredAndSortedData.length} of {data.length} rows
        </div>
      </div>

      {/* Data Grid */}
      <div className="border border-royal-purple/20 rounded-md shadow-lg overflow-hidden">
        <TooltipProvider>
          <DataGrid
            columns={gridColumns}
            rows={filteredAndSortedData}
            onRowsChange={(rows, { indexes, column }) => {
              // Handle row changes
              const newData = rows as SheetData[];
              updateData(newData);
              setLocalData(newData);

              console.log("🔄 Row change detected:", {
                indexes,
                column,
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
                });

                if (originalRow && column) {
                  // Single field change
                  const fieldKey = column.key as string;
                  const oldValue = originalRow[fieldKey as keyof SheetData];
                  const newValue = changedRow[fieldKey as keyof SheetData];

                  if (oldValue !== newValue) {
                    console.log(`💾 Updating field ${fieldKey}:`, {
                      oldValue,
                      newValue,
                    });
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

                  console.log("📝 Multiple field changes:", changedFields);

                  // Process each changed field
                  for (const fieldKey of changedFields) {
                    const newValue = changedRow[fieldKey as keyof SheetData];
                    console.log(`💾 Updating field ${fieldKey}:`, newValue);
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
              setSelectedCell({
                rowId: args.row.id,
                columnId: args.column.key as string,
              });
            }}
            sortColumns={sortColumns}
            onSortColumnsChange={setSortColumns}
            className="rdg-light custom-grid"
            style={
              {
                height: 600,
                "--rdg-border-color": "#e5e7eb",
                "--rdg-header-background-color": "#f9fafb",
                "--rdg-row-hover-background-color": "#f3f4f6",
                "--rdg-cell-frozen-background-color": "#f8fafc",
                "--rdg-row-border-color": "#e5e7eb",
              } as React.CSSProperties
            }
            defaultColumnOptions={{
              sortable: true,
              resizable: true,
              renderCell: ({ row, column }) => (
                <div className="h-8 w-full flex items-center text-sm px-2 border-r border-b border-gray-200">
                  {row[column.key as keyof SheetData]?.toString() || ""}
                </div>
              ),
            }}
            enableVirtualization
            enableCellSelect
            enableCellEdit
            renderers={{
              noRowsFallback: (
                <div className="flex flex-col items-center justify-center h-32 text-gray-500">
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
