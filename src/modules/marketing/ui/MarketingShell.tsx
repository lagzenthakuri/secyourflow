import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@repo/design-system/components/ui/button";
import { LandingBrand } from "./LandingBrand";
import { getWorkspaceAccess } from "./workspace-access";

export function Brand() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="SecYourFlow home">
      <Image src="/logo1.png" alt="" width={34} height={34} priority className="h-[34px] w-auto" />
      <span className="text-sm font-semibold tracking-[0.14em]">
        SECYOUR<span className="text-muted-foreground">FLOW</span>
      </span>
    </Link>
  );
}

export function MarketingHeader({ homeBrandTransition = false }: { homeBrandTransition?: boolean }) {
  const workspaceAccess = getWorkspaceAccess();
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {homeBrandTransition ? <LandingBrand /> : <Brand />}
        <nav aria-label="Main navigation" className="hidden items-center gap-7 md:flex">
          <Link className="text-sm text-muted-foreground transition-colors hover:text-foreground" href="/features">Features</Link>
          <Link className="text-sm text-muted-foreground transition-colors hover:text-foreground" href="/about">About</Link>
          <Link className="text-sm text-muted-foreground transition-colors hover:text-foreground" href="/contact">Contact</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link href="/login">Sign in</Link></Button>
          <Button asChild size="sm"><Link href={workspaceAccess.href}>{workspaceAccess.label}<ArrowUpRight className="ml-1 size-4" /></Link></Button>
        </div>
      </div>
      <nav aria-label="Mobile navigation" className="flex items-center justify-center gap-6 border-t border-border px-4 py-2 md:hidden">
        <Link className="text-xs font-medium text-muted-foreground hover:text-foreground" href="/features">Features</Link>
        <Link className="text-xs font-medium text-muted-foreground hover:text-foreground" href="/about">About</Link>
        <Link className="text-xs font-medium text-muted-foreground hover:text-foreground" href="/contact">Contact</Link>
      </nav>
    </header>
  );
}

export function MarketingFooter() {
  const workspaceAccess = getWorkspaceAccess();
  return (
    <footer className="border-t border-foreground/10 bg-background text-foreground">
      <div className="container mx-auto grid gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-16">
        <div className="flex max-w-md flex-col items-start gap-4">
          <Brand />
          <p className="text-sm leading-6 text-foreground/70">Asset inventory, vulnerability triage, remediation tracking, and governance for security teams.</p>
          <p className="text-sm text-foreground/70">A product of Shyena Technologies Pvt. Ltd.</p>
        </div>
        <nav aria-label="Footer navigation" className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          <div className="flex flex-col items-start gap-2 text-sm">
            <h2 className="mb-1 font-medium">Product</h2>
            <Link className="text-foreground/70 hover:text-foreground" href="/features">Features</Link>
            <Link className="text-foreground/70 hover:text-foreground" href="/features/assets">Assets</Link>
            <Link className="text-foreground/70 hover:text-foreground" href="/features/vulnerabilities">Vulnerabilities</Link>
            <Link className="text-foreground/70 hover:text-foreground" href="/features/cve-search">CVE search</Link>
            <Link className="text-foreground/70 hover:text-foreground" href="/features/risk-compliance">Risk &amp; compliance</Link>
          </div>
          <div className="flex flex-col items-start gap-2 text-sm">
            <h2 className="mb-1 font-medium">Company</h2>
            <Link className="text-foreground/70 hover:text-foreground" href="/about">About</Link>
            <Link className="text-foreground/70 hover:text-foreground" href="/resources">Resources</Link>
            <Link className="text-foreground/70 hover:text-foreground" href="/contact">Contact</Link>
          </div>
          <div className="flex flex-col items-start gap-2 text-sm">
            <h2 className="mb-1 font-medium">Account & legal</h2>
            <Link className="text-foreground/70 hover:text-foreground" href="/login">Sign in</Link>
            <Link className="text-foreground/70 hover:text-foreground" href={workspaceAccess.href}>{workspaceAccess.label}</Link>
            <Link className="text-foreground/70 hover:text-foreground" href="/privacy-policy">Privacy</Link>
            <Link className="text-foreground/70 hover:text-foreground" href="/terms-of-service">Terms</Link>
          </div>
        </nav>
      </div>
      <div className="border-t border-foreground/10">
        <div className="container mx-auto flex flex-col gap-2 px-4 py-4 text-xs text-foreground/60 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>© {new Date().getFullYear()} SecYourFlow</span>
          <span>Shyena Technologies Pvt. Ltd.</span>
        </div>
      </div>
    </footer>
  );
}

export function MarketingSiteShell({ children, landing = false }: { children: ReactNode; landing?: boolean }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <MarketingHeader homeBrandTransition={landing} />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
