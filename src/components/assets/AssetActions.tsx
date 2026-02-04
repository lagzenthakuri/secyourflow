"use client";

import { useState, useRef, useEffect } from "react";
import { MoreVertical, Edit2, Trash2, Loader2 } from "lucide-react";
import { Asset } from "@/types";
import { cn } from "@/lib/utils";

interface AssetActionsProps {
    asset: Asset;
    onEdit: () => void;
    onDelete: () => void;
    isDeleting?: boolean;
}

export function AssetActions({ 
    asset, 
    onEdit, 
    onDelete,
    isDeleting = false
}: AssetActionsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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
        if (isOpen) setIsConfirming(false);
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
        <div className="relative inline-block" ref={dropdownRef} style={{ zIndex: 1000 }}>
            <button
                type="button"
                onClick={handleToggle}
                className={cn(
                    "p-2 rounded-lg transition-colors border",
                    isOpen 
                        ? "bg-[var(--bg-elevated)] text-white border-[var(--border-color)]" 
                        : "bg-transparent text-[var(--text-muted)] border-transparent hover:bg-[var(--bg-tertiary)] hover:text-white"
                )}
                disabled={isDeleting}
                title="Asset Actions"
            >
                {isDeleting ? (
                    <Loader2 size={18} className="animate-spin text-blue-500" />
                ) : (
                    <MoreVertical size={18} />
                )}
            </button>

            {isOpen && (
                <div 
                    className="absolute right-0 mt-2 w-64 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[1000] overflow-hidden"
                >
                    {!isConfirming ? (
                        <div className="p-1 space-y-1">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onEdit();
                                    setIsOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-3 text-sm font-medium text-[var(--text-secondary)] hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left"
                            >
                                <Edit2 size={14} className="text-blue-400" />
                                Edit Asset
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteClick}
                                className="w-full flex items-center gap-3 px-3 py-3 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-left"
                            >
                                <Trash2 size={14} />
                                Delete Asset
                            </button>
                        </div>
                    ) : (
                        <div className="p-4 bg-red-500/5 border-t-2 border-red-500/50">
                            <p className="text-sm font-bold text-white mb-2">
                                Confirm Deletion
                            </p>
                            <p className="text-xs text-[var(--text-muted)] mb-4">
                                This will permanently remove "{asset.name}".
                            </p>
                            <div className="flex flex-col gap-2">
                                <button
                                    type="button"
                                    onClick={handleFinalDelete}
                                    className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-colors"
                                >
                                    Yes, Delete Asset
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCancelDelete}
                                    className="w-full py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] text-white rounded-lg text-xs transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
