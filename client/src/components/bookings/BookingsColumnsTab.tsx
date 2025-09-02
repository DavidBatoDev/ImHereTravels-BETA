"use client";

import { useEffect, useMemo, useState } from "react";
import type { SheetColumn } from "@/types/sheet-management";
import bookingSheetColumnService from "@/services/booking-sheet-columns-service";
import { useToast } from "@/hooks/use-toast";
import { GripVertical, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

// Sortable row wrapper
function SortableRow({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: transform ? CSS.Transform.toString(transform) : undefined,
    transition,
    opacity: isDragging ? 0.7 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

export default function BookingsColumnsTab() {
  const [columns, setColumns] = useState<SheetColumn[]>([]);
  const [isReordering, setIsReordering] = useState(false);
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
      toast({ title: "Columns Reordered", description: `New order saved (${next.length} columns)` });
    } catch (err) {
      const latest = await bookingSheetColumnService.getAllColumns();
      setColumns(latest);
      toast({ title: "Failed to Save Order", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setIsReordering(false);
    }
  };

  const refresh = async () => {
    try {
      const latest = await bookingSheetColumnService.getAllColumns();
      setColumns(latest);
      toast({ title: "Refreshed", description: `Fetched ${latest.length} columns` });
    } catch (err) {
      toast({ title: "Refresh failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    }
  };

  return (
    <Card>
  <CardHeader className="flex justify-between gap-2 sm:flex-row flex-col sm:items-center items-start">
        <div>
          <CardTitle>Column Order</CardTitle>
          <p className="text-sm text-grey">Drag and drop to reorder columns. Changes are saved automatically.</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              <div className="rounded-md border border-royal-purple/20 bg-white overflow-hidden">
                <div className="grid grid-cols-[48px_1fr_140px] gap-0 bg-light-grey/50 border-b border-royal-purple/20 text-royal-purple text-xs font-medium uppercase tracking-wide">
                  <div className="p-2 text-center">Move</div>
                  <div className="p-2">Column</div>
                  <div className="p-2">Type</div>
                </div>
                <div>
                  {columns.map((col) => (
                    <SortableRow key={col.id} id={col.id}>
                      <div className={`grid grid-cols-[48px_1fr_140px] items-center border-b border-royal-purple/10 ${isReordering ? "cursor-grabbing" : "cursor-default"}`}>
                        <div className="p-2 flex items-center justify-center text-grey select-none">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="p-1 rounded hover:bg-light-grey" aria-label={`Drag ${col.columnName} to reorder`}>
                                <GripVertical className="h-4 w-4" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>Drag to reorder</TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="p-3">
                          <div className="font-medium text-creative-midnight truncate" title={col.columnName}>
                            {col.columnName}
                          </div>
                          <div className="text-xs text-grey mt-0.5">ID: {col.id}</div>
                        </div>
                        <div className="p-3 text-sm text-grey">{col.dataType}</div>
                      </div>
                    </SortableRow>
                  ))}
                  {columns.length === 0 && (
                    <div className="p-6 text-center text-grey">No columns found.</div>
                  )}
                </div>
              </div>
            </SortableContext>
          </DndContext>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
