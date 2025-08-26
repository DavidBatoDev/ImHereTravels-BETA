"use client";

import { useState, useMemo, useCallback } from "react";
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
import { SheetColumn, SheetData } from "@/types/sheet-management";
import { useSheetManagement } from "@/hooks/use-sheet-management";
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

  // Initialize with demo data
  useMemo(() => {
    if (data.length === 0) {
      updateData(demoBookingData);
    }
  }, [data.length, updateData]);

  // Create table columns from sheet columns
  const tableColumns = useMemo<ColumnDef<SheetData>[]>(() => {
    return columns
      .filter((col) => col.visible)
      .sort((a, b) => a.order - b.order)
      .map((col) => ({
        id: col.id,
        header: () => (
          <div className="flex items-center justify-between group">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
              <span className="font-medium">{col.name}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => openColumnSettings(col)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        ),
        accessorKey: col.id,
        cell: ({ row, column }) => {
          const value = row.getValue(column.id);
          const columnDef = columns.find((c) => c.id === column.id);

          if (!columnDef) return null;

          if (
            editingCell?.rowId === row.id &&
            editingCell?.columnId === column.id
          ) {
            return (
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
                className="h-8"
              />
            );
          }

          return (
            <div
              className={`min-h-[32px] flex items-center ${
                columnDef.editable ? "cursor-pointer hover:bg-gray-50" : ""
              }`}
              onClick={() => {
                if (columnDef.editable) {
                  setEditingCell({ rowId: row.id, columnId: column.id });
                  setEditingValue(value?.toString() || "");
                }
              }}
            >
              {renderCellValue(value, columnDef)}
            </div>
          );
        },
        size: col.width || 150,
        minSize: col.minWidth || 50,
        maxSize: col.maxWidth || 500,
        enableSorting: col.sortable,
        enableColumnFilter: col.filterable,
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
  });

  const renderCellValue = (value: any, column: SheetColumn) => {
    if (value === null || value === undefined) return "-";

    switch (column.type) {
      case "boolean":
        return value ? "Yes" : "No";
      case "date":
        return new Date(value).toLocaleDateString();
      case "currency":
        return `$${parseFloat(value).toLocaleString()}`;
      case "select":
        return value;
      case "function":
        return column.id === "delete" ? (
          <Button variant="destructive" size="sm">
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

  const handleAddColumn = (newColumn: Omit<SheetColumn, "id" | "order">) => {
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
          <h2 className="text-2xl font-bold text-gray-900">Bookings Sheet</h2>
          <p className="text-gray-600">
            Manage your bookings data with customizable columns
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setAddColumnModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Column
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search all columns..."
                value={globalFilter ?? ""}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={table.getState().pagination.pageSize.toString()}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger>
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
                <Button variant="outline" className="flex items-center gap-2">
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
                        <span>{column.id}</span>
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
      <Card>
        <CardHeader>
          <CardTitle>Bookings Data</CardTitle>
          <CardDescription>
            Showing {table.getFilteredRowModel().rows.length} of {data.length}{" "}
            rows
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        style={{ width: header.getSize() }}
                        className="relative"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                        {header.column.getCanSort() && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-2 h-6 w-6 p-0"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {header.column.getIsSorted() === "asc" ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : header.column.getIsSorted() === "desc" ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          style={{ width: cell.column.getSize() }}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between space-x-2 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
              {table.getFilteredSelectedRowModel().rows.length} of{" "}
              {table.getFilteredRowModel().rows.length} row(s) selected.
            </div>
            <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">Rows per page</p>
                <Select
                  value={`${table.getState().pagination.pageSize}`}
                  onValueChange={(value) => {
                    table.setPageSize(Number(value));
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px]">
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
              <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount()}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  className="hidden h-8 w-8 p-0 lg:flex"
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                >
                  <span className="sr-only">Go to first page</span>
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <span className="sr-only">Go to previous page</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <span className="sr-only">Go to next page</span>
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="hidden h-8 w-8 p-0 lg:flex"
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
      />

      <AddColumnModal
        isOpen={addColumnModal}
        onClose={() => setAddColumnModal(false)}
        onAdd={handleAddColumn}
        existingColumns={columns}
      />
    </div>
  );
}
