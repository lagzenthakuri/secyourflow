"use client";

import { GripVertical, Plus, X } from "lucide-react";

import { useMemo, useState } from "react";
import { formatLabel } from "@/lib/utils";

interface WidgetBuilderProps {
  availableWidgets: string[];
  onChange: (next: string[]) => void;
  value: string[];
}

export function WidgetBuilder({
  availableWidgets,
  value,
  onChange,
}: WidgetBuilderProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const candidateWidgets = useMemo(
    () => availableWidgets.filter((widget) => !value.includes(widget)),
    [availableWidgets, value]
  );

  const moveWidget = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) {
      return;
    }
    const clone = [...value];
    const [item] = clone.splice(fromIndex, 1);
    clone.splice(toIndex, 0, item);
    onChange(clone);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-3">
        <p className="text-[var(--text-muted)] text-xs">
          Drag to reorder dashboard widgets.
        </p>
        <div className="mt-2 space-y-2">
          {value.map((widget, index) => (
            <div
              className="flex items-center justify-between rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-[var(--text-secondary)] text-sm"
              draggable
              key={widget}
              onDragEnd={() => setDraggingId(null)}
              onDragOver={(event) => event.preventDefault()}
              onDragStart={() => setDraggingId(widget)}
              onDrop={() => {
                if (!draggingId) {
                  return;
                }
                const from = value.indexOf(draggingId);
                const to = index;
                if (from >= 0) {
                  moveWidget(from, to);
                }
              }}
            >
              <span className="inline-flex items-center gap-2">
                <GripVertical className="text-[var(--text-muted)]" size={14} />
                {formatLabel(widget)}
              </span>
              <button
                className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition hover:bg-[var(--bg-elevated)]"
                onClick={() =>
                  onChange(value.filter((item) => item !== widget))
                }
                type="button"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {value.length === 0 ? (
            <p className="rounded-lg border border-[var(--border-hover)] border-dashed p-3 text-[var(--text-muted)] text-xs">
              Add at least one widget to save this view.
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[var(--text-muted)] text-xs">
          Available widgets
        </p>
        <div className="flex flex-wrap gap-2">
          {candidateWidgets.map((widget) => (
            <button
              className="inline-flex items-center gap-1 rounded-md border border-[var(--border-hover)] bg-[var(--bg-tertiary)] px-2.5 py-1.5 text-[var(--text-secondary)] text-xs transition hover:bg-[var(--bg-elevated)]"
              key={widget}
              onClick={() => onChange([...value, widget])}
              type="button"
            >
              <Plus size={12} />
              {formatLabel(widget)}
            </button>
          ))}
          {candidateWidgets.length === 0 ? (
            <span className="text-[var(--text-muted)] text-xs">
              All widgets are already in this view.
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
