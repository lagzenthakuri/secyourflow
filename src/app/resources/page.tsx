"use client";

import {
  ArrowLeft,
  BookOpen,
  Code,
  Download,
  ExternalLink,
  FileText,
  Video,
} from "lucide-react";
import Link from "next/link";

export default function Resources() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <Link
          className="mb-8 inline-flex items-center gap-2 text-sky-700 text-sm transition-colors hover:text-intent-accent-strong dark:text-sky-400"
          href="/"
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>

        <h1 className="mb-4 font-bold text-4xl text-[var(--text-primary)]">
          Resources
        </h1>
        <p className="mb-12 text-[var(--text-muted)]">
          Documentation, guides, and tools to help you get the most out of
          SecYourFlow.
        </p>

        <div className="space-y-8">
          {/* Documentation */}
          <section>
            <h2 className="mb-6 flex items-center gap-3 font-semibold text-2xl text-[var(--text-primary)]">
              <BookOpen className="text-sky-700 dark:text-sky-400" size={24} />
              Documentation
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div
                aria-disabled="true"
                className="group rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-6 opacity-85"
              >
                <h3 className="mb-2 flex items-center justify-between font-semibold text-[var(--text-primary)] text-lg">
                  Getting Started Guide
                  <ExternalLink
                    className="text-[var(--text-muted)] transition-colors group-hover:text-sky-700 dark:group-hover:text-sky-400"
                    size={16}
                  />
                </h3>
                <p className="text-[var(--text-muted)] text-sm">
                  Learn the basics of SecYourFlow and set up your first security
                  workspace.
                </p>
                <p className="mt-2 font-medium text-[11px] text-[var(--text-muted)]">
                  Coming soon
                </p>
              </div>

              <div
                aria-disabled="true"
                className="group rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-6 opacity-85"
              >
                <h3 className="mb-2 flex items-center justify-between font-semibold text-[var(--text-primary)] text-lg">
                  API Documentation
                  <ExternalLink
                    className="text-[var(--text-muted)] transition-colors group-hover:text-sky-700 dark:group-hover:text-sky-400"
                    size={16}
                  />
                </h3>
                <p className="text-[var(--text-muted)] text-sm">
                  Complete API reference for integrating SecYourFlow with your
                  tools.
                </p>
                <p className="mt-2 font-medium text-[11px] text-[var(--text-muted)]">
                  Coming soon
                </p>
              </div>

              <div
                aria-disabled="true"
                className="group rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-6 opacity-85"
              >
                <h3 className="mb-2 flex items-center justify-between font-semibold text-[var(--text-primary)] text-lg">
                  User Manual
                  <ExternalLink
                    className="text-[var(--text-muted)] transition-colors group-hover:text-sky-700 dark:group-hover:text-sky-400"
                    size={16}
                  />
                </h3>
                <p className="text-[var(--text-muted)] text-sm">
                  Comprehensive guide covering all features and workflows.
                </p>
                <p className="mt-2 font-medium text-[11px] text-[var(--text-muted)]">
                  Coming soon
                </p>
              </div>

              <div
                aria-disabled="true"
                className="group rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-6 opacity-85"
              >
                <h3 className="mb-2 flex items-center justify-between font-semibold text-[var(--text-primary)] text-lg">
                  Best Practices
                  <ExternalLink
                    className="text-[var(--text-muted)] transition-colors group-hover:text-sky-700 dark:group-hover:text-sky-400"
                    size={16}
                  />
                </h3>
                <p className="text-[var(--text-muted)] text-sm">
                  Security operations best practices and recommended workflows.
                </p>
                <p className="mt-2 font-medium text-[11px] text-[var(--text-muted)]">
                  Coming soon
                </p>
              </div>
            </div>
          </section>

          {/* Tutorials */}
          <section>
            <h2 className="mb-6 flex items-center gap-3 font-semibold text-2xl text-[var(--text-primary)]">
              <Video className="text-sky-600 dark:text-sky-400" size={24} />
              Video Tutorials
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-6">
                <div className="mb-4 flex aspect-video items-center justify-center rounded-lg bg-[var(--bg-tertiary)]">
                  <Video className="text-[var(--text-muted)]" size={32} />
                </div>
                <h3 className="mb-2 font-semibold text-[var(--text-primary)] text-lg">
                  Platform Overview
                </h3>
                <p className="text-[var(--text-muted)] text-sm">
                  5-minute walkthrough of the SecYourFlow dashboard and key
                  features.
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-6">
                <div className="mb-4 flex aspect-video items-center justify-center rounded-lg bg-[var(--bg-tertiary)]">
                  <Video className="text-[var(--text-muted)]" size={32} />
                </div>
                <h3 className="mb-2 font-semibold text-[var(--text-primary)] text-lg">
                  Risk Prioritization
                </h3>
                <p className="text-[var(--text-muted)] text-sm">
                  Learn how to use risk scoring to prioritize vulnerabilities
                  effectively.
                </p>
              </div>
            </div>
          </section>

          {/* Downloads */}
          <section>
            <h2 className="mb-6 flex items-center gap-3 font-semibold text-2xl text-[var(--text-primary)]">
              <Download className="text-sky-600 dark:text-sky-400" size={24} />
              Downloads
            </h2>
            <div className="space-y-3">
              <div
                aria-disabled="true"
                className="flex items-center justify-between rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-4 opacity-85"
              >
                <div className="flex items-center gap-3">
                  <FileText className="text-[var(--text-muted)]" size={20} />
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">
                      SecYourFlow Datasheet
                    </p>
                    <p className="text-[var(--text-muted)] text-xs">
                      PDF • 2.4 MB
                    </p>
                  </div>
                </div>
                <Download className="text-[var(--text-muted)]" size={18} />
              </div>

              <div
                aria-disabled="true"
                className="flex items-center justify-between rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-4 opacity-85"
              >
                <div className="flex items-center gap-3">
                  <Code className="text-[var(--text-muted)]" size={20} />
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">
                      Integration Examples
                    </p>
                    <p className="text-[var(--text-muted)] text-xs">
                      ZIP • 1.8 MB
                    </p>
                  </div>
                </div>
                <Download className="text-[var(--text-muted)]" size={18} />
              </div>

              <div
                aria-disabled="true"
                className="flex items-center justify-between rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-4 opacity-85"
              >
                <div className="flex items-center gap-3">
                  <FileText className="text-[var(--text-muted)]" size={20} />
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">
                      Compliance Templates
                    </p>
                    <p className="text-[var(--text-muted)] text-xs">
                      ZIP • 3.1 MB
                    </p>
                  </div>
                </div>
                <Download className="text-[var(--text-muted)]" size={18} />
              </div>
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">
              Downloads are not available yet.
            </p>
          </section>

          {/* Support */}
          <section className="mt-12 rounded-lg border border-[var(--border-hover)] bg-[var(--bg-tertiary)] p-6">
            <h2 className="mb-3 font-semibold text-[var(--text-primary)] text-xl">
              Need Help?
            </h2>
            <p className="mb-4 text-[var(--text-muted)] text-sm">
              Can&apos;t find what you&apos;re looking for? Our support team is
              here to help.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex items-center gap-2 rounded-lg bg-sky-400 px-4 py-2 font-medium text-slate-950 text-sm transition-colors hover:bg-sky-300"
                href="/contact"
              >
                Contact Support
              </Link>
              <button
                aria-disabled="true"
                className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-[var(--border-hover)] px-4 py-2 font-medium text-[var(--text-secondary)] text-sm opacity-70"
                disabled
                type="button"
              >
                Community Forum
              </button>
            </div>
          </section>
        </div>

        <div className="mt-12 border-[var(--border-color)] border-t pt-8">
          <p className="text-center text-[var(--text-muted)] text-sm">
            © 2026 SECYOURFLOW. ALL RIGHTS RESERVED.
          </p>
        </div>
      </div>
    </div>
  );
}
