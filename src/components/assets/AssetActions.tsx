"use client";

import { Edit2, Loader2, MoreVertical, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { Asset } from "@/types";

interface AssetActionsProps {
  asset: Asset;
  isDeleting?: boolean;
  onDelete: () => void;
  onEdit: () => void;
}

export function AssetActions({
  asset,
  onEdit,
  onDelete,
  isDeleting = false,
}: AssetActionsProps) {
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

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsConfirming(true);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsConfirming(false);
  };

  const handleFinalDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete();
    setIsOpen(false);
    setIsConfirming(false);
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
        title="Asset Actions"
        type="button"
      >
        {isDeleting ? (
          <Loader2 className="animate-spin text-blue-500" size={18} />
        ) : (
          <MoreVertical size={18} />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-[1000] mt-2 w-64 overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
          {isConfirming ? (
            <div className="border-red-500/50 border-t-2 bg-red-500/5 p-4">
              <p className="mb-2 font-bold text-[var(--text-primary)] text-sm">
                Confirm Deletion
              </p>
              <p className="mb-4 text-[var(--text-muted)] text-xs">
                This will permanently remove &quot;{asset.name}&quot;.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  className="w-full rounded-lg bg-red-500 py-2.5 font-bold text-white text-xs transition-all duration-300 ease-in-out hover:bg-red-600"
                  onClick={handleFinalDelete}
                  type="button"
                >
                  Yes, Delete Asset
                </button>
                <button
                  className="w-full rounded-lg bg-[var(--bg-tertiary)] py-2 text-[var(--text-primary)] text-xs transition-all duration-300 ease-in-out hover:bg-[var(--bg-secondary)]"
                  onClick={handleCancelDelete}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1 p-1">
              <button
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left font-medium text-[var(--text-secondary)] text-sm transition-all duration-300 ease-in-out hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit();
                  setIsOpen(false);
                }}
                type="button"
              >
                <Edit2 className="text-intent-accent" size={14} />
                Edit Asset
              </button>
              <button
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left font-medium text-intent-danger text-sm transition-all duration-300 ease-in-out hover:bg-red-500/10"
                onClick={handleDeleteClick}
                type="button"
              >
                <Trash2 size={14} />
                Delete Asset
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
