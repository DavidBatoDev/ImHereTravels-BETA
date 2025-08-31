"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
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
} from "lucide-react";
import {
  SheetColumn,
  SheetData,
  TypeScriptFunction,
} from "@/types/sheet-management";
import { useSheetManagement } from "@/hooks/use-sheet-management";
import { typescriptFunctionsService } from "@/services/typescript-functions-service";
import { demoBookingData } from "@/lib/demo-booking-data";
import ColumnSettingsModal from "./ColumnSettingsModal";
import AddColumnModal from "./AddColumnModal";

export default function BookingsSheet() {
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
  }, []);

  // Initialize with demo data
  useMemo(() => {
    if (data.length === 0) {
      updateData(demoBookingData);
    }
  }, [data.length, updateData]);

  // Create table columns from sheet columns
  const tableColumns = useMemo<ColumnDef<SheetData>[]>(() => {
    return columns
      .sort((a, b) => a.order - b.order)
      .map((col) => ({
        id: col.id || `col-${col.order}`, // Ensure unique ID for table
        header: () => (
          <div
            className="flex items-center justify-between group h-12 w-full bg-royal-purple/10 text-royal-purple px-3 py-2 rounded"
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
        accessorKey: col.id || `col-${col.order}`,
        cell: ({ row, column }) => {
          const value = row.getValue(column.id);
          const columnDef = columns.find(
            (c) =>
              c.id === column.id ||
              c.order === parseInt(column.id.replace("col-", ""))
          );

          if (!columnDef) return null;

          if (
            (editingCell?.rowId === row.id &&
              editingCell?.columnId === column.id) ||
            editingCell?.columnId === `col-${columnDef.order}`
          ) {
            return (
              <Input
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onBlur={() =>
                  handleCellEdit(
                    row.id,
                    columnDef.id || `col-${columnDef.order}`,
                    editingValue
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCellEdit(
                      row.id,
                      columnDef.id || `col-${columnDef.order}`,
                      editingValue
                    );
                  } else if (e.key === "Escape") {
                    setEditingCell(null);
                  }
                }}
                autoFocus
                className="h-8 border-royal-purple/20 focus:border-royal-purple focus:ring-royal-purple/20"
              />
            );
          }

          return (
            <div
              className="h-12 w-full px-2 flex items-center cursor-pointer"
              style={{
                minWidth: `${columnDef.width || 150}px`,
                maxWidth: `${columnDef.width || 150}px`,
              }}
              onClick={() => {
                setEditingCell({
                  rowId: row.id,
                  columnId: columnDef.id || `col-${columnDef.order}`,
                });
                setEditingValue(value?.toString() || "");
              }}
            >
              <div
                className="w-full truncate text-sm"
                title={value?.toString() || ""}
              >
                {renderCellValue(value, columnDef)}
              </div>
            </div>
          );
        },

        enableSorting: true,
        enableColumnFilter: true,
      }));
  }, [columns, editingCell, editingValue]);

  const table = useReactTable({
    data,
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
    },
  });

  const renderCellValue = (value: any, column: SheetColumn) => {
    if (value === null || value === undefined) return "-";

    const dataType = column.dataType;
    const columnId = column.id;

    switch (dataType) {
      case "boolean":
        return value ? "Yes" : "No";
      case "date":
        return new Date(value).toLocaleDateString();
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

  const handleCellEdit = (rowId: string, columnId: string, value: string) => {
    updateRow(rowId, { [columnId]: value });
    setEditingCell(null);
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
            rows{" "}
            {table.getFilteredRowModel().rows.length < 10 &&
              `(${
                10 - table.getFilteredRowModel().rows.length
              } empty rows for layout)`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border border-royal-purple/20 overflow-x-auto">
            <Table className="border border-royal-purple/20 min-w-full table-fixed">
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="bg-light-grey/30">
                    {headerGroup.headers.map((header) => {
                      const columnDef = columns.find(
                        (c) =>
                          c.id === header.id ||
                          c.order === parseInt(header.id.replace("col-", ""))
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

                  // Show actual data rows
                  const dataRows = visibleRows.map((row, index) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      className={`border-b border-royal-purple/20 transition-colors duration-200 ${
                        index % 2 === 0 ? "bg-white" : "bg-light-grey/20"
                      } hover:bg-royal-purple/5`}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const columnDef = columns.find(
                          (c) =>
                            c.id === cell.column.id ||
                            c.order ===
                              parseInt(cell.column.id.replace("col-", ""))
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
                  ));

                  // Add empty rows to reach minimum
                  const emptyRows = [];
                  for (let i = visibleRows.length; i < rowsToShow; i++) {
                    emptyRows.push(
                      <TableRow
                        key={`empty-${i}`}
                        className={`border-b border-royal-purple/20 ${
                          i % 2 === 0 ? "bg-white" : "bg-light-grey/20"
                        } opacity-60`}
                      >
                        {table.getAllLeafColumns().map((column) => {
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
                                <div className="w-full text-sm text-grey/30">
                                  {/* Empty cell - shows table structure */}
                                </div>
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
      />

      <AddColumnModal
        isOpen={addColumnModal}
        onClose={() => setAddColumnModal(false)}
        onAdd={handleAddColumn}
        existingColumns={columns}
        availableFunctions={availableFunctions}
      />
    </div>
  );
}
