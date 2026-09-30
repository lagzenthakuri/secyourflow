"use client";

import {
  ClipboardCheck,
  FileUp,
  Loader2,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ControlActionsProps {
  control: Record<string, unknown>;
  isDeleting?: boolean;
  onAssess: () => void;
  onDelete: () => void;
  onEvidence?: () => void;
}

export function ControlActions({
  control,
  onAssess,
  onEvidence,
  onDelete,
  isDeleting = false,
}: ControlActionsProps) {
  void control;
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
    <div
      className="relative inline-block"
      ref={dropdownRef}
      style={{ zIndex: 1000 }}
    >
      <button
        className={cn(
          "rounded-lg border p-2 transition-all duration-300 ease-in-out",
          isOpen
            ? "border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-primary)]"
            : "border-transparent bg-transparent text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
        )}
        disabled={isDeleting}
        onClick={handleToggle}
        type="button"
      >
        {isDeleting ? (
          <Loader2 className="animate-spin text-blue-500" size={16} />
        ) : (
          <MoreVertical size={16} />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-[1000] mt-2 w-56 overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] shadow-2xl">
          {isConfirming ? (
            <div className="bg-red-500/5 p-4">
              <p className="mb-2 font-bold text-[var(--text-primary)] text-sm">
                Delete Control?
              </p>
              <div className="flex flex-col gap-2">
                <button
                  className="w-full rounded-lg bg-red-500 py-2 font-bold text-white text-xs transition-all duration-300 ease-in-out hover:bg-red-600"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete();
                    setIsOpen(false);
                  }}
                  type="button"
                >
                  Confirm Delete
                </button>
                <button
                  className="w-full rounded-lg bg-[var(--bg-tertiary)] py-2 text-[var(--text-primary)] text-xs transition-all duration-300 ease-in-out"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsConfirming(false);
                  }}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1 p-1">
              <button
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left font-medium text-[var(--text-secondary)] text-sm transition-all duration-300 ease-in-out hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAssess();
                  setIsOpen(false);
                }}
                type="button"
              >
                <ClipboardCheck className="text-intent-accent" size={14} />
                Assess Control
              </button>
              {onEvidence ? (
                <button
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left font-medium text-[var(--text-secondary)] text-sm transition-all duration-300 ease-in-out hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onEvidence();
                    setIsOpen(false);
                  }}
                  type="button"
                >
                  <FileUp
                    className="text-emerald-600 dark:text-emerald-400"
                    size={14}
                  />
                  Manage Evidence
                </button>
              ) : null}
              <button
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left font-medium text-red-500 text-sm transition-all duration-300 ease-in-out hover:bg-red-500/10"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsConfirming(true);
                }}
                type="button"
              >
                <Trash2 size={14} />
                Delete Control
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
