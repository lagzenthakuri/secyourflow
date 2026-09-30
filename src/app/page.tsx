import { createMetadata } from "@repo/seo/metadata";
import { JsonLd, type SoftwareApplication, type WithContext } from "@repo/seo/json-ld";
import { LandingPage } from "@/modules/marketing/ui/LandingPage";

export const dynamic = "force-dynamic";

export const metadata = createMetadata({
  title: "Security findings to accountable response",
  description:
    "Track assets and vulnerabilities, review CVE and CISA KEV context, and coordinate remediation and compliance work in SecYourFlow.",
  keywords: [
    "cyber risk operations",
    "asset inventory",
    "vulnerability management",
    "CVE search",
    "CISA KEV",
    "remediation tracking",
    "security compliance",
  ],
});

const softwareApplication: WithContext<SoftwareApplication> = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "SecYourFlow",
  applicationCategory: "SecurityApplication",
  operatingSystem: "Web",
  description:
    "A security operations workspace for asset inventory, vulnerability triage, remediation tracking, and governance workflows.",
};

export default function Home() {
  return (
    <>
      <JsonLd code={softwareApplication} />
      <LandingPage />
    </>
  );
}
