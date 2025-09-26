import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2 } from "lucide-react";
import { SheetColumn } from "@/types/sheet-management";

interface DeleteColumnWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  columnName: string;
  affectedColumns: SheetColumn[];
}

export function DeleteColumnWarningModal({
  isOpen,
  onClose,
  onConfirm,
  columnName,
  affectedColumns,
}: DeleteColumnWarningModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <DialogTitle className="text-lg font-semibold">
              Delete Column Warning
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            Deleting the column{" "}
            <span className="font-medium">"{columnName}"</span> will also delete
            all columns that depend on this column (both directly and
            indirectly). This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">
                  {affectedColumns.length} column
                  {affectedColumns.length !== 1 ? "s" : ""} will be deleted:
                </p>
              </div>
            </div>
          </div>

          {affectedColumns.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900">
                Affected Columns:
              </h4>
              <div className="max-h-48 overflow-y-auto rounded-md border bg-gray-50 p-3">
                <div className="space-y-2">
                  {affectedColumns.map((column) => (
                    <div
                      key={column.id}
                      className="flex items-center justify-between rounded-md bg-white p-2 shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-red-500" />
                        <span className="text-sm font-medium">
                          {column.columnName}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({column.dataType})
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        ID: {column.id}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-2">
              <Trash2 className="h-4 w-4 text-red-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-red-800">Warning:</p>
                <ul className="mt-1 list-disc list-inside text-red-700 space-y-1">
                  <li>All data in these columns will be permanently lost</li>
                  <li>
                    Any other columns that reference these columns will also be
                    affected
                  </li>
                  <li>This action cannot be undone</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} className="gap-2">
            <Trash2 className="h-4 w-4" />
            Delete {affectedColumns.length} Column
            {affectedColumns.length !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
