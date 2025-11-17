"use client";

import { useState, useEffect } from "react";
import BookingsDataGrid from "./BookingsDataGrid";
import { useSheetManagement } from "@/hooks/use-sheet-management";

export default function BookingsSheet() {
  console.log("📋 [SHEET MANAGEMENT] BookingsSheet component mounted:", {
    timestamp: new Date().toISOString(),
  });

  const {
    columns,
    data,
    updateColumn,
    deleteColumn,
    updateData,
    updateRow,
    deleteRow,
  } = useSheetManagement();

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
