import Link from "next/link";
import {
  Shield,
  ChevronRight,
  BarChart3,
  AlertTriangle,
  Server,
  FileCheck,
  Zap,
  Target,
  TrendingUp,
  Lock,
  Eye,
  Activity,
} from "lucide-react";

import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();
  const isLoggedIn = !!session?.user;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] bg-grid bg-gradient-radial">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[var(--bg-primary)]/80 backdrop-blur-xl border-b border-[var(--border-color)]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">SecYourFlow</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-[var(--text-secondary)] hover:text-white transition-all duration-300 ease-in-out">
              Features
            </a>
            <a href="#capabilities" className="text-sm text-[var(--text-secondary)] hover:text-white transition-all duration-300 ease-in-out">
              Capabilities
            </a>
            <a href="#integrations" className="text-sm text-[var(--text-secondary)] hover:text-white transition-all duration-300 ease-in-out">
              Integrations
            </a>
          </div>
          <div className="flex items-center gap-3">
            {!isLoggedIn ? (
              <Link href="/login" className="btn btn-ghost text-sm">
                Sign In
              </Link>
            ) : (
              <span className="text-sm text-[var(--text-secondary)] mr-2">
                Hi, {session?.user?.name || session?.user?.email}
              </span>
            )}
            <Link href="/dashboard" className="btn btn-primary text-sm">
              Dashboard
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-8">
            <Zap size={14} className="text-blue-400" />
            <span className="text-sm text-blue-400">Cyber Risk Operations Platform</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            <span className="text-white">Know Your</span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Cyber Risk
            </span>
          </h1>

          <p className="text-lg md:text-xl text-[var(--text-secondary)] max-w-3xl mx-auto mb-10">
            Unify vulnerabilities, assets, live threats, and compliance controls into one
            platform. Always know what&apos;s exposed, what&apos;s being exploited, and what
            could hurt your business.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/dashboard" className="btn btn-primary text-base px-8 py-3">
              <Eye size={18} />
              Explore Dashboard
            </Link>
            <a href="#features" className="btn btn-secondary text-base px-8 py-3">
              Learn More
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { value: "1,247", label: "Assets Monitored" },
              { value: "3,842", label: "Vulnerabilities Tracked" },
              { value: "23", label: "Active Threats" },
              { value: "78.3%", label: "Compliance Score" },
            ].map((stat, idx) => (
              <div key={idx} className="card p-4 text-center">
                <div className="text-2xl md:text-3xl font-bold text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-xs text-[var(--text-muted)]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Questions Section */}
      <section className="py-20 px-6 bg-[var(--bg-secondary)]" id="features">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Answer Critical Questions
            </h2>
            <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
              SecYourFlow provides real-time visibility into your security posture,
              answering the questions executives and security teams need answered.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Target,
                title: "What's Exposed?",
                description:
                  "Complete visibility into attack surface across all assets, from cloud to on-prem.",
                color: "#3b82f6",
              },
              {
                icon: AlertTriangle,
                title: "What's Being Exploited?",
                description:
                  "Real-time threat intelligence showing which vulnerabilities are actively targeted.",
                color: "#ef4444",
              },
              {
                icon: FileCheck,
                title: "What's Out of Compliance?",
                description:
                  "Continuous compliance monitoring against ISO 27001, NIST, PCI DSS, and more.",
                color: "#8b5cf6",
              },
              {
                icon: TrendingUp,
                title: "What Could Hurt Business?",
                description:
                  "Risk scoring that factors in asset criticality, exploitability, and business impact.",
                color: "#f97316",
              },
            ].map((item, idx) => (
              <div key={idx} className="card p-6 group">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                  style={{ background: `${item.color}20` }}
                >
                  <item.icon size={24} style={{ color: item.color }} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section className="py-20 px-6" id="capabilities">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Core Capabilities
            </h2>
            <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
              Everything you need to manage cyber risk in one unified platform.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Server,
                title: "Asset Inventory",
                description:
                  "Comprehensive inventory of servers, applications, domains, cloud resources, containers, and more.",
              },
              {
                icon: Shield,
                title: "Vulnerability Management",
                description:
                  "Import findings from Nessus, OpenVAS, Nmap, Trivy, Qualys, and other leading scanners.",
              },
              {
                icon: Zap,
                title: "Threat Intelligence",
                description:
                  "CVE enrichment with EPSS scores, CISA KEV status, and active exploitation indicators.",
              },
              {
                icon: BarChart3,
                title: "Risk Scoring",
                description:
                  "Dynamic risk scores combining CVSS, asset criticality, exposure, and exploitability.",
              },
              {
                icon: FileCheck,
                title: "Compliance Mapping",
                description:
                  "Map vulnerabilities to ISO 27001, NIST CSF, PCI DSS, SOC 2, and custom frameworks.",
              },
              {
                icon: Activity,
                title: "Executive Dashboards",
                description:
                  "Real-time visibility for executives and security teams with actionable insights.",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="card p-6 flex gap-4 group hover:border-blue-500/30"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/20 transition-all duration-300 ease-in-out">
                  <item.icon size={20} className="text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section className="py-20 px-6 bg-[var(--bg-secondary)]" id="integrations">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Integrations
            </h2>
            <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
              Connect with your existing security tools and data sources.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              "Nessus",
              "OpenVAS",
              "Trivy",
              "Qualys",
              "Rapid7",
              "CrowdStrike",
              "Nmap",
              "NVD",
              "CISA KEV",
              "MITRE ATT&CK",
              "EPSS",
              "AWS",
            ].map((tool) => (
              <div
                key={tool}
                className="card p-4 text-center hover:border-blue-500/30 transition-all duration-300 ease-in-out"
              >
                <span className="text-sm font-medium text-[var(--text-secondary)]">
                  {tool}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="card p-12 border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-purple-500/5">
            <Lock size={48} className="text-blue-400 mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Take Control of Cyber Risk?
            </h2>
            <p className="text-[var(--text-secondary)] mb-8 max-w-2xl mx-auto">
              Explore the platform to see how SecYourFlow unifies your
              security operations into a single pane of glass.
            </p>
            <Link href="/dashboard" className="btn btn-primary text-base px-8 py-3">
              <Eye size={18} />
              Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-[var(--border-color)]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-white">SecYourFlow</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-[var(--text-muted)]">
              <a href="#" className="hover:text-white transition-all duration-300 ease-in-out">
                Privacy
              </a>
              <a href="#" className="hover:text-white transition-all duration-300 ease-in-out">
                Terms
              </a>
              <a href="#" className="hover:text-white transition-all duration-300 ease-in-out">
                Documentation
              </a>
              <a href="#" className="hover:text-white transition-all duration-300 ease-in-out">
                GitHub
              </a>
            </div>
            <div className="text-sm text-[var(--text-muted)]">
              © 2026 SecYourFlow. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
