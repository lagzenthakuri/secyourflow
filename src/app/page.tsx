import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  FileCheck2,
  Radar,
  ShieldCheck,
  Workflow,
  Users,
  Gauge,
} from "lucide-react";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/design-system/components/ui/card";

const capabilities = [
  {
    icon: Radar,
    title: "See what is exposed",
    description: "Bring assets, vulnerability findings, and threat indicators into one operational view.",
  },
  {
    icon: ShieldCheck,
    title: "Prioritize by business risk",
    description: "Give teams the context to focus remediation on the issues that matter to the organization.",
  },
  {
    icon: FileCheck2,
    title: "Connect risk to controls",
    description: "Keep compliance work close to operational findings, owners, and evidence.",
  },
];

const workflow = [
  ["01", "Collect", "Connect scanner output, asset inventories, and threat feeds."],
  ["02", "Understand", "Correlate exposure with exploit signals and business context."],
  ["03", "Respond", "Assign work, follow remediation, and report progress."],
];

export default function Home() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5" aria-label="SecYourFlow home">
            <Image src="/logo1.png" alt="" width={32} height={32} priority />
            <span className="text-sm font-semibold tracking-[0.14em]">SECYOUR<span className="text-muted-foreground">FLOW</span></span>
          </Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-6 md:flex">
            <a className="text-sm text-muted-foreground transition-colors hover:text-foreground" href="#platform">Platform</a>
            <a className="text-sm text-muted-foreground transition-colors hover:text-foreground" href="#workflow">Workflow</a>
            <Link className="text-sm text-muted-foreground transition-colors hover:text-foreground" href="/contact">Contact</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link href="/login">Sign in</Link></Button>
              <Button asChild size="sm"><Link href="/signup">Get started<ArrowUpRight className="ml-1 size-4" /></Link></Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative isolate overflow-hidden bg-muted/30 px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_70%,rgba(87,139,255,0.12),transparent_56%),radial-gradient(var(--border)_0.7px,transparent_0.7px)] bg-[length:100%_100%,12px_12px] [mask-image:linear-gradient(to_bottom,black_35%,transparent_100%)]" />
          <div className="mx-auto flex max-w-7xl flex-col items-center text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              <Activity className="size-3.5" /> Security operations, connected
            </div>
            <h1 className="max-w-4xl font-serif text-4xl font-medium leading-tight tracking-tight sm:text-5xl lg:text-6xl">A clearer way to secure your digital estate.</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              SecYourFlow brings exposure, active threats, and compliance work into one focused workspace for security teams.
            </p>
            <div className="mt-7 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
              <Button asChild size="lg"><Link href="/signup">Create your workspace<ArrowRight className="ml-2 size-4" /></Link></Button>
              <Button asChild variant="outline" size="lg"><Link href="#platform">Explore the platform</Link></Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">A practical flow from security signal to accountable response.</p>
          </div>

          <Card className="mx-auto mt-12 w-full max-w-5xl overflow-hidden rounded-xl border-border bg-card text-card-foreground shadow-lg">
            <CardHeader className="border-b border-border bg-muted/50 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">WORKSPACE PREVIEW</p>
                  <CardTitle className="mt-1 text-base">Security overview</CardTitle>
                </div>
                <span className="rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground">Dashboard</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <div className="grid gap-3 sm:grid-cols-3">
                {["Assets", "Vulnerabilities", "Compliance"].map((label) => (
                  <div key={label} className="rounded-lg border border-border bg-background p-3">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <div className="mt-3 h-2 w-2/3 rounded-full bg-primary/20" />
                    <div className="mt-2 h-2 w-full rounded-full bg-muted" />
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-border p-4">
                <div className="flex items-center justify-between gap-4">
                  <div><p className="text-sm font-medium">Exposure and response</p><p className="mt-1 text-xs text-muted-foreground">A shared view of work that needs attention</p></div>
                  <Workflow className="size-5 shrink-0 text-muted-foreground" />
                </div>
                <div className="mt-5 space-y-3" aria-hidden="true">
                  {["Threat intelligence", "Risk prioritization", "Remediation tracking"].map((item, index) => (
                    <div key={item} className="flex items-center gap-3">
                      <span className="flex size-7 items-center justify-center rounded-full border border-border bg-muted text-xs text-muted-foreground">{index + 1}</span>
                      <span className="h-2 flex-1 rounded-full bg-muted"><span className={`block h-full rounded-full bg-primary/40 ${index === 0 ? "w-4/5" : index === 1 ? "w-3/5" : "w-2/3"}`} /></span>
                      <span className="w-36 truncate text-right text-xs text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                <ShieldCheck className="size-4 shrink-0" /> A workspace designed around your security workflow.
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="platform" className="scroll-mt-20 border-y border-border bg-background">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-muted-foreground">The platform</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">One workspace for the work behind security decisions.</h2>
              <p className="mt-4 leading-7 text-muted-foreground">Keep operational signals, ownership, and governance connected as teams investigate and respond.</p>
            </div>
            <div className="mt-9 grid gap-4 md:grid-cols-3">
              {capabilities.map(({ icon: Icon, title, description }) => (
                <Card key={title} className="rounded-xl border-border bg-card text-card-foreground shadow-none">
                  <CardContent className="p-6">
                    <span className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted/50"><Icon className="size-5" /></span>
                    <h3 className="mt-5 font-semibold">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-border bg-background px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-center">
            <div className="rounded-xl border border-border bg-muted/30 p-6 sm:p-9">
              <div className="grid grid-cols-2 gap-3">
                {["Applications", "Identity", "Cloud assets", "Infrastructure"].map((item, index) => (
                  <div key={item} className="flex min-h-28 flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card p-4 text-center shadow-sm">
                    <span className="flex size-10 items-center justify-center rounded-full border border-primary/20 bg-primary/5 text-primary">{index === 0 ? <Radar className="size-5" /> : index === 1 ? <Users className="size-5" /> : index === 2 ? <ShieldCheck className="size-5" /> : <Workflow className="size-5" />}</span>
                    <span className="text-sm font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="max-w-xl">
              <p className="text-sm font-medium text-muted-foreground">Why it matters</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">Security needs a continuous view.</h2>
              <p className="mt-4 leading-7 text-muted-foreground">Systems change every day. A connected workspace helps teams keep exposure, ownership, and control work visible as those changes happen.</p>
              <ul className="mt-6 space-y-3 text-sm text-foreground">
                <li className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /> Keep asset and finding context together</li>
                <li className="flex items-center gap-2"><Activity className="size-4 text-primary" /> Follow investigation through remediation</li>
                <li className="flex items-center gap-2"><FileCheck2 className="size-4 text-primary" /> Tie operational work to compliance evidence</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="workflow" className="scroll-mt-20 bg-muted/30 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-sm font-medium text-muted-foreground">A practical workflow</p><h2 className="mt-3 text-3xl font-semibold tracking-tight">From intake to response.</h2></div>
            <Button asChild variant="outline"><Link href="/dashboard">Explore the workspace<ArrowRight className="ml-2 size-4" /></Link></Button>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {workflow.map(([step, title, description]) => (
              <Card key={step} className="rounded-xl border-border bg-card text-card-foreground shadow-none">
                <CardContent className="p-6"><p className="text-xs font-medium tabular-nums text-muted-foreground">STEP {step}</p><h3 className="mt-4 text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p></CardContent>
              </Card>
            ))}
          </div>
          </div>
        </section>

        <section className="border-t border-border bg-background px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Built for the whole team</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">Security work that fits each role.</h2>
              <p className="mt-4 max-w-xl leading-7 text-muted-foreground">Give practitioners, security leaders, and governance teams a shared source of context with views suited to their day-to-day work.</p>
              <div className="mt-7 divide-y divide-border rounded-xl border border-border">
                {[
                  ["Engineering teams", "Understand which findings need attention and why."],
                  ["Security leaders", "Track risk, ownership, and response across the organization."],
                  ["Compliance teams", "Connect control status with operational evidence."],
                ].map(([role, detail]) => (
                  <div key={role} className="flex items-start gap-3 px-4 py-4"><span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/5 text-primary"><Users className="size-3.5" /></span><div><p className="text-sm font-medium">{role}</p><p className="mt-1 text-sm text-muted-foreground">{detail}</p></div></div>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { icon: Radar, title: "Shared visibility", description: "Bring asset, threat, and vulnerability context together." },
                { icon: Gauge, title: "Risk prioritization", description: "Focus investigation around business impact." },
                { icon: Workflow, title: "Clear ownership", description: "Keep findings connected to accountable response." },
                { icon: FileCheck2, title: "Useful reporting", description: "Carry evidence and progress into governance reviews." },
              ].map(({ icon: Icon, title, description }) => (
                <Card key={title} className="rounded-xl border-border bg-card text-card-foreground shadow-none"><CardContent className="p-5"><Icon className="size-5 text-primary" /><h3 className="mt-4 text-sm font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p></CardContent></Card>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-background">
          <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <div><h2 className="text-xl font-semibold">Bring your security work into focus.</h2><p className="mt-1 text-sm text-muted-foreground">Sign in or create a SecYourFlow workspace to get started.</p></div>
            <Button asChild><Link href="/signup">Get started<ArrowRight className="ml-2 size-4" /></Link></Button>
          </div>
        </section>
      </main>
      <footer className="border-t border-border bg-muted text-muted-foreground">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>© {new Date().getFullYear()} SecYourFlow</span><div className="flex gap-5"><Link className="hover:text-foreground" href="/contact">Contact</Link><Link className="hover:text-foreground" href="/login">Sign in</Link></div>
        </div>
      </footer>
    </div>
  );
}
