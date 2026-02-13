"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function CookiePolicy() {
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

        <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-4">Cookie Policy</h1>
        <p className="text-sm text-[var(--text-muted)] mb-8">Last updated: February 8, 2026</p>

        <div className="prose prose-invert prose-slate max-w-none space-y-6 text-[var(--text-secondary)]">
          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">1. What Are Cookies</h2>
            <p>
              Cookies are small text files that are placed on your device when you visit our website. They are
              widely used to make websites work more efficiently and provide information to website owners.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">2. How We Use Cookies</h2>
            <p>
              SECYOURALL uses cookies to enhance your experience on the SecYourFlow platform. We use cookies for
              the following purposes:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Authentication and security</li>
              <li>Remembering your preferences and settings</li>
              <li>Analyzing how you use our Service</li>
              <li>Improving platform performance</li>
              <li>Providing personalized content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">3. Types of Cookies We Use</h2>

            <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">3.1 Essential Cookies</h3>
            <p>
              These cookies are necessary for the Service to function properly. They enable core functionality
              such as security, authentication, and session management. The Service cannot function properly
              without these cookies.
            </p>
            <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <p className="text-sm"><strong>Examples:</strong></p>
              <ul className="list-disc pl-6 mt-2 text-sm space-y-1">
                <li>Session cookies for authentication</li>
                <li>Security tokens</li>
                <li>Load balancing cookies</li>
              </ul>
            </div>

            <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">3.2 Functional Cookies</h3>
            <p>
              These cookies enable enhanced functionality and personalization. They remember your choices and
              preferences to provide a more personalized experience.
            </p>
            <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <p className="text-sm"><strong>Examples:</strong></p>
              <ul className="list-disc pl-6 mt-2 text-sm space-y-1">
                <li>Language preferences</li>
                <li>Theme settings (dark/light mode)</li>
                <li>Dashboard layout preferences</li>
              </ul>
            </div>

            <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">3.3 Analytics Cookies</h3>
            <p>
              These cookies help us understand how visitors interact with our Service by collecting and reporting
              information anonymously. This helps us improve the Service.
            </p>
            <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <p className="text-sm"><strong>Examples:</strong></p>
              <ul className="list-disc pl-6 mt-2 text-sm space-y-1">
                <li>Page view tracking</li>
                <li>Feature usage statistics</li>
                <li>Performance metrics</li>
              </ul>
            </div>

            <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">3.4 Performance Cookies</h3>
            <p>
              These cookies collect information about how you use our Service, such as which pages you visit most
              often. This data is used to optimize the Service and improve user experience.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">4. Third-Party Cookies</h2>
            <p>
              We may use third-party services that set cookies on your device. These services help us provide
              and improve our Service. Third-party cookies are subject to the respective privacy policies of
              these external services.
            </p>
            <div className="mt-4 space-y-3">
              <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <p className="font-semibold text-[var(--text-primary)]">Authentication Services</p>
                <p className="text-sm mt-1">NextAuth.js for secure authentication</p>
              </div>
              <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <p className="font-semibold text-[var(--text-primary)]">Analytics Services</p>
                <p className="text-sm mt-1">Usage analytics to improve platform performance</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">5. Cookie Duration</h2>
            <p>Cookies may be either:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Session Cookies:</strong> Temporary cookies that expire when you close your browser
              </li>
              <li>
                <strong>Persistent Cookies:</strong> Cookies that remain on your device for a set period or
                until you delete them
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">6. Managing Cookies</h2>
            <p>
              You have the right to decide whether to accept or reject cookies. You can manage your cookie
              preferences through your browser settings.
            </p>

            <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">6.1 Browser Settings</h3>
            <p>
              Most web browsers allow you to control cookies through their settings. You can set your browser to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Block all cookies</li>
              <li>Accept only first-party cookies</li>
              <li>Delete cookies when you close your browser</li>
              <li>Notify you when a cookie is set</li>
            </ul>

            <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">6.2 Browser-Specific Instructions</h3>
            <div className="mt-4 space-y-2 text-sm">
              <p>
                <strong>Chrome:</strong> Settings → Privacy and security → Cookies and other site data
              </p>
              <p>
                <strong>Firefox:</strong> Settings → Privacy & Security → Cookies and Site Data
              </p>
              <p>
                <strong>Safari:</strong> Preferences → Privacy → Cookies and website data
              </p>
              <p>
                <strong>Edge:</strong> Settings → Cookies and site permissions → Cookies and site data
              </p>
            </div>

            <p className="mt-4 text-sm text-amber-400">
              <strong>Note:</strong> Blocking or deleting cookies may impact your ability to use certain features
              of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">7. Do Not Track Signals</h2>
            <p>
              Some browsers include a &quot;Do Not Track&quot; (DNT) feature that signals to websites that you do not want
              to have your online activity tracked. We respect DNT signals and will not track users who have
              enabled this feature.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">8. Local Storage</h2>
            <p>
              In addition to cookies, we may use local storage technologies (such as HTML5 local storage) to
              store preferences and improve performance. Local storage is similar to cookies but can store
              larger amounts of data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">9. Updates to This Policy</h2>
            <p>
              We may update this Cookie Policy from time to time to reflect changes in our practices or for
              other operational, legal, or regulatory reasons. We will notify you of any material changes by
              posting the updated policy on this page.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">10. More Information</h2>
            <p>
              For more information about how we handle your personal data, please see our{" "}
              <Link href="/privacy-policy" className="text-sky-400 hover:text-sky-300">Privacy Policy</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">11. Contact Us</h2>
            <p>
              If you have any questions about our use of cookies, please contact us at:
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
