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
          <div className="flex items-center justify-between group h-full w-full bg-royal-purple/10 text-royal-purple px-3 py-2 rounded">
            <div className="flex items-center gap-2">
              <span className="font-medium">{col.name}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity text-royal-purple hover:bg-royal-purple/20"
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
                className="h-8 border-royal-purple/20 focus:border-royal-purple focus:ring-royal-purple/20"
              />
            );
          }

          return (
            <div
              className={`h-full w-full px-2 ${
                columnDef.editable ? "cursor-pointer" : ""
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
              value={table.getState().pagination.pageSize.toString()}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
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
      <Card className="border border-royal-purple/20 shadow-lg">
        <CardHeader className="bg-light-grey/50 border-b border-royal-purple/20">
          <CardTitle className="text-creative-midnight">
            Bookings Data
          </CardTitle>
          <CardDescription className="text-grey">
            Showing {table.getFilteredRowModel().rows.length} of {data.length}{" "}
            rows
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border border-royal-purple/20">
            <Table className="border border-royal-purple/20">
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="bg-light-grey/30">
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="relative border border-royal-purple/20 p-0"
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
                            className="ml-2 h-6 w-6 p-0 text-royal-purple hover:bg-royal-purple/20"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {header.column.getIsSorted() === "asc" ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : header.column.getIsSorted() === "desc" ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : null}
                          </Button>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row, index) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      className={`border-b border-royal-purple/20 transition-colors duration-200 ${
                        index % 2 === 0 ? "bg-white" : "bg-light-grey/20"
                      } hover:bg-royal-purple/5`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className="border border-royal-purple/20 p-0"
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
                      className="h-24 text-center text-grey"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
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
