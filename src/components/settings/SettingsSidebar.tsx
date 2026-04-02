"use client";

import { LucideIcon, Search, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SettingsSectionId, SettingsSectionItem } from "./types";

interface SettingsSidebarProps {
    sections: SettingsSectionItem[];
    activeSection: SettingsSectionId;
    setActiveSection: (id: SettingsSectionId) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
}

export function SettingsSidebar({
    sections,
    activeSection,
    setActiveSection,
    searchQuery,
    setSearchQuery,
}: SettingsSidebarProps) {
    return (
        <aside className="w-full lg:w-72 xl:w-80 shrink-0">
            <div className="sticky top-6 space-y-4">
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2.5 border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] text-sm transition-all focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none placeholder:text-muted-foreground"
                        placeholder="Search settings..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <nav className="flex flex-col gap-1">
                    {sections.map((section, index) => {
                        const isActive = activeSection === section.id;
                        return (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id)}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all group animate-in fade-in slide-in-from-left-4 duration-300",
                                    isActive
                                        ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 shadow-sm"
                                        : "hover:bg-[var(--bg-elevated)] text-muted-foreground hover:text-foreground border border-transparent"
                                )}
                                style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
                            >
                                <div className={cn(
                                    "p-1.5 rounded-lg transition-colors duration-300",
                                    isActive ? "bg-sky-500/20 text-sky-600 dark:text-sky-400" : "bg-[var(--bg-tertiary)] text-muted-foreground group-hover:text-foreground"
                                )}>
                                    <section.icon size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold truncate">{section.label}</span>
                                        {section.mainOfficerOnly && (
                                            <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-md font-bold uppercase border border-amber-500/20">
                                                Officer
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground truncate group-hover:text-foreground/70">{section.description}</p>
                                </div>
                                {!isActive && !section.mainOfficerOnly && (
                                    <ChevronRight size={14} className="text-muted-foreground/30 transition-transform group-hover:translate-x-0.5" />
                                )}
                            </button>
                        );
                    })}
                    {sections.length === 0 && (
                        <div className="p-8 text-center border-2 border-dashed border-[var(--border-color)] rounded-2xl">
                           <p className="text-sm text-muted-foreground">No matches found</p>
                        </div>
                    )}
                </nav>
            </div>
        </aside>
    );
}
