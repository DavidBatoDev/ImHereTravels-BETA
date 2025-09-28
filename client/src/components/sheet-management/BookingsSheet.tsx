"use client";

import { useState, useEffect } from "react";
import BookingsDataGrid from "./BookingsDataGrid";
import { useSheetManagement } from "@/hooks/use-sheet-management";
import { typescriptFunctionsService } from "@/services/typescript-functions-service";
import { TypeScriptFunction } from "@/types/sheet-management";

export default function BookingsSheet() {
  console.log("📋 [SHEET MANAGEMENT] BookingsSheet component mounted:", {
    timestamp: new Date().toISOString(),
  });

  const [availableFunctions, setAvailableFunctions] = useState<
    TypeScriptFunction[]
  >([]);
  const [isLoadingFunctions, setIsLoadingFunctions] = useState(false);

  const {
    columns,
    data,
    updateColumn,
    deleteColumn,
    updateData,
    updateRow,
    deleteRow,
  } = useSheetManagement();

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
        availableFunctions={availableFunctions}
      />
    </div>
  );
}
