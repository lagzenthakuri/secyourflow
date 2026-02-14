"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen, FileText, Video, Code, Download, ExternalLink } from "lucide-react";

export default function Resources() {
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

        <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-4">Resources</h1>
        <p className="text-[var(--text-muted)] mb-12">
          Documentation, guides, and tools to help you get the most out of SecYourFlow.
        </p>

        <div className="space-y-8">
          {/* Documentation */}
          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-6 flex items-center gap-3">
              <BookOpen size={24} className="text-sky-600 dark:text-sky-400" />
              Documentation
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <a
                href="#"
                className="group p-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-elevated)] transition-all"
              >
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2 flex items-center justify-between">
                  Getting Started Guide
                  <ExternalLink size={16} className="text-[var(--text-muted)] group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors" />
                </h3>
                <p className="text-sm text-[var(--text-muted)]">
                  Learn the basics of SecYourFlow and set up your first security workspace.
                </p>
              </a>

              <a
                href="#"
                className="group p-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-elevated)] transition-all"
              >
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2 flex items-center justify-between">
                  API Documentation
                  <ExternalLink size={16} className="text-[var(--text-muted)] group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors" />
                </h3>
                <p className="text-sm text-[var(--text-muted)]">
                  Complete API reference for integrating SecYourFlow with your tools.
                </p>
              </a>

              <a
                href="#"
                className="group p-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-elevated)] transition-all"
              >
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2 flex items-center justify-between">
                  User Manual
                  <ExternalLink size={16} className="text-[var(--text-muted)] group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors" />
                </h3>
                <p className="text-sm text-[var(--text-muted)]">
                  Comprehensive guide covering all features and workflows.
                </p>
              </a>

              <a
                href="#"
                className="group p-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-elevated)] transition-all"
              >
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2 flex items-center justify-between">
                  Best Practices
                  <ExternalLink size={16} className="text-[var(--text-muted)] group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors" />
                </h3>
                <p className="text-sm text-[var(--text-muted)]">
                  Security operations best practices and recommended workflows.
                </p>
              </a>
            </div>
          </section>

          {/* Tutorials */}
          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-6 flex items-center gap-3">
              <Video size={24} className="text-sky-600 dark:text-sky-400" />
              Video Tutorials
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)]">
                <div className="aspect-video bg-[var(--bg-tertiary)] rounded-lg mb-4 flex items-center justify-center">
                  <Video size={32} className="text-[var(--text-muted)]" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                  Platform Overview
                </h3>
                <p className="text-sm text-[var(--text-muted)]">
                  5-minute walkthrough of the SecYourFlow dashboard and key features.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)]">
                <div className="aspect-video bg-[var(--bg-tertiary)] rounded-lg mb-4 flex items-center justify-center">
                  <Video size={32} className="text-[var(--text-muted)]" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                  Risk Prioritization
                </h3>
                <p className="text-sm text-[var(--text-muted)]">
                  Learn how to use risk scoring to prioritize vulnerabilities effectively.
                </p>
              </div>
            </div>
          </section>

          {/* Downloads */}
          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-6 flex items-center gap-3">
              <Download size={24} className="text-sky-600 dark:text-sky-400" />
              Downloads
            </h2>
            <div className="space-y-3">
              <a
                href="#"
                className="flex items-center justify-between p-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-elevated)] transition-all"
              >
                <div className="flex items-center gap-3">
                  <FileText size={20} className="text-[var(--text-muted)]" />
                  <div>
                    <p className="text-[var(--text-primary)] font-medium">SecYourFlow Datasheet</p>
                    <p className="text-xs text-[var(--text-muted)]">PDF • 2.4 MB</p>
                  </div>
                </div>
                <Download size={18} className="text-[var(--text-muted)]" />
              </a>

              <a
                href="#"
                className="flex items-center justify-between p-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-elevated)] transition-all"
              >
                <div className="flex items-center gap-3">
                  <Code size={20} className="text-[var(--text-muted)]" />
                  <div>
                    <p className="text-[var(--text-primary)] font-medium">Integration Examples</p>
                    <p className="text-xs text-[var(--text-muted)]">ZIP • 1.8 MB</p>
                  </div>
                </div>
                <Download size={18} className="text-[var(--text-muted)]" />
              </a>

              <a
                href="#"
                className="flex items-center justify-between p-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-elevated)] transition-all"
              >
                <div className="flex items-center gap-3">
                  <FileText size={20} className="text-[var(--text-muted)]" />
                  <div>
                    <p className="text-[var(--text-primary)] font-medium">Compliance Templates</p>
                    <p className="text-xs text-[var(--text-muted)]">ZIP • 3.1 MB</p>
                  </div>
                </div>
                <Download size={18} className="text-[var(--text-muted)]" />
              </a>
            </div>
          </section>

          {/* Support */}
          <section className="mt-12 p-6 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-hover)]">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">Need Help?</h2>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              Can&apos;t find what you&apos;re looking for? Our support team is here to help.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-400 text-slate-950 font-medium text-sm hover:bg-sky-300 transition-colors"
              >
                Contact Support
              </Link>
              <a
                href="#"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border-hover)] text-[var(--text-secondary)] font-medium text-sm hover:border-[var(--border-hover)] hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                Community Forum
              </a>
            </div>
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
