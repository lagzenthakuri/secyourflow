"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Link
          className="mb-8 inline-flex items-center gap-2 text-sky-600 text-sm transition-colors hover:text-intent-accent-strong dark:text-sky-400"
          href="/"
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>

        <h1 className="mb-4 font-bold text-4xl text-[var(--text-primary)]">
          Privacy Policy
        </h1>
        <p className="mb-8 text-[var(--text-muted)] text-sm">
          Last updated: February 8, 2026
        </p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-[var(--text-secondary)]">
          <section>
            <h2 className="mt-8 mb-4 font-semibold text-2xl text-[var(--text-primary)]">
              1. Introduction
            </h2>
            <p>
              Welcome to SECYOURALL (&quot;we,&quot; &quot;our,&quot; or
              &quot;us&quot;). We are committed to protecting your personal
              information and your right to privacy. This Privacy Policy
              explains how we collect, use, disclose, and safeguard your
              information when you use our SecYourFlow platform.
            </p>
          </section>

          <section>
            <h2 className="mt-8 mb-4 font-semibold text-2xl text-[var(--text-primary)]">
              2. Information We Collect
            </h2>
            <h3 className="mt-6 mb-3 font-semibold text-[var(--text-primary)] text-xl">
              2.1 Personal Information
            </h3>
            <p>We may collect the following types of personal information:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                Name and contact information (email address, phone number)
              </li>
              <li>Account credentials (username, password)</li>
              <li>Organization details</li>
              <li>Payment and billing information</li>
              <li>Two-factor authentication data</li>
            </ul>

            <h3 className="mt-6 mb-3 font-semibold text-[var(--text-primary)] text-xl">
              2.2 Usage Data
            </h3>
            <p>
              We automatically collect certain information when you use our
              platform:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Log data (IP address, browser type, operating system)</li>
              <li>Device information</li>
              <li>Usage patterns and preferences</li>
              <li>Security scan results and vulnerability data</li>
            </ul>
          </section>

          <section>
            <h2 className="mt-8 mb-4 font-semibold text-2xl text-[var(--text-primary)]">
              3. How We Use Your Information
            </h2>
            <p>We use the collected information for the following purposes:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Providing and maintaining our services</li>
              <li>Processing your transactions</li>
              <li>Sending administrative information and updates</li>
              <li>Responding to your inquiries and support requests</li>
              <li>Improving our platform and user experience</li>
              <li>Detecting and preventing security threats</li>
              <li>Complying with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="mt-8 mb-4 font-semibold text-2xl text-[var(--text-primary)]">
              4. Data Sharing and Disclosure
            </h2>
            <p>We may share your information in the following circumstances:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                With service providers who assist in operating our platform
              </li>
              <li>When required by law or to protect our rights</li>
              <li>In connection with a business transfer or acquisition</li>
              <li>With your consent or at your direction</li>
            </ul>
            <p className="mt-4">
              We do not sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="mt-8 mb-4 font-semibold text-2xl text-[var(--text-primary)]">
              5. Data Security
            </h2>
            <p>
              We implement appropriate technical and organizational measures to
              protect your personal information against unauthorized access,
              alteration, disclosure, or destruction. These measures include:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security assessments and audits</li>
              <li>Access controls and authentication mechanisms</li>
              <li>Employee training on data protection</li>
            </ul>
          </section>

          <section>
            <h2 className="mt-8 mb-4 font-semibold text-2xl text-[var(--text-primary)]">
              6. Your Rights
            </h2>
            <p>
              You have the following rights regarding your personal information:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Access and obtain a copy of your data</li>
              <li>Correct inaccurate or incomplete information</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict processing</li>
              <li>Data portability</li>
              <li>Withdraw consent at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="mt-8 mb-4 font-semibold text-2xl text-[var(--text-primary)]">
              7. Cookies and Tracking
            </h2>
            <p>
              We use cookies and similar tracking technologies to enhance your
              experience. For more information, please see our{" "}
              <Link
                className="text-sky-600 hover:text-intent-accent-strong dark:text-sky-400"
                href="/cookie-policy"
              >
                Cookie Policy
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="mt-8 mb-4 font-semibold text-2xl text-[var(--text-primary)]">
              8. Data Retention
            </h2>
            <p>
              We retain your personal information only for as long as necessary
              to fulfill the purposes outlined in this Privacy Policy, unless a
              longer retention period is required by law.
            </p>
          </section>

          <section>
            <h2 className="mt-8 mb-4 font-semibold text-2xl text-[var(--text-primary)]">
              9. International Data Transfers
            </h2>
            <p>
              Your information may be transferred to and processed in countries
              other than your country of residence. We ensure appropriate
              safeguards are in place to protect your data in accordance with
              this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="mt-8 mb-4 font-semibold text-2xl text-[var(--text-primary)]">
              10. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will
              notify you of any changes by posting the new Privacy Policy on
              this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="mt-8 mb-4 font-semibold text-2xl text-[var(--text-primary)]">
              11. Contact Us
            </h2>
            <p>
              If you have any questions about this Privacy Policy, please
              contact us at:
            </p>
            <div className="mt-4 rounded-lg border border-[var(--border-hover)] bg-[var(--bg-tertiary)] p-4">
              <p className="font-semibold text-[var(--text-primary)]">
                SECYOURALL
              </p>
              <p>Email: privacy@secyourall.com</p>
              <p>Maintained by SHYENA</p>
            </div>
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
