"use client";

import { useState, useRef, useEffect } from "react";
import { Settings, Edit2, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FrameworkActionsProps {
    framework: Record<string, unknown>;
    onEdit: () => void;
    onDelete: () => void;
    isDeleting?: boolean;
}

export function FrameworkActions({ 
    framework, 
    onEdit, 
    onDelete,
    isDeleting = false
}: FrameworkActionsProps) {
    void framework;
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
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={handleToggle}
                className={cn(
                    "p-1.5 rounded-lg transition-all duration-300 ease-in-out border bg-[var(--bg-tertiary)] border-[var(--border-color)]",
                    isOpen 
                        ? "text-white border-blue-500/50" 
                        : "text-[var(--text-muted)] hover:text-white"
                )}
                disabled={isDeleting}
            >
                {isDeleting ? (
                    <Loader2 size={14} className="animate-spin text-blue-400" />
                ) : (
                    <Settings size={14} />
                )}
            </button>

            {isOpen && (
                <div 
                    className="absolute right-0 mt-2 w-48 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] shadow-2xl z-[50] overflow-hidden"
                >
                    {!isConfirming ? (
                        <div className="p-1">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onEdit();
                                    setIsOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-white hover:bg-white/5 rounded-lg transition-all duration-300 ease-in-out text-left"
                            >
                                <Edit2 size={12} />
                                Edit Basic Info
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setIsConfirming(true);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-all duration-300 ease-in-out text-left"
                            >
                                <Trash2 size={12} />
                                Delete Framework
                            </button>
                        </div>
                    ) : (
                        <div className="p-3 bg-red-500/5">
                            <p className="text-xs font-bold text-white mb-2">Delete Framework?</p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onDelete();
                                        setIsOpen(false);
                                    }}
                                    className="flex-1 py-1.5 bg-red-500 text-white rounded-lg text-[10px] font-bold"
                                >
                                    Delete
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setIsConfirming(false);
                                    }}
                                    className="flex-1 py-1.5 bg-[var(--bg-tertiary)] text-white rounded-lg text-[10px]"
                                >
                                    No
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
