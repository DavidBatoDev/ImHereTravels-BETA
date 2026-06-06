"use client";

/**
 * Reusable drag-and-drop sorting primitives for the tour form, built on
 * @dnd-kit. Designed so each section keeps its own markup/layout: `SortableItem`
 * uses a render-prop to hand back `setNodeRef`/`style` (applied to the existing
 * root element) plus `handle` props for a dedicated drag handle — dragging is
 * handle-only so the inline text editors inside each row stay clickable.
 */

import React from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  rectSortingStrategy,
  type SortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

export {
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  rectSortingStrategy,
};

export function SortableList({
  ids,
  onReorder,
  strategy = verticalListSortingStrategy,
  children,
}: {
  ids: string[];
  onReorder: (from: number, to: number) => void;
  strategy?: SortingStrategy;
  children: React.ReactNode;
}) {
  const sensors = useSensors(
    // 4px activation distance so clicking into the inline inputs / buttons
    // never accidentally starts a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from === -1 || to === -1) return;
    onReorder(from, to);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={strategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

type HandleProps = {
  ref: (el: HTMLElement | null) => void;
  [key: string]: unknown;
};

export function SortableItem({
  id,
  children,
}: {
  id: string;
  children: (args: {
    setNodeRef: (el: HTMLElement | null) => void;
    style: React.CSSProperties;
    handle: HandleProps;
    isDragging: boolean;
  }) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
    position: isDragging ? "relative" : undefined,
  };

  const handle: HandleProps = { ref: setActivatorNodeRef, ...attributes, ...listeners };

  return <>{children({ setNodeRef, style, handle, isDragging })}</>;
}

/** Grip button that carries the drag listeners. Spread the `handle` from SortableItem. */
export function DragHandle({
  handle,
  className = "",
}: {
  handle: HandleProps;
  className?: string;
}) {
  const { ref, ...rest } = handle;
  return (
    <button
      type="button"
      ref={ref}
      aria-label="Drag to reorder"
      className={`cursor-grab touch-none text-dark-gray/40 hover:text-midnight transition-colors active:cursor-grabbing ${className}`}
      {...rest}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
}
