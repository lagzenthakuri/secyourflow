import { Suspense } from "react";
import { CveSearchPageClient } from "@/modules/cve-search/ui/CveSearchPageClient";
import { ShieldLoader } from "@/components/ui/ShieldLoader";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function CvesPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <ShieldLoader size="lg" variant="cyber" />
        </div>
      </DashboardLayout>
    }>
      <CveSearchPageClient />
    </Suspense>
  );
}
