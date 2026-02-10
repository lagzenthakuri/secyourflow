"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LoadingBar } from "@/components/ui/LoadingBar";

export default function DashboardLoading() {
  return (
    <DashboardLayout>
      <LoadingBar isLoading={true} variant="cyber" position="top" height={4} />
      <div className="space-y-5 animate-pulse">
        {/* Hero Section Skeleton */}
        <div className="rounded-3xl border border-white/10 bg-[rgba(18,18,26,0.84)] p-6 sm:p-8">
          <div className="h-6 w-48 rounded-lg bg-white/10 mb-4" />
          <div className="h-8 w-64 rounded-lg bg-white/10 mb-3" />
          <div className="h-4 w-full max-w-2xl rounded-lg bg-white/10" />
        </div>

        {/* Metrics Grid Skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)] p-5">
              <div className="h-4 w-32 rounded bg-white/10 mb-4" />
              <div className="h-10 w-24 rounded bg-white/10 mb-2" />
              <div className="h-3 w-40 rounded bg-white/10" />
            </div>
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)] p-5">
            <div className="h-6 w-48 rounded bg-white/10 mb-4" />
            <div className="h-64 rounded-xl bg-white/5" />
          </div>
          <div className="rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)] p-5">
            <div className="h-6 w-48 rounded bg-white/10 mb-4" />
            <div className="h-64 rounded-xl bg-white/5" />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
