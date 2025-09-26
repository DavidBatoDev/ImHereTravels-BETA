"use client";

import { useEffect, useMemo, useState } from "react";
import type { SheetColumn, TypeScriptFunction } from "@/types/sheet-management";
import bookingSheetColumnService from "@/services/booking-sheet-columns-service";
import { typescriptFunctionsService } from "@/services/typescript-functions-service";
import { useToast } from "@/hooks/use-toast";
import {
  GripVertical,
  RefreshCw,
  Settings,
  Eye,
  EyeOff,
  Plus,
  GitBranch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ColumnSettingsModal from "../sheet-management/ColumnSettingsModal";
import { DeleteColumnWarningModal } from "../sheet-management/DeleteColumnWarningModal";
import { ColumnRelationsModal } from "../sheet-management/ColumnRelationsModal";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Color utility function
const getColumnColorClasses = (
  color: SheetColumn["color"] | undefined
): string => {
  const colorMap: Record<string, string> = {
    purple: "bg-royal-purple/15 border-royal-purple/30",
    blue: "bg-blue-200 border-blue-300",
    green: "bg-green-200 border-green-300",
    yellow: "bg-yellow-200 border-yellow-300",
    orange: "bg-orange-200 border-orange-300",
    red: "bg-red-200 border-red-300",
    pink: "bg-pink-200 border-pink-300",
    cyan: "bg-cyan-200 border-cyan-300",
    gray: "bg-gray-200 border-gray-300",
    none: "bg-white border-gray-200",
  };
  return colorMap[color || "none"] || colorMap.none;
};

// Sortable row wrapper
function SortableRow({
  id,
  children,
}: {
  id: string;
  children: (listeners: any) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: transform ? CSS.Transform.toString(transform) : undefined,
    transition,
    opacity: isDragging ? 0.7 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {children(listeners)}
    </div>
  );
}

export default function BookingsColumnsTab() {
  const [columns, setColumns] = useState<SheetColumn[]>([]);
  const [availableFunctions, setAvailableFunctions] = useState<
    TypeScriptFunction[]
  >([]);
  const [isReordering, setIsReordering] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<SheetColumn | null>(
    null
  );
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [deleteColumnWarningModal, setDeleteColumnWarningModal] = useState<{
    isOpen: boolean;
    columnId: string;
    columnName: string;
    affectedColumns: SheetColumn[];
  }>({ isOpen: false, columnId: "", columnName: "", affectedColumns: [] });
  const [columnRelationsModal, setColumnRelationsModal] = useState<{
    isOpen: boolean;
    columnName: string;
    dependencies: SheetColumn[];
    dependents: SheetColumn[];
  }>({ isOpen: false, columnName: "", dependencies: [], dependents: [] });
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = bookingSheetColumnService.subscribeToColumns((cols) => {
      // Avoid overriding during an ongoing drag to keep UI stable
      if (!isReordering) setColumns(cols);
    });
    return () => unsubscribe();
  }, [isReordering]);

  // Load available functions
  useEffect(() => {
    const loadFunctions = async () => {
      try {
        const functions = await typescriptFunctionsService.getAllFunctions();
        setAvailableFunctions(functions);
        console.log(
          "🔍 Loaded functions in BookingsColumnsTab:",
          functions.length
        );
      } catch (error) {
        console.error(
          "❌ Failed to load functions in BookingsColumnsTab:",
          error
        );
      }
    };

    loadFunctions();
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const ids = useMemo(() => columns.map((c) => c.id), [columns]);

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setIsReordering(true);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) {
      setIsReordering(false);
      return;
    }

    const next = arrayMove(columns, oldIndex, newIndex);
    setColumns(next);
    try {
      await bookingSheetColumnService.reorderColumns(next.map((c) => c.id));
      toast({
        title: "Columns Reordered",
        description: `New order saved (${next.length} columns)`,
      });
    } catch (err) {
      const latest = await bookingSheetColumnService.getAllColumns();
      setColumns(latest);
      toast({
        title: "Failed to Save Order",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsReordering(false);
    }
  };

  const refresh = async () => {
    try {
      const latest = await bookingSheetColumnService.getAllColumns();
      setColumns(latest);
      toast({
        title: "Refreshed",
        description: `Fetched ${latest.length} columns`,
      });
    } catch (err) {
      toast({
        title: "Refresh failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    try {
      // Check for dependent columns first
      const dependentColumns =
        await bookingSheetColumnService.getDependentColumnsForColumn(columnId);

      if (dependentColumns.length > 1) {
        // More than 1 means there are dependencies (excluding the column itself)
        // Show warning modal
        const column = columns.find((c) => c.id === columnId);
        setDeleteColumnWarningModal({
          isOpen: true,
          columnId,
          columnName: column?.columnName || "Unknown",
          affectedColumns: dependentColumns,
        });
        return;
      }

      // No dependencies, proceed with deletion
      await bookingSheetColumnService.deleteColumn(columnId);
      toast({
        title: "Column Deleted",
        description: "Column has been deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting column:", error);
      toast({
        title: "Error",
        description: "Failed to delete column. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleConfirmDeleteColumn = async () => {
    const { columnId, affectedColumns } = deleteColumnWarningModal;

    try {
      // Delete all affected columns
      for (const column of affectedColumns) {
        await bookingSheetColumnService.deleteColumn(column.id);
      }

      // Close the modal
      setDeleteColumnWarningModal({
        isOpen: false,
        columnId: "",
        columnName: "",
        affectedColumns: [],
      });

      toast({
        title: "Success",
        description: `${affectedColumns.length} column${
          affectedColumns.length !== 1 ? "s" : ""
        } deleted successfully.`,
      });
    } catch (error) {
      console.error("Error deleting columns:", error);
      toast({
        title: "Error",
        description: "Failed to delete columns. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleOpenSettings = (column: SheetColumn) => {
    setSelectedColumn(column);
    setIsSettingsModalOpen(true);
  };

  const handleCloseSettings = () => {
    setSelectedColumn(null);
    setIsSettingsModalOpen(false);
  };

  const handleToggleFormInclusion = async (column: SheetColumn) => {
    try {
      await bookingSheetColumnService.updateColumn(column.id, {
        includeInForms: !column.includeInForms,
      });
      toast({
        title: "Form Inclusion Updated",
        description: `${column.columnName} ${
          column.includeInForms ? "removed from" : "added to"
        } forms`,
      });
    } catch (err) {
      toast({
        title: "Failed to Update Form Inclusion",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleAddColumn = () => {
    setSelectedColumn(null); // null means we're adding a new column
    setIsSettingsModalOpen(true);
  };

  const handleShowColumnRelations = async (column: SheetColumn) => {
    try {
      const relatedColumns = await bookingSheetColumnService.getRelatedColumns(
        column.id
      );
      setColumnRelationsModal({
        isOpen: true,
        columnName: column.columnName,
        dependencies: relatedColumns.dependencies,
        dependents: relatedColumns.dependents,
      });
    } catch (error) {
      console.error("Error loading column relations:", error);
      toast({
        title: "Error",
        description: "Failed to load column relations. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex justify-between gap-2 sm:flex-row flex-col sm:items-center items-start">
          <div>
            <CardTitle className="text-foreground">Column Management</CardTitle>
            <p className="text-sm text-muted-foreground">
              Drag and drop to reorder columns. Click settings to configure
              individual columns.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddColumn}
              className="gap-2"
            >
              <Plus className="h-4 w-4" /> Add Column
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <TooltipProvider>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={ids}
                strategy={verticalListSortingStrategy}
              >
                <div className="rounded-md border-2 border-royal-purple/30 dark:border-border bg-white dark:bg-background overflow-hidden">
                  <div className="grid grid-cols-[48px_60px_1fr_100px_80px_120px] gap-0 bg-muted/50 border-b-2 border-royal-purple/30 dark:border-border text-royal-purple text-xs font-medium uppercase tracking-wide">
                    <div className="p-2 text-center border-r border-royal-purple/20">
                      Move
                    </div>
                    <div className="p-2 text-center border-r border-royal-purple/20">
                      Order
                    </div>
                    <div className="p-2 border-r border-royal-purple/20">
                      Column
                    </div>
                    <div className="p-2 border-r border-royal-purple/20">
                      Type
                    </div>
                    <div className="p-2 border-r border-royal-purple/20">
                      Color
                    </div>
                    <div className="p-2 text-center">Actions</div>
                  </div>
                  <div>
                    {columns.map((col) => (
                      <SortableRow key={col.id} id={col.id}>
                        {(listeners) => (
                          <div
                            className={`grid grid-cols-[48px_60px_1fr_100px_80px_120px] items-center border-b border-royal-purple/20 ${
                              isReordering
                                ? "cursor-grabbing"
                                : "cursor-default"
                            }`}
                          >
                            <div className="p-2 flex items-center justify-center text-muted-foreground select-none border-r border-royal-purple/20 dark:border-border">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className="p-1 rounded hover:bg-muted cursor-grab active:cursor-grabbing"
                                    aria-label={`Drag ${col.columnName} to reorder`}
                                    {...listeners}
                                  >
                                    <GripVertical className="h-4 w-4" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>Drag to reorder</TooltipContent>
                              </Tooltip>
                            </div>
                            <div className="p-2 flex items-center justify-center border-r border-royal-purple/20 dark:border-border">
                              <Badge
                                variant="outline"
                                className="text-xs font-mono"
                              >
                                {col.order}
                              </Badge>
                            </div>
                            <div className="p-3 border-r border-royal-purple/20 dark:border-border">
                              <div
                                className="font-medium text-foreground truncate"
                                title={col.columnName}
                              >
                                {col.columnName}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                ID: {col.id}
                              </div>
                            </div>
                            <div className="p-3 text-sm text-muted-foreground border-r border-royal-purple/20 dark:border-border">
                              {col.dataType}
                            </div>
                            <div className="p-3 flex items-center border-r border-royal-purple/20 dark:border-border">
                              <div
                                className={`w-6 h-6 rounded-full border-2 ${getColumnColorClasses(
                                  col.color
                                )}`}
                                title={`Color: ${col.color || "none"}`}
                              />
                            </div>
                            <div className="p-3 flex items-center justify-center gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleShowColumnRelations(col)
                                    }
                                    className="h-8 w-8 p-0 hover:bg-royal-purple/10"
                                  >
                                    <GitBranch className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Show Column Relations
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenSettings(col)}
                                    className="h-8 w-8 p-0 hover:bg-royal-purple/10"
                                  >
                                    <Settings className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Column Settings</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleToggleFormInclusion(col)
                                    }
                                    className="h-8 w-8 p-0 hover:bg-royal-purple/10"
                                  >
                                    {col.includeInForms ? (
                                      <Eye className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <EyeOff className="h-4 w-4 text-gray-400" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {col.includeInForms
                                    ? "Remove from forms"
                                    : "Add to forms"}
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        )}
                      </SortableRow>
                    ))}
                    {columns.length === 0 && (
                      <div className="p-6 text-center text-muted-foreground">
                        No columns found.
                      </div>
                    )}
                  </div>
                </div>
              </SortableContext>
            </DndContext>
          </TooltipProvider>
        </CardContent>
      </Card>

      {/* Column Settings Modal */}
      <ColumnSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={handleCloseSettings}
        column={selectedColumn}
        availableFunctions={availableFunctions}
        existingColumns={columns}
        onDelete={handleDeleteColumn}
        onSave={async (updatedColumn) => {
          try {
            if (selectedColumn) {
              // Editing existing column
              await bookingSheetColumnService.updateColumn(
                selectedColumn.id,
                updatedColumn
              );
              toast({
                title: "Column Updated",
                description: `${selectedColumn.columnName} settings saved`,
              });
            } else {
              // Adding new column
              await bookingSheetColumnService.createColumn(updatedColumn);
              toast({
                title: "Column Added",
                description: `${updatedColumn.columnName} has been created successfully`,
              });
            }
            handleCloseSettings();
          } catch (err) {
            toast({
              title: selectedColumn
                ? "Failed to Update Column"
                : "Failed to Add Column",
              description: err instanceof Error ? err.message : "Unknown error",
              variant: "destructive",
            });
          }
        }}
      />

      {/* Delete Column Warning Modal */}
      <DeleteColumnWarningModal
        isOpen={deleteColumnWarningModal.isOpen}
        onClose={() =>
          setDeleteColumnWarningModal({
            isOpen: false,
            columnId: "",
            columnName: "",
            affectedColumns: [],
          })
        }
        onConfirm={handleConfirmDeleteColumn}
        columnName={deleteColumnWarningModal.columnName}
        affectedColumns={deleteColumnWarningModal.affectedColumns}
      />

      {/* Column Relations Modal */}
      <ColumnRelationsModal
        isOpen={columnRelationsModal.isOpen}
        onClose={() =>
          setColumnRelationsModal({
            isOpen: false,
            columnName: "",
            dependencies: [],
            dependents: [],
          })
        }
        columnName={columnRelationsModal.columnName}
        dependencies={columnRelationsModal.dependencies}
        dependents={columnRelationsModal.dependents}
      />
    </>
  );
}
