
"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { RiskRegisterTable } from "@/components/risk/RiskRegisterTable";
import { Shield } from "lucide-react";

export default function RiskRegisterPage() {
    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-blue-600/10 border border-blue-600/20">
                            <Shield className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Risk Register</h1>
                            <p className="text-[var(--text-secondary)] mt-1">
                                Comprehensive view of identified risks, impacts, and treatment plans.
                            </p>
                        </div>
                    </div>
                </div>

                <RiskRegisterTable />
            </div>
        </DashboardLayout>
    );
}
