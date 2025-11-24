import { useState, useCallback, useEffect } from "react";
import { SheetColumn, SheetData, SheetConfig } from "@/types/sheet-management";
import { defaultBookingColumns } from "@/lib/default-booking-columns";
import { bookingSheetColumnService } from "@/services/booking-sheet-columns-service";
import { bookingService } from "@/services/booking-service";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
} from "firebase/firestore";
import { allBookingSheetColumns } from "@/app/functions/columns";
import { functionMap } from "@/app/functions/columns/functions-index";

export function useSheetManagement() {
  const { toast } = useToast();
  const [columns, setColumns] = useState<SheetColumn[]>([]);
  const [data, setData] = useState<SheetData[]>([]);
  const [config, setConfig] = useState<SheetConfig>({
    id: "bookings-sheet",
    name: "Bookings Sheet",
    columns: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // LOAD CODED COLUMNS (Replaces Firebase bookingSheetColumns)
  // ============================================================================

  useEffect(() => {
    console.log("🔍 [SHEET MANAGEMENT] Loading coded booking sheet columns...");

    // Convert BookingSheetColumn[] to SheetColumn[] and inject function implementations
    const codedColumns: SheetColumn[] = allBookingSheetColumns.map(
      (col): SheetColumn => {
        const columnData = col.data;

        // If this is a function column, inject the actual function implementation
        if (columnData.dataType === "function" && columnData.function) {
          const funcImpl = functionMap[columnData.function];
          if (funcImpl) {
            return {
              ...columnData,
              compiledFunction: funcImpl as (...args: any[]) => any, // Inject the actual function
            };
          } else {
            console.warn(
              `⚠️  Function ${columnData.function} not found in function map for column ${columnData.columnName}`
            );
          }
        }

        return columnData;
      }
    );

    console.log(
      `✅ [SHEET MANAGEMENT] Loaded ${codedColumns.length} coded columns:`,
      {
        functionColumns: codedColumns
          .filter((c) => c.dataType === "function")
          .map((c) => ({
            id: c.id,
            columnName: c.columnName,
            function: c.function,
            hasCompiledFunction: !!(c as any).compiledFunction,
          })),
        timestamp: new Date().toISOString(),
        source: "coded-columns",
      }
    );

    setColumns(codedColumns);
    setConfig((prev) => ({
      ...prev,
      columns: codedColumns,
      updatedAt: new Date(),
    }));
    setIsLoading(false);
    setError(null);
  }, []);

  // ============================================================================
  // REAL-TIME BOOKING DATA SUBSCRIPTION
  // ============================================================================

  useEffect(() => {
    console.log(
      "🔍 [SHEET MANAGEMENT] Setting up real-time booking data subscription..."
    );

    const unsubscribeBookings = onSnapshot(
      query(collection(db, "bookings")),
      (querySnapshot) => {
        const bookings = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as SheetData[];

        // Sort bookings numerically by ID to fix the "10" appearing after "1" issue
        const sortedBookings = bookings.sort((a, b) => {
          const aId = parseInt(a.id);
          const bId = parseInt(b.id);
          if (isNaN(aId) && isNaN(bId)) return 0;
          if (isNaN(aId)) return 1;
          if (isNaN(bId)) return -1;
          return aId - bId;
        });

        console.log(
          `✅ [SHEET MANAGEMENT] Received ${sortedBookings.length} bookings from Firestore sorted numerically by ID:`,
          {
            bookingCount: sortedBookings.length,
            firstBookingKeys:
              sortedBookings.length > 0 ? Object.keys(sortedBookings[0]) : [],
            timestamp: new Date().toISOString(),
          }
        );

        // Debug: Log each booking to see what fields are present
        sortedBookings.forEach((booking, index) => {
          const fieldCount = Object.keys(booking).length;
          const nonEssentialFields = Object.keys(booking).filter(
            (key) => key !== "id" && key !== "createdAt" && key !== "updatedAt"
          );
          const hasNullFields = nonEssentialFields.some(
            (key) => booking[key] === null
          );
          // console.log(
          //   `📊 Booking ${index + 1} (ID: ${
          //     booking.id
          //   }): ${fieldCount} fields, Non-essential: [${nonEssentialFields.join(
          //     ", "
          //   )}]${hasNullFields ? " (has null fields)" : ""}`
          // );

          // Log null fields specifically
          if (hasNullFields) {
            const nullFields = nonEssentialFields.filter(
              (key) => booking[key] === null
            );
            // console.log(`  🔍 Null fields: [${nullFields.join(", ")}]`);
          }
        });

        setData(sortedBookings);
        setIsLoading(false);
        setError(null);
      },
      (error) => {
        console.error("❌ Error listening to bookings:", error);
        setError(`Failed to fetch bookings: ${error.message}`);
        setIsLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => {
      console.log("🧹 Cleaning up booking data subscription");
      unsubscribeBookings();
    };
  }, []);

  // ============================================================================
  // COLUMN MANAGEMENT METHODS
  // ============================================================================

  const updateColumn = useCallback(async (updatedColumn: SheetColumn) => {
    try {
      setError(null);
      await bookingSheetColumnService.updateColumn(
        updatedColumn.id,
        updatedColumn
      );

      // Local state will be updated via real-time subscription
      // console.log(`✅ Column ${updatedColumn.columnName} updated successfully`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`❌ Failed to update column: ${errorMessage}`);
      setError(`Failed to update column: ${errorMessage}`);
    }
  }, []);

  const deleteColumn = useCallback(async (columnId: string) => {
    try {
      setError(null);

      // Check for dependent columns first
      const dependentColumns =
        await bookingSheetColumnService.getDependentColumnsForColumn(columnId);

      if (dependentColumns.length > 1) {
        // More than 1 means there are dependencies (excluding the column itself)
        // Show warning modal - this will be handled by the component
        throw new Error(
          `DEPENDENCIES_FOUND:${JSON.stringify(dependentColumns)}`
        );
      }

      await bookingSheetColumnService.deleteColumn(columnId);

      // Local state will be updated via real-time subscription
      console.log(`✅ Column ${columnId} deleted successfully`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      if (errorMessage.startsWith("DEPENDENCIES_FOUND:")) {
        // Re-throw the dependencies error to be handled by the component
        throw error;
      }

      console.error(`❌ Failed to delete column: ${errorMessage}`);
      setError(`Failed to delete column: ${errorMessage}`);
    }
  }, []);

  const addColumn = useCallback(async (newColumn: Omit<SheetColumn, "id">) => {
    try {
      setError(null);
      const columnId = await bookingSheetColumnService.createColumn(newColumn);

      // Local state will be updated via real-time subscription
      console.log(`✅ Column created successfully with ID: ${columnId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`❌ Failed to create column: ${errorMessage}`);
      setError(`Failed to create column: ${errorMessage}`);
    }
  }, []);

  const reorderColumns = useCallback(async (columnIds: string[]) => {
    try {
      setError(null);
      await bookingSheetColumnService.reorderColumns(columnIds);

      // Local state will be updated via real-time subscription
      console.log("✅ Columns reordered successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`❌ Failed to reorder columns: ${errorMessage}`);
      setError(`Failed to reorder columns: ${errorMessage}`);
    }
  }, []);

  // ============================================================================
  // DATA MANAGEMENT METHODS
  // ============================================================================

  const updateData = useCallback((newData: SheetData[]) => {
    setData(newData);
  }, []);

  const addRow = useCallback((rowData: Omit<SheetData, "id">) => {
    const newRow: SheetData = {
      ...rowData,
      id: `row_${Date.now()}`,
    };
    setData((prev) => [...prev, newRow]);
  }, []);

  const updateRow = useCallback(
    (rowId: string, updates: Partial<SheetData>) => {
      setData((prev) =>
        prev.map((row) => (row.id === rowId ? { ...row, ...updates } : row))
      );
    },
    []
  );

  const deleteRow = useCallback(
    async (rowId: string) => {
      try {
        console.log(`🗑️ Deleting row ${rowId} with row shifting...`);

        // Use the new delete function that removes document and shifts rows
        await bookingService.deleteBookingWithRowShift(rowId);

        // The real-time listener will automatically update the local state
        // when the Firestore changes are detected
        console.log(
          `✅ Successfully deleted row ${rowId} and shifted subsequent rows`
        );

        // Show success toast
        toast({
          title: "🗑️ Booking Deleted",
          description: "Booking deleted and subsequent rows shifted down",
          variant: "default",
        });
      } catch (error) {
        console.error(`❌ Failed to delete row ${rowId}:`, error);

        // Show error toast
        toast({
          title: "❌ Delete Failed",
          description: `Failed to delete booking: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          variant: "destructive",
        });

        throw error; // Re-throw so the UI can handle the error
      }
    },
    [toast]
  );

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  const resetToDefaults = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);

      // Fetch default columns from service
      const defaultColumns =
        await bookingSheetColumnService.getDefaultColumns();
      setColumns(defaultColumns);
      setConfig({
        id: "bookings-sheet",
        name: "Bookings Sheet",
        columns: defaultColumns,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      });

      console.log("✅ Reset to default columns");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`❌ Failed to reset to defaults: ${errorMessage}`);
      setError(`Failed to reset to defaults: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshData = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);

      // Fetch fresh columns and data
      const freshColumns = await bookingSheetColumnService.getAllColumns();
      setColumns(freshColumns);

      // Data will be refreshed via real-time subscription
      console.log("✅ Data refreshed successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`❌ Failed to refresh data: ${errorMessage}`);
      setError(`Failed to refresh data: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    // State
    columns,
    data,
    config,
    isLoading,
    error,

    // Column management
    updateColumn,
    deleteColumn,
    addColumn,
    reorderColumns,

    // Data management
    updateData,
    addRow,
    updateRow,
    deleteRow,

    // Utility methods
    resetToDefaults,
    refreshData,
  };
}
