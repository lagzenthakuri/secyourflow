import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingSiteShell } from "@/modules/marketing/ui/MarketingShell";

export const metadata: Metadata = {
  title: "About SecYourFlow",
  description: "SecYourFlow is a cyber risk operations workspace from Shyena Technologies Pvt. Ltd.",
};

export default function AboutPage() {
  return (
    <MarketingSiteShell>
      <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <p className="text-sm font-medium text-primary">About the product</p>
        <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight sm:text-5xl">SecYourFlow</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
          SecYourFlow is a cyber risk operations platform from Shyena Technologies Pvt. Ltd. It brings asset inventory, vulnerability findings, public CVE context, remediation plans, risk records, and compliance work into one organization workspace.
        </p>
        <div className="mt-9 grid gap-5 border-y border-border py-6 sm:grid-cols-2">
          <section><h2 className="font-semibold">For security operations</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Connect findings to affected assets, assign owners, track workflow state, and record remediation evidence.</p></section>
          <section><h2 className="font-semibold">For governance work</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Maintain risk and appetite records, policies, framework controls, and NIS2 checklist status.</p></section>
        </div>
        <Link href="/features" className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">Explore product features<ArrowRight className="size-4" /></Link>
      </article>
    </MarketingSiteShell>
  );
}
