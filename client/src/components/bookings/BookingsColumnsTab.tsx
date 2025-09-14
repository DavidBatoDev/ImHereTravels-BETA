"use client";

import { useEffect, useMemo, useState } from "react";
import type { SheetColumn } from "@/types/sheet-management";
import bookingSheetColumnService from "@/services/booking-sheet-columns-service";
import { useToast } from "@/hooks/use-toast";
import {
  GripVertical,
  RefreshCw,
  Settings,
  Eye,
  EyeOff,
  Plus,
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
import AddColumnModal from "../sheet-management/AddColumnModal";
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
  const [isReordering, setIsReordering] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<SheetColumn | null>(
    null
  );
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = bookingSheetColumnService.subscribeToColumns((cols) => {
      // Avoid overriding during an ongoing drag to keep UI stable
      if (!isReordering) setColumns(cols);
    });
    return () => unsubscribe();
  }, [isReordering]);

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

  const handleAddColumn = async (newColumn: Omit<SheetColumn, "id">) => {
    try {
      await bookingSheetColumnService.createColumn(newColumn);
      toast({
        title: "Column Added",
        description: `${newColumn.columnName} has been created successfully`,
      });
      setIsAddColumnModalOpen(false);
    } catch (err) {
      toast({
        title: "Failed to Add Column",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex justify-between gap-2 sm:flex-row flex-col sm:items-center items-start">
          <div>
            <CardTitle>Column Management</CardTitle>
            <p className="text-sm text-grey">
              Drag and drop to reorder columns. Click settings to configure
              individual columns.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddColumnModalOpen(true)}
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
                <div className="rounded-md border-2 border-royal-purple/30 bg-white overflow-hidden">
                  <div className="grid grid-cols-[48px_60px_1fr_100px_80px_100px] gap-0 bg-light-grey/50 border-b-2 border-royal-purple/30 text-royal-purple text-xs font-medium uppercase tracking-wide">
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
                            className={`grid grid-cols-[48px_60px_1fr_100px_80px_100px] items-center border-b border-royal-purple/20 ${
                              isReordering
                                ? "cursor-grabbing"
                                : "cursor-default"
                            }`}
                          >
                            <div className="p-2 flex items-center justify-center text-grey select-none border-r border-royal-purple/20">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className="p-1 rounded hover:bg-light-grey cursor-grab active:cursor-grabbing"
                                    aria-label={`Drag ${col.columnName} to reorder`}
                                    {...listeners}
                                  >
                                    <GripVertical className="h-4 w-4" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>Drag to reorder</TooltipContent>
                              </Tooltip>
                            </div>
                            <div className="p-2 flex items-center justify-center border-r border-royal-purple/20">
                              <Badge
                                variant="outline"
                                className="text-xs font-mono"
                              >
                                {col.order}
                              </Badge>
                            </div>
                            <div className="p-3 border-r border-royal-purple/20">
                              <div
                                className="font-medium text-creative-midnight truncate"
                                title={col.columnName}
                              >
                                {col.columnName}
                              </div>
                              <div className="text-xs text-grey mt-0.5">
                                ID: {col.id}
                              </div>
                            </div>
                            <div className="p-3 text-sm text-grey border-r border-royal-purple/20">
                              {col.dataType}
                            </div>
                            <div className="p-3 flex items-center border-r border-royal-purple/20">
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
                      <div className="p-6 text-center text-grey">
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
      {selectedColumn && (
        <ColumnSettingsModal
          isOpen={isSettingsModalOpen}
          onClose={handleCloseSettings}
          column={selectedColumn}
          onSave={async (updatedColumn) => {
            try {
              await bookingSheetColumnService.updateColumn(
                selectedColumn.id,
                updatedColumn
              );
              toast({
                title: "Column Updated",
                description: `${selectedColumn.columnName} settings saved`,
              });
              handleCloseSettings();
            } catch (err) {
              toast({
                title: "Failed to Update Column",
                description:
                  err instanceof Error ? err.message : "Unknown error",
                variant: "destructive",
              });
            }
          }}
        />
      )}

      {/* Add Column Modal */}
      <AddColumnModal
        isOpen={isAddColumnModalOpen}
        onClose={() => setIsAddColumnModalOpen(false)}
        onAdd={handleAddColumn}
        existingColumns={columns}
      />
    </>
  );
}
