"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { User, Save, Bell, Shield, Lock } from "lucide-react";
import { SettingsCard, FormField, SectionHeader } from "./common";
import { cn } from "@/lib/utils";

export function ProfileSection({ setToast }: { setToast: any }) {
    const { data: session, update } = useSession();
    const [name, setName] = useState(session?.user?.name || "");
    const [isSaving, setIsSaving] = useState(false);

    const handleSaveProfile = async () => {
        if (!name.trim()) return;
        try {
            setIsSaving(true);
            const res = await fetch("/api/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            });
            if (res.ok) {
                await update({ name });
                setToast({ message: "Profile updated successfully!", type: "success" });
            } else {
                const data = await res.json();
                setToast({ message: data.error || "Failed to update profile", type: "error" });
            }
        } catch (e) {
            setToast({ message: "Failed to update profile", type: "error" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <SectionHeader 
                title="Personal Account" 
                subtitle="Manage your identity and preferences"
                badge={session?.user?.role || "USER"}
            />
            
            <SettingsCard>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="md:col-span-1 flex flex-col items-center gap-4 py-4">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-full bg-sky-500/10 border-2 border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400 overflow-hidden transform group-hover:scale-[1.02] transition-all duration-300">
                                {session?.user?.image ? (
                                    <img src={session.user.image} alt={session.user.name || "User"} className="w-full h-full object-cover" />
                                ) : (
                                    <User size={40} className="group-hover:scale-110 transition-transform duration-300" />
                                )}
                            </div>
                            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                                <span className="text-[10px] text-white font-bold uppercase tracking-widest">Update</span>
                            </div>
                        </div>
                        <div className="text-center">
                            <h4 className="text-sm font-bold text-[var(--text-primary)]">{session?.user?.name}</h4>
                            <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
                        </div>
                    </div>

                    <div className="md:col-span-3 space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField label="Full Name" description="Used for audits and internal display">
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] text-sm transition-all focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                                    placeholder="Enter your name"
                                />
                            </FormField>
                            
                            <FormField label="Email Address" description="Primary contact and login identifier">
                                <div className="relative w-full">
                                    <input
                                        type="email"
                                        value={session?.user?.email || ""}
                                        className="w-full pl-3 pr-10 py-2 border border-[var(--border-color)] rounded-xl bg-[var(--bg-tertiary)] text-sm text-muted-foreground cursor-not-allowed italic"
                                        disabled
                                    />
                                    <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                                </div>
                            </FormField>
                        </div>

                        <div className="flex items-center gap-3 pt-6 border-t border-[var(--border-color)]">
                            <button
                                onClick={handleSaveProfile}
                                disabled={isSaving || name === session?.user?.name}
                                className={cn(
                                    "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
                                    name === session?.user?.name 
                                        ? "bg-[var(--bg-tertiary)] text-muted-foreground border border-[var(--border-color)]"
                                        : "bg-sky-600 text-white hover:bg-sky-500 hover:shadow-lg hover:shadow-sky-500/20"
                                )}
                            >
                                <Save size={16} />
                                {isSaving ? "Saving..." : "Update Profile"}
                            </button>
                            {name !== session?.user?.name && (
                                <button 
                                    onClick={() => setName(session?.user?.name || "")}
                                    className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </SettingsCard>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 group hover:border-amber-500/40 transition-all duration-300 cursor-pointer">
                    <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500/20 group-hover:scale-105 transition-all">
                            <Shield size={18} />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-amber-900 dark:text-amber-400">Security Credentials</h4>
                            <p className="text-[11px] text-amber-700/70 dark:text-amber-400/70 mt-0.5">Manage passwords and 2FA keys</p>
                        </div>
                    </div>
                </div>
                
                <div className="p-4 rounded-2xl bg-sky-500/5 border border-sky-500/20 group hover:border-sky-500/40 transition-all duration-300 cursor-pointer">
                    <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 group-hover:bg-sky-500/20 group-hover:scale-105 transition-all">
                            <Bell size={18} />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-sky-900 dark:text-sky-400">Personal Notifications</h4>
                            <p className="text-[11px] text-sky-700/70 dark:text-sky-400/70 mt-0.5">Custom triggers and digest settings</p>
                        </div>
                    </div>
                </div>

                <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 group hover:border-purple-500/40 transition-all duration-300 cursor-pointer">
                    <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:bg-purple-500/20 group-hover:scale-105 transition-all">
                            <Lock size={18} />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-purple-900 dark:text-purple-400">Session Management</h4>
                            <p className="text-[11px] text-purple-700/70 dark:text-purple-400/70 mt-0.5">View active logins and devices</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
