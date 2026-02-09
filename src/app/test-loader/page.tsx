"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ShieldLoader } from "@/components/ui/ShieldLoader";

export default function TestLoaderPage() {
  const [variant, setVariant] = useState<"cyber" | "primary">("cyber");
  const [size, setSize] = useState<"sm" | "md" | "lg" | "xl">("xl");

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <section className="rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)] p-6">
          <h1 className="text-2xl font-semibold text-white mb-4">Shield Loader Test</h1>
          
          <div className="flex gap-4 mb-6">
            <div>
              <label className="block text-sm text-slate-300 mb-2">Variant</label>
              <select
                value={variant}
                onChange={(e) => setVariant(e.target.value as "cyber" | "primary")}
                className="input"
              >
                <option value="cyber">Cyber</option>
                <option value="primary">Primary</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-slate-300 mb-2">Size</label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value as "sm" | "md" | "lg" | "xl")}
                className="input"
              >
                <option value="sm">Small</option>
                <option value="md">Medium</option>
                <option value="lg">Large</option>
                <option value="xl">Extra Large</option>
              </select>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)] p-12">
          <div className="flex min-h-[400px] items-center justify-center">
            <ShieldLoader
              size={size}
              variant={variant}
              text="Analyzing live threat intelligence..."
            />
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)] p-6">
          <h2 className="text-lg font-semibold text-white mb-4">All Variants</h2>
          <div className="grid grid-cols-2 gap-8">
            <div className="flex flex-col items-center gap-4">
              <ShieldLoader size="md" variant="cyber" />
              <span className="text-sm text-slate-300">Cyber</span>
            </div>
            <div className="flex flex-col items-center gap-4">
              <ShieldLoader size="md" variant="primary" />
              <span className="text-sm text-slate-300">Primary</span>
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
