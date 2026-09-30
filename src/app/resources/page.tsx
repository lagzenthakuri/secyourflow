import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { marketingFeatures } from "@/modules/marketing/data/features";
import { MarketingSiteShell } from "@/modules/marketing/ui/MarketingShell";

export const metadata: Metadata = {
  title: "Product guide | SecYourFlow",
  description: "Browse concise guides to SecYourFlow workflows.",
};

export default function ResourcesPage() {
  return (
    <MarketingSiteShell>
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <p className="text-sm font-medium text-primary">Product guide</p>
        <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight sm:text-5xl">Start with the workflow you need.</h1>
        <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">Each guide explains what the module records and how teams use it. Workspace pages require an account.</p>
        <div className="mt-8 divide-y divide-border border-y border-border">
          {marketingFeatures.map((feature) => <Link href={`/features/${feature.slug}`} className="group flex items-center justify-between gap-6 py-5" key={feature.slug}>
            <div><h2 className="font-semibold group-hover:text-primary">{feature.title}</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{feature.summary}</p></div>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
          </Link>)}
        </div>
      </section>
    </MarketingSiteShell>
  );
}
