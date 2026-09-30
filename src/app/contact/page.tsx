import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import { MarketingSiteShell } from "@/modules/marketing/ui/MarketingShell";
import { ContactForm } from "@/modules/marketing/ui/ContactForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact SecYourFlow",
  description: "Contact the SecYourFlow team about the product and workspaces.",
};

export default function ContactPage() {
  return (
    <MarketingSiteShell>
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mb-10 max-w-2xl">
          <p className="text-sm font-medium text-primary">Contact</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Let's talk about your security workflow.</h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">Questions about SecYourFlow, setting up a workspace, or whether it fits your team? Send us a note or reach out directly.</p>
        </div>
        <div className="grid items-start gap-6 lg:grid-cols-[0.82fr_1.18fr]">
          <aside className="rounded-2xl border border-border bg-muted/20 p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Get in touch</p>
            <h2 className="mt-2 text-xl font-semibold">Shyena Technologies Pvt. Ltd.</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">SecYourFlow is developed and maintained by Shyena Technologies in Kathmandu, Nepal.</p>
            <div className="mt-7 space-y-3">
              <Link href="mailto:thakurizen2@gmail.com" className="group flex items-start gap-3 rounded-xl border border-border bg-background p-4 transition-colors hover:border-primary/40 hover:bg-muted/30">
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Mail className="size-4" /></span>
                <span className="min-w-0 flex-1"><span className="block text-xs text-muted-foreground">Email</span><span className="mt-1 block break-all text-sm font-medium">thakurizen2@gmail.com</span></span>
                <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
              </Link>
              <Link href="tel:+9779849291185" className="group flex items-start gap-3 rounded-xl border border-border bg-background p-4 transition-colors hover:border-primary/40 hover:bg-muted/30">
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Phone className="size-4" /></span>
                <span className="min-w-0 flex-1"><span className="block text-xs text-muted-foreground">Phone</span><span className="mt-1 block text-sm font-medium">+977 9849291185</span></span>
                <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
              </Link>
              <div className="flex items-start gap-3 rounded-xl border border-border bg-background p-4">
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><MapPin className="size-4" /></span>
                <span><span className="block text-xs text-muted-foreground">Location</span><span className="mt-1 block text-sm font-medium">Kathmandu 44600, Nepal</span></span>
              </div>
            </div>
            <div className="mt-7 border-t border-border pt-5 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">A note about your message</p>
              <p className="mt-1 leading-6">Please avoid including passwords, access tokens, or sensitive vulnerability details in this form.</p>
            </div>
          </aside>
          <ContactForm />
        </div>
      </section>
    </MarketingSiteShell>
  );
}
