import { CveDetailPageClient } from "@/modules/cve-search/ui/CveDetailPageClient";

interface CveDetailPageProps {
  params: Promise<{ cveId: string }>;
}

export default async function CveDetailPage({ params }: CveDetailPageProps) {
  const { cveId } = await params;
  return <CveDetailPageClient cveId={cveId.toUpperCase()} />;
}
