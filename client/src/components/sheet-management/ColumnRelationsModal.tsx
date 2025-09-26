import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown } from "lucide-react";
import { SheetColumn } from "@/types/sheet-management";

interface ColumnRelationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  columnName: string;
  dependencies: SheetColumn[];
  dependents: SheetColumn[];
}

export function ColumnRelationsModal({
  isOpen,
  onClose,
  columnName,
  dependencies,
  dependents,
}: ColumnRelationsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Column Relations
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Dependencies and dependents for{" "}
            <span className="font-medium">"{columnName}"</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Dependencies Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ArrowUp className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-medium text-gray-900">
                Dependencies ({dependencies.length})
              </h3>
            </div>
            <p className="text-xs text-gray-600">
              Columns that this column depends on
            </p>
            {dependencies.length > 0 ? (
              <div className="max-h-48 overflow-y-auto rounded-md border bg-gray-50 p-3">
                <div className="space-y-2">
                  {dependencies.map((column) => (
                    <div
                      key={column.id}
                      className="flex items-center justify-between rounded-md bg-white p-3 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        <div>
                          <span className="text-sm font-medium">
                            {column.columnName}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {column.dataType}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              ID: {column.id}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 text-center">
                <p className="text-sm text-gray-500">
                  This column has no dependencies
                </p>
              </div>
            )}
          </div>

          {/* Dependents Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ArrowDown className="h-4 w-4 text-green-600" />
              <h3 className="text-sm font-medium text-gray-900">
                Dependents ({dependents.length})
              </h3>
            </div>
            <p className="text-xs text-gray-600">
              Columns that depend on this column
            </p>
            {dependents.length > 0 ? (
              <div className="max-h-48 overflow-y-auto rounded-md border bg-gray-50 p-3">
                <div className="space-y-2">
                  {dependents.map((column) => (
                    <div
                      key={column.id}
                      className="flex items-center justify-between rounded-md bg-white p-3 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <div>
                          <span className="text-sm font-medium">
                            {column.columnName}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {column.dataType}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              ID: {column.id}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 text-center">
                <p className="text-sm text-gray-500">
                  No columns depend on this column
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
