import { Suspense } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ShieldLoader } from "@/components/ui/ShieldLoader";
import { CveSearchPageClient } from "@/modules/cve-search/ui/CveSearchPageClient";

export default function CvesPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="flex min-h-[60vh] items-center justify-center">
            <ShieldLoader size="lg" variant="cyber" />
          </div>
        </DashboardLayout>
      }
    >
      <CveSearchPageClient />
    </Suspense>
  );
}
