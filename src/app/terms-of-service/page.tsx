"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
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

        <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-4">Terms of Service</h1>
        <p className="text-sm text-[var(--text-muted)] mb-8">Last updated: February 8, 2026</p>

        <div className="prose prose-invert prose-slate max-w-none space-y-6 text-[var(--text-secondary)]">
          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing and using the SecYourFlow platform (&quot;Service&quot;) provided by SECYOURALL (&quot;Company,&quot; &quot;we,&quot;
              &quot;our,&quot; or &quot;us&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree
              to these Terms, please do not use our Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">2. Description of Service</h2>
            <p>
              SecYourFlow is a cybersecurity risk management platform that provides vulnerability assessment,
              threat intelligence, compliance monitoring, and risk prioritization services. The Service is designed
              to help organizations manage their security posture and operational risk.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">3. User Accounts</h2>
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">3.1 Registration</h3>
            <p>
              To use certain features of the Service, you must register for an account. You agree to provide
              accurate, current, and complete information during registration and to update such information
              to keep it accurate, current, and complete.
            </p>

            <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">3.2 Account Security</h3>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and for all
              activities that occur under your account. You must immediately notify us of any unauthorized use
              of your account.
            </p>

            <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">3.3 Account Termination</h3>
            <p>
              We reserve the right to suspend or terminate your account if you violate these Terms or engage
              in any fraudulent, abusive, or illegal activity.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">4. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the Service for any illegal or unauthorized purpose</li>
              <li>Violate any laws in your jurisdiction</li>
              <li>Infringe upon the rights of others</li>
              <li>Transmit any malicious code, viruses, or harmful content</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Use automated systems to access the Service without permission</li>
              <li>Reverse engineer or attempt to extract source code</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">5. Intellectual Property</h2>
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">5.1 Our Rights</h3>
            <p>
              The Service and its original content, features, and functionality are owned by SECYOURALL and are
              protected by international copyright, trademark, patent, trade secret, and other intellectual
              property laws.
            </p>

            <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">5.2 Your Rights</h3>
            <p>
              You retain all rights to any data, content, or information you submit to the Service. By submitting
              content, you grant us a license to use, store, and process such content solely for the purpose of
              providing the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">6. Payment Terms</h2>
            <p>
              Certain features of the Service may require payment. You agree to pay all fees associated with
              your subscription plan. All fees are non-refundable unless otherwise stated. We reserve the right
              to change our pricing with 30 days&apos; notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">7. Data and Privacy</h2>
            <p>
              Your use of the Service is also governed by our{" "}
              <Link href="/privacy-policy" className="text-sky-400 hover:text-sky-300">Privacy Policy</Link>.
              We collect, use, and protect your data as described in that policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">8. Disclaimers</h2>
            <p>
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS
              OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
              PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
            <p className="mt-4">
              We do not warrant that the Service will be uninterrupted, secure, or error-free. You use the
              Service at your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">9. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, SECYOURALL SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
              SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED
              DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">10. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless SECYOURALL, its affiliates, and their respective officers,
              directors, employees, and agents from any claims, damages, losses, liabilities, and expenses
              (including legal fees) arising out of your use of the Service or violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">11. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with applicable laws, without regard
              to conflict of law provisions. Any disputes arising from these Terms shall be resolved in the
              appropriate courts.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">12. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. We will notify users of any material
              changes by posting the new Terms on this page and updating the &quot;Last updated&quot; date. Your continued
              use of the Service after such changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">13. Severability</h2>
            <p>
              If any provision of these Terms is found to be unenforceable or invalid, that provision shall be
              limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain
              in full force and effect.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">14. Contact Information</h2>
            <p>
              If you have any questions about these Terms, please contact us at:
            </p>
            <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <p className="font-semibold text-[var(--text-primary)]">SECYOURALL</p>
              <p>Email: legal@secyourall.com</p>
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
