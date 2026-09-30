"use client";

import { ArrowLeft, Shield, Target, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function About() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <Link
          className="mb-8 inline-flex items-center gap-2 text-sky-600 text-sm transition-colors hover:text-intent-accent-strong dark:text-sky-400"
          href="/"
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>

        <div className="mb-8 flex items-center gap-4">
          <Image alt="SecYourFlow" height={48} src="/logo1.png" width={48} />
          <h1 className="font-bold text-4xl text-[var(--text-primary)]">
            About SECYOURALL
          </h1>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8 text-[var(--text-secondary)]">
          <section>
            <p className="text-lg leading-relaxed">
              SECYOURALL is dedicated to forging excellence in cybersecurity,
              one flag at a time. Our flagship platform, SecYourFlow, provides
              organizations with a comprehensive cyber risk management solution
              that unifies vulnerability assessment, threat intelligence, and
              compliance monitoring.
            </p>
          </section>

          <section className="my-12 grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-6">
              <div className="mb-4 inline-flex rounded-lg border border-sky-400/30 bg-sky-400/10 p-2.5 text-intent-accent">
                <Shield size={20} />
              </div>
              <h3 className="mb-2 font-semibold text-[var(--text-primary)] text-lg">
                Our Mission
              </h3>
              <p className="text-[var(--text-muted)] text-sm">
                To empower security teams with actionable intelligence and
                streamlined workflows that prioritize what matters most.
              </p>
            </div>

            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-6">
              <div className="mb-4 inline-flex rounded-lg border border-sky-400/30 bg-sky-400/10 p-2.5 text-intent-accent">
                <Target size={20} />
              </div>
              <h3 className="mb-2 font-semibold text-[var(--text-primary)] text-lg">
                Our Vision
              </h3>
              <p className="text-[var(--text-muted)] text-sm">
                A world where organizations can confidently manage cyber risk
                with clarity, precision, and operational excellence.
              </p>
            </div>

            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-6">
              <div className="mb-4 inline-flex rounded-lg border border-sky-400/30 bg-sky-400/10 p-2.5 text-intent-accent">
                <Users size={20} />
              </div>
              <h3 className="mb-2 font-semibold text-[var(--text-primary)] text-lg">
                Our Team
              </h3>
              <p className="text-[var(--text-muted)] text-sm">
                Built by security professionals for security professionals, with
                deep expertise in threat analysis and risk management.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-semibold text-2xl text-[var(--text-primary)]">
              What We Do
            </h2>
            <p>
              SecYourFlow transforms how organizations approach cybersecurity by
              providing:
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-6">
              <li>
                Real-time threat signal correlation and risk-weighted
                prioritization
              </li>
              <li>
                Comprehensive vulnerability management with CVSS and EPSS
                scoring
              </li>
              <li>
                Compliance monitoring tied to SOC 2, ISO 27001, and custom
                frameworks
              </li>
              <li>Executive-ready reporting and audit evidence trails</li>
              <li>
                Seamless integration with existing security tools and workflows
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 font-semibold text-2xl text-[var(--text-primary)]">
              Why Choose Us
            </h2>
            <p>
              We understand that security teams are overwhelmed with data but
              starved for actionable insights. SecYourFlow cuts through the
              noise by:
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-6">
              <li>
                Focusing on business impact rather than just severity scores
              </li>
              <li>Providing context-rich intelligence that speeds up triage</li>
              <li>
                Maintaining a clean, intuitive interface that analysts actually
                want to use
              </li>
              <li>Delivering continuous monitoring without the complexity</li>
            </ul>
          </section>

          <section className="mt-12 rounded-lg border border-[var(--border-hover)] bg-[var(--bg-tertiary)] p-6">
            <h2 className="mb-3 font-semibold text-[var(--text-primary)] text-xl">
              Maintained by SHYENA
            </h2>
            <p className="text-[var(--text-muted)] text-sm">
              Our platform is actively maintained and continuously improved to
              meet the evolving needs of modern security operations centers.
              We&apos;re committed to delivering excellence in every release.
            </p>
          </section>
        </div>

        <div className="mt-12 border-[var(--border-color)] border-t pt-8">
          <p className="text-center text-[var(--text-muted)] text-sm">
            © 2026 SECYOURALL. ALL RIGHTS RESERVED.
          </p>
        </div>
      </div>
    </div>
  );
}
