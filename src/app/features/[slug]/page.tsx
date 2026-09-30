import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@repo/design-system/components/ui/button";
import { getMarketingFeature } from "@/modules/marketing/data/features";
import { MarketingSiteShell } from "@/modules/marketing/ui/MarketingShell";
import { getWorkspaceAccess } from "@/modules/marketing/ui/workspace-access";

type FeaturePageProps = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: FeaturePageProps): Promise<Metadata> {
  const { slug } = await params;
  const feature = getMarketingFeature(slug);
  if (!feature) return {};
  return {
    title: `${feature.title} | SecYourFlow`,
    description: feature.summary,
  };
}

export default async function FeatureDetailPage({ params }: FeaturePageProps) {
  const { slug } = await params;
  const feature = getMarketingFeature(slug);
  if (!feature) notFound();

  const related = feature.related
    .map((relatedSlug) => getMarketingFeature(relatedSlug))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const workspaceAccess = getWorkspaceAccess();

  return (
    <MarketingSiteShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Link className="inline-flex items-center gap-1.5 hover:text-foreground" href="/features"><ArrowLeft className="size-3.5" />Features</Link>
          <span aria-hidden="true">/</span><span aria-current="page" className="text-foreground">{feature.title}</span>
        </nav>

        <section className="grid items-start gap-8 lg:grid-cols-[minmax(17rem,0.68fr)_minmax(0,1.32fr)] lg:gap-12">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{feature.eyebrow}</p>
            <h1 className="mt-3 font-serif text-4xl font-medium leading-tight tracking-[-0.03em] text-balance sm:text-5xl">{feature.headline}</h1>
            <p className="mt-5 text-base leading-7 text-muted-foreground">{feature.description}</p>
            <Button asChild className="mt-6"><Link href={workspaceAccess.href}>{workspaceAccess.label}<ArrowRight className="ml-2 size-4" /></Link></Button>
          </div>

          <div className="space-y-4">
            {feature.screenshots.map((screenshot) => (
              <figure className="overflow-hidden rounded-xl border border-border bg-card" key={screenshot.src}>
                <div className="flex min-h-36 items-center justify-center bg-muted/30 p-2 sm:p-3">
                  <Image src={screenshot.src} alt={screenshot.alt} width={screenshot.width} height={screenshot.height} sizes="(max-width: 1024px) 100vw, 65vw" className="h-auto max-h-[470px] w-full object-contain" />
                </div>
                <figcaption className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground">{screenshot.caption}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="mt-12 grid gap-8 border-t border-border pt-8 sm:grid-cols-[minmax(15rem,0.65fr)_1fr] lg:mt-16 lg:pt-10">
          <div><p className="text-sm font-medium text-primary">Workflow</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">How it works</h2></div>
          <ol className="divide-y divide-border border-y border-border">
            {feature.workflow.map((step, index) => <li className="grid grid-cols-[2.5rem_1fr] gap-3 py-4" key={step}><span className="font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span><span className="text-sm leading-6">{step}</span></li>)}
          </ol>
        </section>

        {related.length ? (
          <section className="mt-12 border-t border-border pt-8 lg:mt-16">
            <h2 className="text-lg font-semibold">Related workflows</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {related.map((item) => <Button asChild variant="outline" key={item.slug}><Link href={`/features/${item.slug}`}>{item.title}<ArrowRight className="ml-2 size-3.5" /></Link></Button>)}
            </div>
          </section>
        ) : null}
      </div>
    </MarketingSiteShell>
  );
}
