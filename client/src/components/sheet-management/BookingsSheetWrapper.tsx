"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Settings, Grid, Table } from "lucide-react";
import BookingsSheet from "./BookingsSheet";
import BookingsDataGrid from "./BookingsDataGrid";
import { useSheetManagement } from "@/hooks/use-sheet-management";
import { typescriptFunctionsService } from "@/services/typescript-functions-service";
import { TypeScriptFunction } from "@/types/sheet-management";

interface BookingsSheetWrapperProps {
  // Add any props that might be needed
}

export default function BookingsSheetWrapper({}: BookingsSheetWrapperProps) {
  const [useDataGrid, setUseDataGrid] = useState(false);
  const [availableFunctions, setAvailableFunctions] = useState<
    TypeScriptFunction[]
  >([]);
  const [isLoadingFunctions, setIsLoadingFunctions] = useState(false);

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
      {/* Toggle Switch */}
      <Card className="border border-royal-purple/20 shadow-lg">
        <CardHeader className="bg-muted/50 border-b border-royal-purple/20 dark:border-border">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Settings className="h-5 w-5 text-royal-purple" />
            Sheet Management Options
          </CardTitle>
          <CardDescription>
            Choose between React Table (traditional) or React Data Grid (modern)
            implementation
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="grid-toggle" className="text-base font-medium">
                Use React Data Grid
              </Label>
              <p className="text-sm text-muted-foreground">
                {useDataGrid
                  ? "Modern data grid with enhanced performance and features"
                  : "Traditional table with full feature compatibility"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Table className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  React Table
                </span>
              </div>
              <Switch
                id="grid-toggle"
                checked={useDataGrid}
                onCheckedChange={setUseDataGrid}
                className="data-[state=checked]:bg-royal-purple"
              />
              <div className="flex items-center gap-2">
                <Grid className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Data Grid</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Render the appropriate component */}
      {useDataGrid ? (
        <BookingsDataGrid
          columns={columns}
          data={data}
          updateColumn={updateColumn}
          deleteColumn={deleteColumn}
          updateData={updateData}
          updateRow={updateRow}
          deleteRow={deleteRow}
        />
      ) : (
        <BookingsSheet />
      )}
    </div>
  );
}
