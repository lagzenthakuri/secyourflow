import type { Metadata } from "next";
import { FeaturesPage } from "@/modules/marketing/ui/FeaturesPage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Product features | SecYourFlow",
  description:
    "Explore SecYourFlow asset inventory, vulnerability management, CVE search, remediation plans, threat intelligence, and governance modules.",
};

export default function ProductFeaturesRoute() {
  return <FeaturesPage />;
}
