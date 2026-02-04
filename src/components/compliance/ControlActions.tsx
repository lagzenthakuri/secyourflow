"use client";

import { useState, useRef, useEffect } from "react";
import { MoreVertical, Edit2, Trash2, ClipboardCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ControlActionsProps {
    control: any;
    onAssess: () => void;
    onDelete: () => void;
    isDeleting?: boolean;
}

export function ControlActions({ 
    control, 
    onAssess, 
    onDelete,
    isDeleting = false
}: ControlActionsProps) {
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
            >
                {isDeleting ? (
                    <Loader2 size={16} className="animate-spin text-blue-500" />
                ) : (
                    <MoreVertical size={16} />
                )}
            </button>

            {isOpen && (
                <div 
                    className="absolute right-0 mt-2 w-56 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] shadow-2xl z-[1000] overflow-hidden"
                >
                    {!isConfirming ? (
                        <div className="p-1 space-y-1">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onAssess();
                                    setIsOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left"
                            >
                                <ClipboardCheck size={14} className="text-blue-400" />
                                Assess Control
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setIsConfirming(true);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-colors text-left"
                            >
                                <Trash2 size={14} />
                                Delete Control
                            </button>
                        </div>
                    ) : (
                        <div className="p-4 bg-red-500/5">
                            <p className="text-sm font-bold text-white mb-2">Delete Control?</p>
                            <div className="flex flex-col gap-2">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onDelete();
                                        setIsOpen(false);
                                    }}
                                    className="w-full py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-colors"
                                >
                                    Confirm Delete
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setIsConfirming(false);
                                    }}
                                    className="w-full py-2 bg-[var(--bg-tertiary)] text-white rounded-lg text-xs transition-colors"
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
