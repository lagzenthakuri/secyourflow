"use client";

import { Edit2, Loader2, Settings, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface FrameworkActionsProps {
  framework: Record<string, unknown>;
  isDeleting?: boolean;
  onDelete: () => void;
  onEdit: () => void;
}

export function FrameworkActions({
  framework,
  onEdit,
  onDelete,
  isDeleting = false,
}: FrameworkActionsProps) {
  void framework;
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setIsConfirming(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
    if (isOpen) {
      setIsConfirming(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className={cn(
          "rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-1.5 transition-all duration-300 ease-in-out",
          isOpen
            ? "border-blue-500/50 text-[var(--text-primary)]"
            : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        )}
        disabled={isDeleting}
        onClick={handleToggle}
        type="button"
      >
        {isDeleting ? (
          <Loader2 className="animate-spin text-intent-accent" size={14} />
        ) : (
          <Settings size={14} />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-[50] mt-2 w-48 overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] shadow-2xl">
          {isConfirming ? (
            <div className="bg-red-500/5 p-3">
              <p className="mb-2 font-bold text-[var(--text-primary)] text-xs">
                Delete Framework?
              </p>
              <div className="flex gap-2">
                <button
                  className="flex-1 rounded-lg bg-red-500 py-1.5 font-bold text-[10px] text-white"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete();
                    setIsOpen(false);
                  }}
                  type="button"
                >
                  Delete
                </button>
                <button
                  className="flex-1 rounded-lg bg-[var(--bg-tertiary)] py-1.5 text-[10px] text-[var(--text-primary)]"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsConfirming(false);
                  }}
                  type="button"
                >
                  No
                </button>
              </div>
            </div>
          ) : (
            <div className="p-1">
              <button
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left font-medium text-[var(--text-secondary)] text-sm transition-all duration-300 ease-in-out hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit();
                  setIsOpen(false);
                }}
                type="button"
              >
                <Edit2 size={12} />
                Edit Basic Info
              </button>
              <button
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left font-medium text-red-500 text-sm transition-all duration-300 ease-in-out hover:bg-red-500/10"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsConfirming(true);
                }}
                type="button"
              >
                <Trash2 size={12} />
                Delete Framework
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
