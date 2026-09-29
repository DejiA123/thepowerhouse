import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DragHandleProps = HTMLAttributes<HTMLButtonElement>;

/** The grip to drag a row by (the rest of the row stays tappable and scrollable). */
export const DragHandle = ({ label, ...props }: DragHandleProps & { label: string }) => (
  <button
    type="button"
    aria-label={label}
    {...props}
    className="-ml-1 flex h-10 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-slate-400 active:cursor-grabbing active:bg-slate-100 dark:active:bg-slate-800"
  >
    <GripVertical className="h-5 w-5" />
  </button>
);

const SortableRow = ({ id, children }: { id: string; children: (handle: DragHandleProps, dragging: boolean) => ReactNode }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    position: 'relative',
    zIndex: isDragging ? 20 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && 'rounded-2xl shadow-xl ring-1 ring-slate-200 dark:ring-slate-700')}>
      {children({ ...attributes, ...listeners } as DragHandleProps, isDragging)}
    </div>
  );
};

/** A vertical list that can be put in any order by dragging each row's grip. */
export function SortableList({
  ids,
  onReorder,
  children,
  className,
}: {
  ids: string[];
  onReorder: (ids: string[]) => void;
  children: (id: string, handle: DragHandleProps, dragging: boolean) => ReactNode;
  className?: string;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    if ('vibrate' in navigator) navigator.vibrate?.(8);
    onReorder(arrayMove(ids, from, to));
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className={className}>
          {ids.map((id) => (
            <SortableRow key={id} id={id}>
              {(handle, dragging) => children(id, handle, dragging)}
            </SortableRow>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
