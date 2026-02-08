import { Suspense } from "react";
import { CveSearchPageClient } from "@/modules/cve-search/ui/CveSearchPageClient";

export default function CvesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-[var(--text-secondary)]">Loading CVE search...</div>}>
      <CveSearchPageClient />
    </Suspense>
  );
}
