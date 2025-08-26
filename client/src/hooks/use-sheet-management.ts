import { useState, useCallback } from "react";
import { SheetColumn, SheetData, SheetConfig } from "@/types/sheet-management";
import { defaultBookingColumns } from "@/lib/default-booking-columns";

export function useSheetManagement() {
  const [columns, setColumns] = useState<SheetColumn[]>(defaultBookingColumns);
  const [data, setData] = useState<SheetData[]>([]);
  const [config, setConfig] = useState<SheetConfig>({
    id: "bookings-sheet",
    name: "Bookings Sheet",
    columns: defaultBookingColumns,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  });

  const updateColumn = useCallback(
    (updatedColumn: SheetColumn) => {
      setColumns((prev) =>
        prev.map((col) => (col.id === updatedColumn.id ? updatedColumn : col))
      );
      setConfig((prev) => ({
        ...prev,
        columns: columns.map((col) =>
          col.id === updatedColumn.id ? updatedColumn : col
        ),
        updatedAt: new Date(),
        version: prev.version + 1,
      }));
    },
    [columns]
  );

  const deleteColumn = useCallback(
    (columnId: string) => {
      setColumns((prev) => prev.filter((col) => col.id !== columnId));
      setConfig((prev) => ({
        ...prev,
        columns: columns.filter((col) => col.id !== columnId),
        updatedAt: new Date(),
        version: prev.version + 1,
      }));
    },
    [columns]
  );

  const addColumn = useCallback(
    (newColumn: Omit<SheetColumn, "id" | "order">) => {
      const newId = `col_${Date.now()}`;
      const maxOrder = Math.max(...columns.map((col) => col.order), 0);

      const column: SheetColumn = {
        ...newColumn,
        id: newId,
        order: maxOrder + 1,
      };

      setColumns((prev) => [...prev, column]);
      setConfig((prev) => ({
        ...prev,
        columns: [...columns, column],
        updatedAt: new Date(),
        version: prev.version + 1,
      }));
    },
    [columns]
  );

  const reorderColumns = useCallback(
    (columnIds: string[]) => {
      const reorderedColumns = columnIds
        .map((id, index) => {
          const column = columns.find((col) => col.id === id);
          return column ? { ...column, order: index + 1 } : column;
        })
        .filter(Boolean) as SheetColumn[];

      setColumns(reorderedColumns);
      setConfig((prev) => ({
        ...prev,
        columns: reorderedColumns,
        updatedAt: new Date(),
        version: prev.version + 1,
      }));
    },
    [columns]
  );

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

  const resetToDefaults = useCallback(() => {
    setColumns(defaultBookingColumns);
    setConfig({
      id: "bookings-sheet",
      name: "Bookings Sheet",
      columns: defaultBookingColumns,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    });
  }, []);

  return {
    columns,
    data,
    config,
    updateColumn,
    deleteColumn,
    addColumn,
    reorderColumns,
    updateData,
    addRow,
    updateRow,
    deleteRow,
    resetToDefaults,
  };
}
