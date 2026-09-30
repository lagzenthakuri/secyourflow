import type { Metadata } from "next";
import { createMetadata } from "@repo/seo/metadata";
import { HealthDashboard } from "./HealthDashboard";

export const metadata = createMetadata({
  title: "Health | SecYourFlow",
  description: "Page optimization details, performance graphs, and rendering metrics.",
});

export default function HealthPage() {
  return <HealthDashboard />;
}
