"use client";

import { useState, useEffect } from "react";
import BookingsDataGrid from "./BookingsDataGrid";
import { useSheetManagement } from "@/hooks/use-sheet-management";

export default function BookingsSheet() {
  console.log("📋 [SHEET MANAGEMENT] BookingsSheet component mounted:", {
    timestamp: new Date().toISOString(),
  });

  const { columns, data, updateData, updateRow, deleteRow } =
    useSheetManagement();

  // Stub functions for column management (columns are now read-only from code)
  const updateColumn = async (column: any) => {
    console.log(
      "Column updates are disabled - columns are now defined in code",
    );
  };

  const deleteColumn = async (columnId: string) => {
    console.log(
      "Column deletion is disabled - columns are now defined in code",
    );
  };

  return (
    <div className="space-y-6">
      {/* React Data Grid Implementation */}
      <BookingsDataGrid
        columns={columns}
        data={data}
        updateColumn={updateColumn}
        deleteColumn={deleteColumn}
        updateData={updateData}
        updateRow={updateRow}
        deleteRow={deleteRow}
      />
    </div>
  );
}
