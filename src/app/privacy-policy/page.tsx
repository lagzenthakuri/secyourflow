"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-sky-400 hover:text-sky-300 transition-colors mb-8"
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>

        <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-4">Privacy Policy</h1>
        <p className="text-sm text-[var(--text-muted)] mb-8">Last updated: February 8, 2026</p>

        <div className="prose prose-invert prose-slate max-w-none space-y-6 text-[var(--text-secondary)]">
          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">1. Introduction</h2>
            <p>
              Welcome to SECYOURALL (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting your
              personal information and your right to privacy. This Privacy Policy explains how we collect, use,
              disclose, and safeguard your information when you use our SecYourFlow platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">2. Information We Collect</h2>
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">2.1 Personal Information</h3>
            <p>We may collect the following types of personal information:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Name and contact information (email address, phone number)</li>
              <li>Account credentials (username, password)</li>
              <li>Organization details</li>
              <li>Payment and billing information</li>
              <li>Two-factor authentication data</li>
            </ul>

            <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">2.2 Usage Data</h3>
            <p>We automatically collect certain information when you use our platform:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Log data (IP address, browser type, operating system)</li>
              <li>Device information</li>
              <li>Usage patterns and preferences</li>
              <li>Security scan results and vulnerability data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">3. How We Use Your Information</h2>
            <p>We use the collected information for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-2">
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
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">4. Data Sharing and Disclosure</h2>
            <p>We may share your information in the following circumstances:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>With service providers who assist in operating our platform</li>
              <li>When required by law or to protect our rights</li>
              <li>In connection with a business transfer or acquisition</li>
              <li>With your consent or at your direction</li>
            </ul>
            <p className="mt-4">
              We do not sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">5. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal information
              against unauthorized access, alteration, disclosure, or destruction. These measures include:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security assessments and audits</li>
              <li>Access controls and authentication mechanisms</li>
              <li>Employee training on data protection</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">6. Your Rights</h2>
            <p>You have the following rights regarding your personal information:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access and obtain a copy of your data</li>
              <li>Correct inaccurate or incomplete information</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict processing</li>
              <li>Data portability</li>
              <li>Withdraw consent at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">7. Cookies and Tracking</h2>
            <p>
              We use cookies and similar tracking technologies to enhance your experience. For more information,
              please see our <Link href="/cookie-policy" className="text-sky-400 hover:text-sky-300">Cookie Policy</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">8. Data Retention</h2>
            <p>
              We retain your personal information only for as long as necessary to fulfill the purposes outlined
              in this Privacy Policy, unless a longer retention period is required by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">9. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your country of residence.
              We ensure appropriate safeguards are in place to protect your data in accordance with this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting
              the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">11. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <p className="font-semibold text-[var(--text-primary)]">SECYOURALL</p>
              <p>Email: privacy@secyourall.com</p>
              <p>Maintained by SHYENA</p>
            </div>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800">
          <p className="text-sm text-slate-500 text-center">
            © 2026 SECYOURALL. ALL RIGHTS RESERVED.
          </p>
        </div>
      </div>
    </div>
  );
}
