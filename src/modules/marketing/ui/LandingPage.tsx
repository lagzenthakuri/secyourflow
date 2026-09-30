import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Bug, ClipboardCheck, FileSearch, Network, Radio, ScanSearch } from "lucide-react";
import { Button } from "@repo/design-system/components/ui/button";
import { marketingFeatures } from "../data/features";
import { NebulaHeroBackground } from "./NebulaHeroBackground";
import { MarketingSiteShell } from "./MarketingShell";

const previewSections = [
  {
    label: "CVE search",
    detail: "Review public records, CVSS scores, products, and CISA KEV entries.",
    image: "/screenshots/cve-search-workspace.png",
    alt: "CVE search results with filters and a paginated CISA KEV table.",
    width: 1280,
    height: 670,
  },
  {
    label: "AI controls",
    detail: "Set human review and data-redaction rules for AI assistance.",
    image: "/screenshots/ai-assist-controls.png",
    alt: "AI Assist settings showing human review and data-redaction controls.",
    width: 1175,
    height: 430,
  },
  {
    label: "NIS2 governance",
    detail: "Track directive measures by coverage, owner, and implementation status.",
    image: "/screenshots/nis2-governance.png",
    alt: "NIS2 governance coverage and checklist controls.",
    width: 1655,
    height: 390,
  },
];

const featureIcons = [Network, Bug, FileSearch, ClipboardCheck, Radio, ScanSearch];

export function LandingPage() {
  return (
    <MarketingSiteShell landing>
      <section id="landing-hero" className="landing-hero relative isolate flex min-h-[min(820px,calc(100svh-4rem))] items-center overflow-hidden border-b border-border bg-[#09090b] px-4 py-16 text-white sm:px-6 lg:px-8">
        <NebulaHeroBackground />
        <div aria-hidden="true" className="landing-hero-scrim pointer-events-none absolute inset-0 z-0" />
        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center text-center">
          <div className="landing-hero-wordmark mb-8 flex items-center gap-3" aria-label="SecYourFlow">
            <Image src="/logo1.png" alt="" width={44} height={44} priority className="size-11" />
            <span className="text-sm font-semibold tracking-[0.2em] text-white">SECYOURFLOW</span>
          </div>
          <p className="landing-hero-eyebrow text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Cyber risk operations</p>
          <h1 className="mt-5 max-w-4xl text-balance font-serif text-4xl font-medium leading-[1.08] tracking-[-0.035em] sm:text-5xl lg:text-7xl">
            Security findings, assets, and follow-up in one workspace.
          </h1>
          <p className="landing-hero-description mt-6 max-w-2xl text-base leading-7 text-white/75 sm:text-lg sm:leading-8">
            Track assets, review vulnerability and CVE records, assign remediation work, and keep risk and compliance activity connected.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg"><Link href="/signup">Create a workspace<ArrowRight className="ml-2 size-4" /></Link></Button>
            <Button asChild variant="outline" size="lg" className="landing-hero-secondary border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white"><Link href="/features">Explore the features</Link></Button>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-muted/15 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
          <div>
            <p className="text-sm font-medium text-primary">Security overview</p>
            <h2 className="mt-2 font-serif text-3xl font-medium tracking-tight sm:text-4xl">Start with one view of exposure.</h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
              The dashboard brings asset totals, priority findings, known-exploited records, and risk breakdown into one place. Open a finding to continue into its asset and remediation context.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">Illustrative sample workspace and records.</p>
            <Link className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline" href="/features">
              Explore the workspace<ArrowRight className="size-4" />
            </Link>
          </div>
          <figure className="overflow-hidden rounded-2xl border border-border bg-[#0b0d10] p-2 shadow-xl shadow-black/10 sm:p-3">
            <Image
              src="/screenshots/dashboard-preview.png"
              alt="Illustrative SecYourFlow dashboard showing asset, remediation, and CISA KEV summary cards, priority findings, and a risk breakdown."
              width={705}
              height={829}
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="mx-auto h-auto max-h-[680px] w-full rounded-xl object-contain"
            />
            <figcaption className="px-2 pt-2 text-xs text-white/60">Dashboard · illustrative sample workspace</figcaption>
          </figure>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-primary">Explore the workspace</p>
              <h2 className="mt-2 font-serif text-3xl font-medium tracking-tight sm:text-4xl">See how each part works.</h2>
            </div>
            <Link className="inline-flex items-center gap-2 text-sm font-medium hover:text-primary" href="/features">All product features<ArrowRight className="size-4" /></Link>
          </div>
          <div className="grid gap-x-12 md:grid-cols-2">
            {marketingFeatures.map((feature, index) => {
              const Icon = featureIcons[index] ?? FileSearch;
              return (
                <article key={feature.slug} className="grid grid-cols-[2.5rem_1fr] gap-4 border-b border-border py-5">
                  <span className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted/40 text-primary"><Icon className="size-[18px]" /></span>
                  <div>
                    <h3 className="font-semibold">{feature.title}</h3>
                    <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{feature.summary}</p>
                    <Link className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline" href={`/features/${feature.slug}`}>See {feature.shortTitle.toLowerCase()}<ArrowUpRight className="size-3.5" /></Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-muted/20 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-primary">Product screens</p>
            <h2 className="mt-2 font-serif text-3xl font-medium tracking-tight sm:text-4xl">From inventory to action.</h2>
            <p className="mt-3 leading-7 text-muted-foreground">These are sections of the SecYourFlow workspace. Public CVE records shown in the search preview come from the supplied app screen.</p>
          </div>
          <div className="mt-7 grid gap-5 lg:grid-cols-3">
            {previewSections.map((section) => (
              <Link href={`/features/${section.label === "CVE search" ? "cve-search" : section.label === "AI controls" ? "ai-assistance" : "risk-compliance"}`} key={section.label} className="group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="flex min-h-52 items-center justify-center overflow-hidden bg-muted/20 p-3 sm:min-h-56">
                  <Image src={section.image} alt={section.alt} width={section.width} height={section.height} sizes="(max-width: 1024px) 100vw, 33vw" className="h-auto max-h-56 w-full object-contain transition-transform duration-300 group-hover:scale-[1.01]" />
                </div>
                <div className="border-t border-border px-4 py-3.5">
                  <h3 className="font-semibold">{section.label}</h3>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">{section.detail}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.6fr_1.4fr]">
          <div>
            <p className="text-sm font-medium text-primary">AI with review controls</p>
            <h2 className="mt-2 font-serif text-3xl font-medium tracking-tight sm:text-4xl">Assistance stays inside the workflow.</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <p className="text-sm leading-6 text-muted-foreground">When an asset is linked to a vulnerability, SecYourFlow can run an AI-assisted risk assessment. Risk Register Autofill can suggest fields from the threat and CIA impacts.</p>
            <p className="text-sm leading-6 text-muted-foreground">Teams can require human review before AI-generated content is accepted. Data-redaction settings let administrators control what context is sent for analysis.</p>
            <figure className="overflow-hidden rounded-lg border border-border bg-card sm:col-span-2">
              <Image src="/screenshots/ai-assist-controls.png" alt="SecYourFlow AI Assist settings showing a master switch, risk register autofill, human review, and data redaction controls." width={1175} height={430} sizes="(max-width: 640px) 100vw, 70vw" className="h-auto w-full" />
              <figcaption className="border-t border-border px-3 py-2 text-xs text-muted-foreground">AI controls shown in workspace settings</figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="border-t border-border px-4 py-9 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Use the product screens above to see how SecYourFlow organizes the work.</p>
          <div className="flex gap-2">
            <Button asChild><Link href="/signup">Create workspace<ArrowRight className="ml-2 size-4" /></Link></Button>
            <Button asChild variant="outline"><Link href="/login">Sign in</Link></Button>
          </div>
        </div>
      </section>
    </MarketingSiteShell>
  );
}
