import { useState, useCallback, useEffect } from "react";
import { SheetColumn, SheetData, SheetConfig } from "@/types/sheet-management";
import { defaultBookingColumns } from "@/lib/default-booking-columns";
import { bookingSheetColumnService } from "@/services/booking-sheet-columns-service";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
} from "firebase/firestore";

export function useSheetManagement() {
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
  // REAL-TIME COLUMN SUBSCRIPTION
  // ============================================================================

  useEffect(() => {
    const unsubscribeColumns = bookingSheetColumnService.subscribeToColumns(
      (fetchedColumns) => {
        setColumns(fetchedColumns);
        setConfig((prev) => ({
          ...prev,
          columns: fetchedColumns,
          updatedAt: new Date(),
        }));
        setIsLoading(false);
        setError(null);
      }
    );

    // Cleanup subscription on unmount
    return () => {
      unsubscribeColumns();
    };
  }, []);

  // ============================================================================
  // REAL-TIME BOOKING DATA SUBSCRIPTION
  // ============================================================================

  useEffect(() => {
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
      console.log(`✅ Column ${updatedColumn.columnName} updated successfully`);
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

  const deleteRow = useCallback((rowId: string) => {
    setData((prev) => prev.filter((row) => row.id !== rowId));
  }, []);

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
