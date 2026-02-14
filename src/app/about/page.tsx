"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Shield, Target, Users } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors mb-8"
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>

        <div className="flex items-center gap-4 mb-8">
          <Image
            src="/logo1.png"
            alt="SecYourFlow"
            width={48}
            height={48}
          />
          <h1 className="text-4xl font-bold text-[var(--text-primary)]">About SECYOURALL</h1>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8 text-[var(--text-secondary)]">
          <section>
            <p className="text-lg leading-relaxed">
              SECYOURALL is dedicated to forging excellence in cybersecurity, one flag at a time.
              Our flagship platform, SecYourFlow, provides organizations with a comprehensive
              cyber risk management solution that unifies vulnerability assessment, threat intelligence,
              and compliance monitoring.
            </p>
          </section>

          <section className="grid gap-6 md:grid-cols-3 my-12">
            <div className="p-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)]">
              <div className="inline-flex rounded-lg border border-sky-400/30 bg-sky-400/10 p-2.5 text-sky-600 dark:text-sky-300 mb-4">
                <Shield size={20} />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Our Mission</h3>
              <p className="text-sm text-[var(--text-muted)]">
                To empower security teams with actionable intelligence and streamlined workflows
                that prioritize what matters most.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)]">
              <div className="inline-flex rounded-lg border border-sky-400/30 bg-sky-400/10 p-2.5 text-sky-600 dark:text-sky-300 mb-4">
                <Target size={20} />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Our Vision</h3>
              <p className="text-sm text-[var(--text-muted)]">
                A world where organizations can confidently manage cyber risk with clarity,
                precision, and operational excellence.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)]">
              <div className="inline-flex rounded-lg border border-sky-400/30 bg-sky-400/10 p-2.5 text-sky-600 dark:text-sky-300 mb-4">
                <Users size={20} />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Our Team</h3>
              <p className="text-sm text-[var(--text-muted)]">
                Built by security professionals for security professionals, with deep expertise
                in threat analysis and risk management.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-4">What We Do</h2>
            <p>
              SecYourFlow transforms how organizations approach cybersecurity by providing:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li>Real-time threat signal correlation and risk-weighted prioritization</li>
              <li>Comprehensive vulnerability management with CVSS and EPSS scoring</li>
              <li>Compliance monitoring tied to SOC 2, ISO 27001, and custom frameworks</li>
              <li>Executive-ready reporting and audit evidence trails</li>
              <li>Seamless integration with existing security tools and workflows</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-4">Why Choose Us</h2>
            <p>
              We understand that security teams are overwhelmed with data but starved for actionable
              insights. SecYourFlow cuts through the noise by:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li>Focusing on business impact rather than just severity scores</li>
              <li>Providing context-rich intelligence that speeds up triage</li>
              <li>Maintaining a clean, intuitive interface that analysts actually want to use</li>
              <li>Delivering continuous monitoring without the complexity</li>
            </ul>
          </section>

          <section className="mt-12 p-6 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-hover)]">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">Maintained by SHYENA</h2>
            <p className="text-sm text-[var(--text-muted)]">
              Our platform is actively maintained and continuously improved to meet the evolving
              needs of modern security operations centers. We&apos;re committed to delivering excellence
              in every release.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-[var(--border-color)]">
          <p className="text-sm text-[var(--text-muted)] text-center">
            © 2026 SECYOURALL. ALL RIGHTS RESERVED.
          </p>
        </div>
      </div>
    </div>
  );
}
