"use client";

import { useMemo, useState } from "react";
import { GripVertical, Plus, X } from "lucide-react";

interface WidgetBuilderProps {
  availableWidgets: string[];
  value: string[];
  onChange: (next: string[]) => void;
}

function formatLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function WidgetBuilder({ availableWidgets, value, onChange }: WidgetBuilderProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const candidateWidgets = useMemo(
    () => availableWidgets.filter((widget) => !value.includes(widget)),
    [availableWidgets, value],
  );

  const moveWidget = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const clone = [...value];
    const [item] = clone.splice(fromIndex, 1);
    clone.splice(toIndex, 0, item);
    onChange(clone);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <p className="text-xs text-slate-400">Drag to reorder dashboard widgets.</p>
        <div className="mt-2 space-y-2">
          {value.map((widget, index) => (
            <div
              key={widget}
              draggable
              onDragStart={() => setDraggingId(widget)}
              onDragEnd={() => setDraggingId(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (!draggingId) return;
                const from = value.indexOf(draggingId);
                const to = index;
                if (from >= 0) {
                  moveWidget(from, to);
                }
              }}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-200"
            >
              <span className="inline-flex items-center gap-2">
                <GripVertical size={14} className="text-slate-500" />
                {formatLabel(widget)}
              </span>
              <button
                type="button"
                onClick={() => onChange(value.filter((item) => item !== widget))}
                className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-slate-300 transition hover:bg-white/[0.08]"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {value.length === 0 ? (
            <p className="rounded-lg border border-dashed border-white/15 p-3 text-xs text-slate-400">
              Add at least one widget to save this view.
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs text-slate-400">Available widgets</p>
        <div className="flex flex-wrap gap-2">
          {candidateWidgets.map((widget) => (
            <button
              key={widget}
              type="button"
              onClick={() => onChange([...value, widget])}
              className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/[0.03] px-2.5 py-1.5 text-xs text-slate-200 transition hover:bg-white/[0.08]"
            >
              <Plus size={12} />
              {formatLabel(widget)}
            </button>
          ))}
          {candidateWidgets.length === 0 ? (
            <span className="text-xs text-slate-500">All widgets are already in this view.</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
