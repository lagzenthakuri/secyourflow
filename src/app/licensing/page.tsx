"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function Licensing() {
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

        <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-4">Licensing</h1>
        <p className="text-sm text-[var(--text-muted)] mb-8">Last updated: February 8, 2026</p>

        <div className="prose prose-invert prose-slate max-w-none space-y-6 text-[var(--text-secondary)]">
          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">1. Software License</h2>
            <p>
              SECYOURALL grants you a limited, non-exclusive, non-transferable, revocable license to use the
              SecYourFlow platform in accordance with these licensing terms and our Terms of Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">2. License Types</h2>
            
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">2.1 Individual License</h3>
            <p>
              Grants access to a single user for personal or professional use within their organization.
            </p>

            <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">2.2 Team License</h3>
            <p>
              Grants access to multiple users within a single organization, with collaborative features and
              shared workspaces.
            </p>

            <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3">2.3 Enterprise License</h3>
            <p>
              Provides comprehensive access for large organizations with custom integrations, dedicated support,
              and advanced security features.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">3. License Restrictions</h2>
            <p>You may not:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Copy, modify, or create derivative works of the Service</li>
              <li>Reverse engineer, decompile, or disassemble the Service</li>
              <li>Rent, lease, lend, sell, or sublicense the Service</li>
              <li>Transfer your license to another party without written consent</li>
              <li>Remove or alter any proprietary notices or labels</li>
              <li>Use the Service to develop competing products</li>
              <li>Exceed the usage limits of your subscription plan</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">4. Open Source Components</h2>
            <p>
              The SecYourFlow platform may include open source software components. These components are licensed
              under their respective open source licenses, which are listed below:
            </p>

            <div className="mt-6 space-y-4">
              <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Next.js</h4>
                <p className="text-sm">License: MIT License</p>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  Copyright (c) 2024 Vercel, Inc.
                </p>
              </div>

              <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">React</h4>
                <p className="text-sm">License: MIT License</p>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  Copyright (c) Meta Platforms, Inc. and affiliates.
                </p>
              </div>

              <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Prisma</h4>
                <p className="text-sm">License: Apache License 2.0</p>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  Copyright (c) 2024 Prisma Data, Inc.
                </p>
              </div>

              <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Tailwind CSS</h4>
                <p className="text-sm">License: MIT License</p>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  Copyright (c) Tailwind Labs, Inc.
                </p>
              </div>
            </div>

            <p className="mt-4">
              Full license texts for these components are available in the project repository and are incorporated
              by reference.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">5. Third-Party Services</h2>
            <p>
              The Service may integrate with third-party services and APIs. Your use of these services is subject
              to their respective terms and licenses. We are not responsible for third-party services or their
              availability.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">6. Proprietary Rights</h2>
            <p>
              All rights, title, and interest in and to the Service (excluding open source components and
              third-party content) are and will remain the exclusive property of SECYOURALL. The Service is
              protected by copyright, trademark, and other laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">7. Trademarks</h2>
            <p>
              &quot;SECYOURALL,&quot; &quot;SecYourFlow,&quot; and associated logos are trademarks of SECYOURALL. You may not use
              these trademarks without our prior written permission. All other trademarks mentioned are the
              property of their respective owners.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">8. License Termination</h2>
            <p>
              Your license to use the Service will terminate automatically if you fail to comply with these
              licensing terms. Upon termination, you must cease all use of the Service and destroy any copies
              of materials obtained from the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">9. Updates and Modifications</h2>
            <p>
              We may update, modify, or discontinue the Service or any part thereof at any time. We may also
              update these licensing terms from time to time. Continued use of the Service after such updates
              constitutes acceptance of the modified terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">10. Export Compliance</h2>
            <p>
              You agree to comply with all applicable export and import laws and regulations. You may not export
              or re-export the Service to any prohibited country or person.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">11. Government Use</h2>
            <p>
              If you are a government entity, the Service is provided as &quot;Commercial Computer Software&quot; and
              &quot;Commercial Computer Software Documentation&quot; with only those rights as granted to all other users
              under these terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-8 mb-4">12. Contact Information</h2>
            <p>
              For licensing inquiries or to request permissions beyond the scope of this license, please contact us at:
            </p>
            <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <p className="font-semibold text-[var(--text-primary)]">SECYOURALL</p>
              <p>Email: licensing@secyourall.com</p>
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
