"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BookingsSheet from "@/components/sheet-management/BookingsSheet";
import BookingsDataGrid from "@/components/sheet-management/BookingsDataGrid";

export default function TestSheetComparison() {
  const [activeTab, setActiveTab] = useState<"react-table" | "data-grid">(
    "react-table"
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Sheet Management Comparison</h1>
        <div className="flex gap-2">
          <Button
            variant={activeTab === "react-table" ? "default" : "outline"}
            onClick={() => setActiveTab("react-table")}
          >
            React Table (Current)
          </Button>
          <Button
            variant={activeTab === "data-grid" ? "default" : "outline"}
            onClick={() => setActiveTab("data-grid")}
          >
            React Data Grid (New)
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {activeTab === "react-table"
              ? "React Table Implementation"
              : "React Data Grid Implementation"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeTab === "react-table" ? (
            <BookingsSheet />
          ) : (
            <BookingsDataGrid
              columns={[]}
              data={[]}
              updateColumn={() => {}}
              deleteColumn={() => {}}
              updateData={() => {}}
              updateRow={() => {}}
              deleteRow={async () => {}}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Migration Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg mb-2">
              ✅ Completed Features
            </h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Basic data display with row numbers</li>
              <li>Column management and settings</li>
              <li>Cell editing for different data types</li>
              <li>Row operations (add, delete)</li>
              <li>Search and filtering</li>
              <li>Column visibility controls</li>
              <li>Responsive design</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">🚧 In Progress</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Function column computation</li>
              <li>Advanced cell editing (overlay editing)</li>
              <li>Context menus</li>
              <li>Pagination controls</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">📋 Next Steps</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Implement function column rendering and computation</li>
              <li>Add advanced cell editing features</li>
              <li>Implement context menus for row operations</li>
              <li>Add pagination controls</li>
              <li>Performance optimization</li>
              <li>Replace the original component</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
