import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Button } from "@repo/design-system/components/ui/button";
import { marketingFeatures } from "../data/features";
import { MarketingSiteShell } from "./MarketingShell";
import { getWorkspaceAccess } from "./workspace-access";

export function FeaturesPage() {
  const workspaceAccess = getWorkspaceAccess();
  return (
    <MarketingSiteShell>
      <section className="border-b border-border bg-muted/20 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-medium text-primary">Product features</p>
          <h1 className="mt-3 max-w-3xl font-serif text-4xl font-medium leading-tight tracking-tight text-balance sm:text-5xl">Explore the work SecYourFlow supports.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">Each page explains a workflow and shows a focused section of the application. {workspaceAccess.description}</p>
        </div>
      </section>

      <section aria-label="Feature pages" className="px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="mx-auto max-w-7xl divide-y divide-border border-y border-border">
          {marketingFeatures.map((feature, index) => (
            <article key={feature.slug} className="grid gap-5 py-7 md:grid-cols-[minmax(13rem,0.7fr)_minmax(0,1fr)] md:items-center md:gap-10">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{String(index + 1).padStart(2, "0")}</p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight">{feature.title}</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{feature.summary}</p>
                <Link href={`/features/${feature.slug}`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">Explore {feature.shortTitle.toLowerCase()}<ArrowUpRight className="size-4" /></Link>
              </div>
              <Link href={`/features/${feature.slug}`} className="group block overflow-hidden rounded-lg border border-border bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="flex min-h-36 items-center justify-center overflow-hidden bg-muted/20 p-3 sm:min-h-40 sm:p-4">
                  <Image src={feature.screenshots[0].src} alt={feature.screenshots[0].alt} width={feature.screenshots[0].width} height={feature.screenshots[0].height} sizes="(max-width: 768px) 100vw, 65vw" className="h-auto max-h-64 w-full object-contain transition-transform duration-300 group-hover:scale-[1.01]" />
                </div>
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-border px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-lg font-semibold">Ready to use the workspace?</h2><p className="mt-1 text-sm text-muted-foreground">{workspaceAccess.description}</p></div>
          <div className="flex gap-2"><Button asChild><Link href={workspaceAccess.href}>{workspaceAccess.label}<ArrowRight className="ml-2 size-4" /></Link></Button><Button asChild variant="outline"><Link href="/login">Sign in</Link></Button></div>
        </div>
      </section>
    </MarketingSiteShell>
  );
}
