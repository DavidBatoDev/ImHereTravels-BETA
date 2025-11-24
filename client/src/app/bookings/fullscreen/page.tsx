"use client";

import { useRouter } from "next/navigation";
import { useSheetManagement } from "@/hooks/use-sheet-management";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, Filter, Eye, EyeOff, X } from "lucide-react";
import { useState, useMemo, useCallback, useEffect } from "react";
import { typescriptFunctionsService } from "@/services/typescript-functions-service";
import { TypeScriptFunction } from "@/types/sheet-management";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import BookingsDataGrid from "@/components/sheet-management/BookingsDataGrid";

export default function BookingsFullscreenPage() {
  const router = useRouter();
  const {
    columns,
    data,
    updateColumn,
    deleteColumn,
    updateData,
    updateRow,
    deleteRow,
  } = useSheetManagement();

  const [globalFilter, setGlobalFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnsDialog, setShowColumnsDialog] = useState(false);
  const [columnFilters, setColumnFilters] = useState<Record<string, any>>({});
  const [dateRangeFilters, setDateRangeFilters] = useState<
    Record<string, { from?: Date; to?: Date }>
  >({});
  const [currencyRangeFilters, setCurrencyRangeFilters] = useState<
    Record<string, { min?: number; max?: number }>
  >({});

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
      } catch (error) {
        console.error("Failed to toggle column visibility:", error);
      }
    },
    [columns, updateColumn]
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Simplified Header */}
      <div
        className="border-b border-royal-purple/20 sticky top-0 z-50"
        style={{ backgroundColor: "hsl(var(--card-surface))" }}
      >
        <div className="px-6 py-4">
          <div className="flex items-center gap-4">
            {/* Back Button */}
            <Button
              variant="outline"
              onClick={() => router.push("/bookings")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search across all fields ..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-10 border-royal-purple/20 focus:border-royal-purple focus:ring-royal-purple/20 focus:outline-none focus-visible:ring-0"
              />
            </div>

            {/* Filter Button */}
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
                                    <Calendar className="mr-2 h-4 w-4" />
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
                                    <Calendar className="mr-2 h-4 w-4" />
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

            {/* Show Columns Dropdown */}
            <Popover
              open={showColumnsDialog}
              onOpenChange={setShowColumnsDialog}
            >
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
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

            {/* Clear All Filters */}
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
      </div>

      {/* Data Grid - Full Screen with 1000 rows */}
      <div className="p-6">
        <BookingsDataGrid
          columns={columns}
          data={data}
          updateColumn={updateColumn}
          deleteColumn={deleteColumn}
          updateData={updateData}
          updateRow={updateRow}
          deleteRow={deleteRow}
          isFullscreen={true}
          globalFilter={globalFilter}
          columnFilters={columnFilters}
          dateRangeFilters={dateRangeFilters}
          currencyRangeFilters={currencyRangeFilters}
        />
      </div>
    </div>
  );
}
