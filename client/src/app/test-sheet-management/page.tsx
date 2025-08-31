"use client";

import { useSheetManagement } from "@/hooks/use-sheet-management";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Plus, Trash2, Settings, RotateCcw } from "lucide-react";
import { useState } from "react";

export default function TestSheetManagementPage() {
  const {
    columns,
    data,
    config,
    isLoading,
    error,
    updateColumn,
    deleteColumn,
    addColumn,
    reorderColumns,
    updateData,
    addRow,
    updateRow,
    deleteRow,
    resetToDefaults,
    refreshData,
  } = useSheetManagement();

  const [showAddColumnForm, setShowAddColumnForm] = useState(false);

  const handleAddTestColumn = async () => {
    try {
      await addColumn({
        name: `Test Column ${Date.now()}`,
        type: "string",
        required: false,
        width: 150,
        order: 0, // Will be auto-calculated
        visible: true,
        editable: true,
        sortable: true,
        filterable: true,
      });
    } catch (error) {
      console.error("Failed to add test column:", error);
    }
  };

  const handleAddTestRow = () => {
    const testRow = {
      bookingId: `BK-${Date.now()}`,
      bookingCode: `BC-${Math.random()
        .toString(36)
        .substr(2, 6)
        .toUpperCase()}`,
      tourCode: "TEST",
      reservationDate: new Date(),
      bookingType: "Individual",
      bookingStatus: "Pending",
      firstName: "Test",
      lastName: "User",
      emailAddress: "test@example.com",
    };
    addRow(testRow);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-lg">Loading sheet management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Sheet Management Test</h1>
        <div className="flex gap-2">
          <Button onClick={refreshData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={resetToDefaults} variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-700">❌ Error: {error}</p>
          </CardContent>
        </Card>
      )}

      {/* Configuration Info */}
      <Card>
        <CardHeader>
          <CardTitle>Sheet Configuration</CardTitle>
          <CardDescription>
            Real-time configuration from Firestore
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold">Sheet ID:</span> {config.id}
            </div>
            <div>
              <span className="font-semibold">Name:</span> {config.name}
            </div>
            <div>
              <span className="font-semibold">Version:</span> {config.version}
            </div>
            <div>
              <span className="font-semibold">Last Updated:</span>{" "}
              {config.updatedAt.toLocaleString()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Columns Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Columns ({columns.length})</CardTitle>
              <CardDescription>
                Real-time columns from bookingSheetColumns collection
              </CardDescription>
            </div>
            <Button onClick={handleAddTestColumn} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Test Column
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {columns.map((column) => (
              <div
                key={column.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{column.order}</Badge>
                  <div>
                    <p className="font-medium">{column.name}</p>
                    <p className="text-sm text-gray-500">
                      {column.type} •{" "}
                      {column.required ? "Required" : "Optional"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={column.visible ? "default" : "secondary"}>
                    {column.visible ? "Visible" : "Hidden"}
                  </Badge>
                  <Badge variant={column.editable ? "default" : "secondary"}>
                    {column.editable ? "Editable" : "Read-only"}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteColumn(column.id)}
                    disabled={column.id === "bookingId"} // Protect default columns
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Data ({data.length} rows)</CardTitle>
              <CardDescription>
                Real-time booking data from Firestore
              </CardDescription>
            </div>
            <Button onClick={handleAddTestRow} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Test Row
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.slice(0, 5).map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{row.id}</Badge>
                  <div>
                    <p className="font-medium">{row.bookingId || row.id}</p>
                    <p className="text-sm text-gray-500">
                      {row.firstName} {row.lastName} • {row.bookingStatus}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteRow(row.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {data.length > 5 && (
              <p className="text-sm text-gray-500 text-center py-2">
                Showing first 5 rows of {data.length} total rows
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Real-time Status */}
      <Card>
        <CardHeader>
          <CardTitle>Real-time Status</CardTitle>
          <CardDescription>Live connection status and updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold">Columns:</span>{" "}
              <Badge variant="default">{columns.length}</Badge>
            </div>
            <div>
              <span className="font-semibold">Data Rows:</span>{" "}
              <Badge variant="default">{data.length}</Badge>
            </div>
            <div>
              <span className="font-semibold">Connection:</span>{" "}
              <Badge variant="default">Active</Badge>
            </div>
            <div>
              <span className="font-semibold">Last Update:</span>{" "}
              {new Date().toLocaleTimeString()}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
