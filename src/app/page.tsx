import {
  JsonLd,
  type SoftwareApplication,
  type WithContext,
} from "@repo/seo/json-ld";
import { createMetadata } from "@repo/seo/metadata";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
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

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <>
      <JsonLd code={softwareApplication} />
      <LandingPage />
    </>
  );
}
