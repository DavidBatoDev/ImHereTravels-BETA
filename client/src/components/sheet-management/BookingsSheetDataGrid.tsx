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
import DataGrid, {
  Column,
  DataGridHandle,
  SelectColumn,
  textEditor,
  dateEditor,
  numberEditor,
  Row,
  RenderEditCellProps,
  RenderCellProps,
} from "react-data-grid";
import "react-data-grid/lib/styles.css";
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
  Settings,
  Plus,
  Eye,
  EyeOff,
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

// Custom editors for different data types
const booleanEditor = {
  component: ({ row, column, onRowChange, onClose }: any) => {
    const value = row[column.key];
    return (
      <div className="flex items-center justify-center h-full">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => {
            onRowChange({ ...row, [column.key]: e.target.checked });
            onClose();
          }}
          className="w-5 h-5 text-royal-purple bg-white border-2 border-royal-purple/30 rounded focus:ring-offset-0 cursor-pointer"
          autoFocus
        />
      </div>
    );
  },
};

const selectEditor = {
  component: ({ row, column, onRowChange, onClose }: any) => {
    const value = row[column.key];
    const columnDef = column.columnDef as SheetColumn;
    const options = columnDef.options || [];

    return (
      <div className="flex items-center h-full px-2">
        <Select
          value={value?.toString() || ""}
          onValueChange={(newValue) => {
            onRowChange({ ...row, [column.key]: newValue });
            onClose();
          }}
        >
          <SelectTrigger className="h-8 border-0 focus:border-0 text-sm bg-transparent">
            <SelectValue placeholder="Select option" />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  },
};

const FunctionCellRenderer = memo(({ row, column }: RenderCellProps<SheetData>) => {
  const columnDef = column.columnDef as SheetColumn;
  const value = row[column.key];

  if (columnDef.id === "delete") {
    return (
      <div className="flex items-center justify-center h-full">
        <Button
          variant="destructive"
          size="sm"
          className="bg-crimson-red hover:bg-crimson-red/90"
          onClick={() => {
            // Handle delete row - this will be passed as a prop
            console.log("Delete row:", row.id);
          }}
        >
          Delete
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center h-full px-2">
      <span className="text-sm truncate">
        {value?.toString() || ""}
      </span>
    </div>
  );
});

export default function BookingsSheetDataGrid() {
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

  // Log columns when they change
  useColumnLogger(columns, {
    logOnChange: true,
    compact: true,
    logOrderChanges: true,
    prefix: "📊 BookingsSheetDataGrid",
  });

  const [selectedRows, setSelectedRows] = useState(new Set<string>());
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    rowId: string | null;
    x: number;
    y: number;
  }>({ isOpen: false, rowId: null, x: 0, y: 0 });

  // Modal states
  const [columnSettingsModal, setColumnSettingsModal] = useState<{
    isOpen: boolean;
    column: SheetColumn | null;
  }>({ isOpen: false, column: null });
  const [availableFunctions, setAvailableFunctions] = useState<TypeScriptFunction[]>([]);
  const [isLoadingFunctions, setIsLoadingFunctions] = useState(false);

  // DataGrid ref
  const dataGridRef = useRef<DataGridHandle>(null);

  // Local state for optimistic updates
  const [localData, setLocalData] = useState<SheetData[]>([]);
  
  // Function computation state
  const functionSubscriptionsRef = useRef<Map<string, () => void>>(new Map());

  // Initialize and sync local data with hook data
  useEffect(() => {
    setLocalData(data);
  }, [data]);

  // Helper: deep equality check
  const isEqual = useCallback((a: any, b: any) => {
    if (a === b) return true;
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }, []);

  // Compute function column for a single row
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

          // Batch persist to Firestore
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

  // Build dependency graph for function columns
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

  // Recompute function columns when data changes
  const recomputeDirectDependentsForRow = useCallback(
    async (rowId: string, changedColumnId: string, updatedValue: any) => {
      const changedCol = columns.find((c) => c.id === changedColumnId);
      if (!changedCol || !changedCol.columnName) return;

      const baseRow = localData.find((r) => r.id === rowId) || data.find((r) => r.id === rowId) || ({ id: rowId } as SheetData);
      const rowSnapshot: SheetData = {
        ...baseRow,
        [changedColumnId]: updatedValue,
      };

      const directDependents = dependencyGraph.get(changedCol.columnName) || [];
      await Promise.all(
        directDependents.map((funcCol) =>
          computeFunctionForRow(rowSnapshot, funcCol)
        )
      );
    },
    [columns, localData, data, dependencyGraph, computeFunctionForRow]
  );

  // Subscribe to function changes
  useEffect(() => {
    const inUseFunctionIds = new Set(
      columns
        .filter((c) => c.dataType === "function" && !!c.function)
        .map((c) => c.function as string)
    );

    // Add new subscriptions
    inUseFunctionIds.forEach((funcId) => {
      if (!functionSubscriptionsRef.current.has(funcId)) {
        const unsubscribe = typescriptFunctionsService.subscribeToFunctionChanges(
          funcId,
          (updated) => {
            if (!updated) return;
            functionExecutionService.invalidate(funcId);
            // Recompute affected columns
            const affectedColumns = columns.filter(
              (c) => c.dataType === "function" && c.function === funcId
            );
            if (affectedColumns.length > 0) {
              localData.forEach((row) => {
                affectedColumns.forEach((funcCol) => {
                  computeFunctionForRow(row, funcCol);
                });
              });
            }
          }
        );
        functionSubscriptionsRef.current.set(funcId, unsubscribe);
      }
    });

    // Remove unused subscriptions
    for (const [funcId, unsubscribe] of functionSubscriptionsRef.current.entries()) {
      if (!inUseFunctionIds.has(funcId)) {
        try {
          unsubscribe();
        } catch {}
        functionSubscriptionsRef.current.delete(funcId);
      }
    }

    return () => {
      for (const [, unsubscribe] of functionSubscriptionsRef.current.entries()) {
        try {
          unsubscribe();
        } catch {}
      }
      functionSubscriptionsRef.current.clear();
    };
  }, [columns, localData, computeFunctionForRow]);

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

    toast({
      title: "🚀 Bookings Sheet Ready",
      description: "You can now edit cells by clicking on them",
      variant: "default",
    });
  }, []);

  // Helper: get column color classes
  const getColumnTintClasses = useCallback(
    (color: SheetColumn["color"] | undefined): string => {
      const map: Record<string, { base: string; hover: string }> = {
        purple: {
          base: "bg-royal-purple/8",
          hover: "hover:bg-royal-purple/15",
        },
        blue: {
          base: "bg-blue-100",
          hover: "hover:bg-blue-200",
        },
        green: {
          base: "bg-green-100",
          hover: "hover:bg-green-200",
        },
        yellow: {
          base: "bg-yellow-100",
          hover: "hover:bg-yellow-200",
        },
        orange: {
          base: "bg-orange-100",
          hover: "hover:bg-orange-200",
        },
        red: {
          base: "bg-red-100",
          hover: "hover:bg-red-200",
        },
        pink: {
          base: "bg-pink-100",
          hover: "hover:bg-pink-200",
        },
        cyan: {
          base: "bg-cyan-100",
          hover: "hover:bg-cyan-200",
        },
        gray: {
          base: "bg-gray-100",
          hover: "hover:bg-gray-200",
        },
        none: {
          base: "",
          hover: "hover:bg-royal-purple/8",
        },
      };
      const key = color || "none";
      const chosen = map[key] || map.none;
      return `${chosen.base} ${chosen.hover}`.trim();
    },
    []
  );

  // Create DataGrid columns from sheet columns
  const dataGridColumns = useMemo<Column<SheetData>[]>(() => {
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
          <div className="flex items-center justify-center h-full text-sm font-mono text-grey">
            {!isNaN(rowNumber) ? rowNumber : "-"}
          </div>
        );
      },
    };

    const dataColumns = columns
      .sort((a, b) => a.order - b.order)
      .map((col) => {
        const column: Column<SheetData> = {
          key: col.id,
          name: col.columnName,
          width: col.width || 150,
          resizable: true,
          sortable: true,
          frozen: false,
          renderHeaderCell: () => (
            <div className="flex items-center justify-between group h-full px-3 py-2">
              <span className="font-medium truncate" title={col.columnName}>
                {col.columnName}
              </span>
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
        };

        // Configure editor and renderer based on data type
        switch (col.dataType) {
          case "boolean":
            column.editor = booleanEditor;
            column.renderCell = ({ row }) => {
              const value = row[col.id];
              return (
                <div className={`flex items-center justify-center h-full ${getColumnTintClasses(col.color)}`}>
                  <input
                    type="checkbox"
                    checked={!!value}
                    onChange={(e) => handleCellEdit(row.id, col.id, e.target.checked.toString())}
                    className="w-5 h-5 text-royal-purple bg-white border-2 border-royal-purple/30 rounded focus:ring-offset-0 cursor-pointer"
                  />
                </div>
              );
            };
            break;

          case "select":
            column.editor = selectEditor;
            column.renderCell = ({ row }) => {
              const value = row[col.id];
              const options = col.options || [];
              return (
                <div className={`flex items-center h-full px-2 ${getColumnTintClasses(col.color)}`}>
                  {options.length > 0 ? (
                    <Select
                      value={value?.toString() || ""}
                      onValueChange={(newValue) => handleCellEdit(row.id, col.id, newValue)}
                    >
                      <SelectTrigger className="h-8 border-0 focus:border-0 text-sm bg-transparent">
                        <SelectValue placeholder="Select option" />
                      </SelectTrigger>
                      <SelectContent>
                        {options.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-sm text-gray-400">No options</div>
                  )}
                </div>
              );
            };
            break;

          case "date":
            column.editor = dateEditor;
            column.renderCell = ({ row }) => {
              const value = row[col.id];
              let displayValue = "";
              
              if (value) {
                try {
                  let date: Date;
                  if (value && typeof value === "object" && "toDate" in value) {
                    date = (value as any).toDate();
                  } else if (value && typeof value === "object" && "seconds" in value) {
                    date = new Date((value as any).seconds * 1000);
                  } else {
                    date = new Date(value as string | number | Date);
                  }
                  if (!isNaN(date.getTime())) {
                    displayValue = date.toISOString().split("T")[0];
                  }
                } catch {
                  displayValue = "";
                }
              }

              return (
                <div className={`flex items-center h-full px-2 ${getColumnTintClasses(col.color)}`}>
                  <Input
                    type="date"
                    value={displayValue}
                    onChange={(e) => handleCellEdit(row.id, col.id, e.target.value)}
                    className="h-8 border-0 focus:border-0 text-sm bg-transparent"
                  />
                </div>
              );
            };
            break;

          case "number":
          case "currency":
            column.editor = numberEditor;
            column.renderCell = ({ row }) => {
              const value = row[col.id];
              return (
                <div className={`flex items-center h-full px-2 ${getColumnTintClasses(col.color)}`}>
                  <span className="text-sm">
                    {col.dataType === "currency" ? `€${parseFloat(value || 0).toLocaleString()}` : value}
                  </span>
                </div>
              );
            };
            break;

          case "function":
            column.editable = false;
            column.renderCell = FunctionCellRenderer;
            break;

          default:
            column.editor = textEditor;
            column.renderCell = ({ row }) => {
              const value = row[col.id];
              return (
                <div className={`flex items-center h-full px-2 ${getColumnTintClasses(col.color)}`}>
                  <span className="text-sm truncate">
                    {value?.toString() || ""}
                  </span>
                </div>
              );
            };
        }

        return column;
      });

    return [rowNumberColumn, ...dataColumns];
  }, [columns, getColumnTintClasses]);

  // Handle cell editing
  const handleCellEdit = useCallback(
    async (rowId: string, columnId: string, value: string) => {
      try {
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

        // Check if value actually changed
        const currentRow = localData.find((r) => r.id === rowId) || data.find((r) => r.id === rowId);
        if (currentRow && isEqual(currentRow[columnId], processedValue)) {
          return;
        }

        // Optimistic update
        setLocalData((prevData) => {
          return prevData.map((row) =>
            row.id === rowId ? { ...row, [columnId]: processedValue } : row
          );
        });

        // Queue field update
        batchedWriter.queueFieldUpdate(rowId, columnId, processedValue);

        // Recompute function columns that depend on this column
        recomputeDirectDependentsForRow(rowId, columnId, processedValue).catch(
          (error) => {
            console.error(`❌ Failed to recompute dependents:`, error);
          }
        );

        console.log(`🚀 Cell updated: ${rowId}.${columnId} = ${processedValue}`);
      } catch (error) {
        console.error(`❌ Failed to handle cell edit:`, error);
        toast({
          title: "❌ Failed to Update Cell",
          description: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          variant: "destructive",
        });
      }
    },
    [columns, toast, localData, data, isEqual, recomputeDirectDependentsForRow]
  );

  // Handle row selection
  const handleRowSelect = useCallback((rows: Set<string>) => {
    setSelectedRows(rows);
  }, []);

  // Handle adding a new row
  const handleAddNewRow = async () => {
    try {
      setIsAddingRow(true);
      const nextRowNumber = await bookingService.getNextRowNumber();
      const newRowId = nextRowNumber.toString();

      const newBooking: SheetData = {
        id: newRowId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await bookingService.createOrUpdateBooking(newRowId, newBooking);
      updateData([...data, newBooking]);

      toast({
        title: "✅ New Row Added",
        description: `Row ${newRowId} created successfully`,
        variant: "default",
      });
    } catch (error) {
      console.error("❌ Failed to add new row:", error);
      toast({
        title: "❌ Failed to Add New Row",
        description: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setIsAddingRow(false);
    }
  };

  // Handle deleting a row
  const handleDeleteRow = async (rowId: string) => {
    try {
      await bookingService.clearBookingFields(rowId);
      toast({
        title: "🗑️ Row Cleared",
        description: `Row ${rowId} fields cleared successfully`,
        variant: "default",
      });
    } catch (error) {
      console.error("❌ Failed to clear row fields:", error);
      toast({
        title: "❌ Failed to Clear Row",
        description: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    }
  };

  // Column settings
  const openColumnSettings = (column: SheetColumn) => {
    setColumnSettingsModal({ isOpen: true, column });
  };

  const handleColumnSave = (updatedColumn: SheetColumn) => {
    updateColumn(updatedColumn);
  };

  const handleColumnDelete = (columnId: string) => {
    deleteColumn(columnId);
  };

  // Filter data based on global filter
  const filteredData = useMemo(() => {
    if (!globalFilter) return localData;
    
    return localData.filter((row) => {
      return Object.values(row).some((value) =>
        value?.toString().toLowerCase().includes(globalFilter.toLowerCase())
      );
    });
  }, [localData, globalFilter]);

  return (
    <div className="booking-sheet space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground font-hk-grotesk">
            Bookings Sheet (DataGrid)
          </h2>
          <p className="text-muted-foreground">
            Manage your bookings data with React Data Grid
          </p>
        </div>
        <div className="flex gap-2">
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
                  This is the new React Data Grid implementation with improved performance and features.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="border border-royal-purple/20 shadow-lg">
        <CardHeader className="bg-muted/50 border-b border-royal-purple/20">
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
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-10 border-royal-purple/20 focus:border-royal-purple focus:ring-royal-purple/20"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleAddNewRow}
                disabled={isAddingRow}
                className="border-royal-purple/20 text-royal-purple hover:bg-royal-purple/10"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Row
              </Button>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 border-royal-purple/20 text-royal-purple hover:bg-royal-purple/10"
                >
                  <Eye className="h-4 w-4" />
                  Columns
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {dataGridColumns.map((column) => (
                  <DropdownMenuItem
                    key={column.key}
                    onSelect={(e) => e.preventDefault()}
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={columnVisibility[column.key] !== false}
                        onChange={() => {
                          setColumnVisibility(prev => ({
                            ...prev,
                            [column.key]: !prev[column.key]
                          }));
                        }}
                        className="rounded"
                      />
                      <span>{column.name}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Data Grid */}
      <Card className="border border-royal-purple/20 shadow-lg">
        <CardHeader className="bg-muted/50 border-b border-royal-purple/20">
          <CardTitle className="text-foreground">Bookings Data</CardTitle>
          <CardDescription className="text-muted-foreground">
            Showing {filteredData.length} of {data.length} rows
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[600px] relative">
            <DataGrid
              ref={dataGridRef}
              columns={dataGridColumns}
              rows={filteredData}
              onRowsChange={setLocalData}
              selectedRows={selectedRows}
              onSelectedRowsChange={handleRowSelect}
              className="rdg-light"
              style={{ height: "100%" }}
              defaultColumnOptions={{
                resizable: true,
                sortable: true,
              }}
              rowKeyGetter={(row) => row.id}
              enableVirtualization
              onRowContextMenu={(event, row) => {
                event.preventDefault();
                setContextMenu({
                  isOpen: true,
                  rowId: row.id,
                  x: event.clientX,
                  y: event.clientY,
                });
              }}
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
                  onClick={() => {
                    if (contextMenu.rowId) {
                      handleDeleteRow(contextMenu.rowId);
                    }
                    setContextMenu({ isOpen: false, rowId: null, x: 0, y: 0 });
                  }}
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
