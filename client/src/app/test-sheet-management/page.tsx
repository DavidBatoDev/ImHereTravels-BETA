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
import {
  RefreshCw,
  Plus,
  Trash2,
  Settings,
  RotateCcw,
  Lock,
} from "lucide-react";
import { useState } from "react";

export default function TestSheetManagementPage() {
  const {
    columns,
    data,
    config,
    isLoading,
    error,
    updateData,
    addRow,
    updateRow,
    deleteRow,
  } = useSheetManagement();

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
          <p className="text-sm text-muted-foreground">
            Columns are now read-only from code
          </p>
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
                Columns defined in code and loaded from functions/columns
              </CardDescription>
            </div>
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
                    <p className="font-medium">{column.columnName}</p>
                    <p className="text-sm text-gray-500">
                      {column.dataType} •{" "}
                      {column.includeInForms
                        ? "Included in Forms"
                        : "Not in Forms"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={column.includeInForms ? "default" : "secondary"}
                  >
                    {column.includeInForms ? "In Forms" : "Not in Forms"}
                  </Badge>
                  <Badge variant="outline">{column.dataType}</Badge>
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
                    <p className="font-medium">
                      {(row as any).bookingId || row.id}
                    </p>
                    <p className="text-sm text-gray-500">
                      {(row as any).firstName} {(row as any).lastName} •{" "}
                      {(row as any).bookingStatus}
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
