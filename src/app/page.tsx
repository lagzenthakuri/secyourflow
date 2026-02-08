"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ChevronRight,
  FileCheck2,
  Gauge,
  LockKeyhole,
  Radar,
  ShieldCheck,
  Siren,
  Users,
  Zap,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";

const capabilityCards = [
  {
    icon: Radar,
    title: "Threat Signal Correlation",
    description:
      "Combine vulnerability exposure, threat intelligence, and asset criticality in one clear queue.",
  },
  {
    icon: ShieldCheck,
    title: "Risk-Weighted Prioritization",
    description:
      "Score what matters first so analysts spend time on business impact instead of noisy severity lists.",
  },
  {
    icon: FileCheck2,
    title: "Compliance Context",
    description:
      "Track control drift and tie findings directly to SOC 2, ISO 27001, and your internal policy controls.",
  },
];

const workflowSteps = [
  {
    step: "01",
    title: "Ingest Security Data",
    description:
      "Connect scanner output, asset inventories, and threat feeds without replacing your existing tools.",
  },
  {
    step: "02",
    title: "Correlate and Score",
    description:
      "Blend CVSS, EPSS, exploit status, and business criticality into one operational risk model.",
  },
  {
    step: "03",
    title: "Act and Report",
    description:
      "Assign remediation owners, monitor SLA progress, and publish leadership-ready updates quickly.",
  },
];

const signalRows = [
  { label: "External Attack Surface", level: 91, tone: "bg-sky-300" },
  { label: "Exploit Activity Monitoring", level: 84, tone: "bg-cyan-300" },
  { label: "Compliance Control Coverage", level: 88, tone: "bg-blue-300" },
];

const outcomeCards = [
  { value: "< 5 min", label: "Average triage cycle" },
  { value: "24x7", label: "Continuous monitoring" },
  { value: "SOC-ready", label: "Audit evidence trail" },
];

const statsData = [
  { icon: Users, value: 500, suffix: "+", label: "Security Teams" },
  { icon: Zap, value: 98, suffix: "%", label: "Faster Triage" },
  { icon: TrendingUp, value: 10000, suffix: "+", label: "Threats Analyzed" },
];



function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [target]);

  return (
    <span>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

export default function Home() {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [sectionsVisible, setSectionsVisible] = useState<Record<string, boolean>>({});
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    setIsVisible(true);

    // Parallax scroll effect
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    // Intersection Observer for scroll animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setSectionsVisible((prev) => ({
              ...prev,
              [entry.target.id]: true,
            }));
          }
        });
      },
      { threshold: 0.1 }
    );

    // Observe all sections
    const sections = document.querySelectorAll('[data-animate]');
    sections.forEach((section) => observer.observe(section));

    // Smooth scroll for anchor links
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a[href^="#"]');
      if (anchor) {
        e.preventDefault();
        const href = anchor.getAttribute("href");
        if (href) {
          const element = document.querySelector(href);
          element?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("click", handleClick);
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("click", handleClick);
      sections.forEach((section) => observer.unobserve(section));
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] scroll-smooth">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-grid opacity-45" />
        <div 
          className="absolute -top-56 left-1/2 h-[680px] w-[980px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.26),rgba(10,10,15,0)_64%)] transition-transform duration-300"
          style={{ transform: `translate(-50%, ${scrollY * 0.15}px)` }}
        />
        <div 
          className="absolute bottom-[-220px] right-[-140px] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.22),rgba(10,10,15,0)_72%)] transition-transform duration-300"
          style={{ transform: `translate(0, ${-scrollY * 0.1}px)` }}
        />
      </div>

      <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-[rgba(10,10,15,0.84)] backdrop-blur-xl" role="navigation" aria-label="Main navigation">
        <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-6">
          <Link href="/" className="inline-flex items-center gap-3" aria-label="SecYourFlow home">
            <Image
              src="/logo1.png"
              alt="SecYourFlow logo"
              width={40}
              height={40}
            />
            <span className="text-xs font-semibold tracking-[0.25em] text-white sm:text-sm">
              SECYOUR<span className="text-sky-300">FLOW</span>
            </span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-slate-300 transition hover:text-white focus:text-white focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2 focus:ring-offset-slate-950 rounded px-2 py-1">
              Platform
            </a>
            <a href="#workflow" className="text-sm text-slate-300 transition hover:text-white focus:text-white focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2 focus:ring-offset-slate-950 rounded px-2 py-1">
              Workflow
            </a>
            <a href="#use-cases" className="text-sm text-slate-300 transition hover:text-white focus:text-white focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2 focus:ring-offset-slate-950 rounded px-2 py-1">
              Use Cases
            </a>
            <a href="#outcomes" className="text-sm text-slate-300 transition hover:text-white focus:text-white focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2 focus:ring-offset-slate-950 rounded px-2 py-1">
              Outcomes
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_10px_28px_-16px_rgba(56,189,248,0.9)] transition hover:bg-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              Dashboard
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        <section className="px-6 pb-20 pt-32" aria-label="Hero section">
          <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className={`transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/30 bg-sky-300/10 px-3 py-1.5 text-xs font-medium text-sky-200">
                <Activity size={14} />
                SOC-grade cyber risk command center
              </div>

              <h1 className="mt-6 text-4xl font-semibold leading-tight text-white sm:text-5xl xl:text-6xl">
                Operationalize cyber risk with
                <span className="animate-gradient bg-gradient-to-r from-sky-200 via-cyan-200 to-blue-300 bg-clip-text text-transparent bg-[length:200%_auto]">
                  {" "}
                  live SOC clarity
                </span>
                .
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
                SecYourFlow unifies exposure, active threats, and compliance drift into one
                focused workspace so your team can prioritize what matters first.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-300 px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_14px_32px_-18px_rgba(56,189,248,0.95)] transition hover:bg-sky-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2 focus:ring-offset-slate-950"
                >
                  Open Dashboard
                  <ChevronRight size={16} />
                </Link>
                <Link
                  href="/risk-register"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-slate-100 transition hover:border-white/25 hover:bg-white/10 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2 focus:ring-offset-slate-950"
                >
                  Review Risk Register
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-2 text-xs text-slate-300">
                {["Signal-first workflows", "Analyst-ready context", "Executive-level clarity"].map((item) => (
                  <span key={item} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <article className={`transition-all duration-700 delay-150 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.85)] p-6 shadow-[0_30px_70px_-34px_rgba(56,189,248,0.65)]`} aria-label="Live security metrics">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                  Live SOC Snapshot
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white">
                  Current posture: controlled
                </h2>
              </div>

              <div className="mt-7 space-y-5">
                {signalRows.map((signal, idx) => (
                  <div key={signal.label} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-300">{signal.label}</span>
                      <span className="font-medium text-white">{signal.level}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${signal.tone} transition-all duration-1000 ease-out`}
                        style={{ 
                          width: isVisible ? `${signal.level}%` : '0%',
                          transitionDelay: `${600 + idx * 150}ms`
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-7 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs text-slate-400">Open High Risk</p>
                  <p className="mt-2 text-2xl font-semibold text-white">14</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs text-slate-400">Control Drift</p>
                  <p className="mt-2 text-2xl font-semibold text-white">6</p>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="px-6 py-16 bg-[rgba(9,14,22,0.5)]" aria-label="Platform statistics">
          <div className="mx-auto w-full max-w-6xl">
            <div className="grid gap-8 md:grid-cols-3">
              {statsData.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className={`text-center transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                    style={{ transitionDelay: `${300 + index * 100}ms` }}
                  >
                    <div className="inline-flex rounded-full border border-sky-300/30 bg-sky-300/10 p-3 text-sky-200">
                      <Icon size={24} />
                    </div>
                    <p className="mt-4 text-4xl font-bold text-white">
                      <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                    </p>
                    <p className="mt-2 text-sm text-slate-300">{stat.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="features" data-animate="features" className="scroll-mt-28 px-6 py-20" aria-labelledby="features-heading">
          <div className="mx-auto w-full max-w-6xl">
            <div className={`max-w-3xl transition-all duration-700 ${sectionsVisible.features ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
                Platform
              </p>
              <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
                Built for teams that need signal over noise.
              </h2>
              <p className="mt-4 text-slate-300">
                Every panel is designed to answer one question quickly: what creates the
                most business risk right now?
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {capabilityCards.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.title}
                    className={`group rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.78)] p-6 transition-all duration-700 hover:-translate-y-1 hover:border-sky-300/35 hover:bg-[rgba(20,20,30,0.95)] ${sectionsVisible.features ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                    style={{ transitionDelay: `${idx * 100}ms` }}
                  >
                    <div className="inline-flex rounded-lg border border-sky-300/35 bg-sky-300/10 p-2.5 text-sky-200 transition-all duration-300 group-hover:scale-110">
                      <Icon size={18} />
                    </div>
                    <h3 className="mt-5 text-lg font-semibold text-white">{item.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-slate-300">
                      {item.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section
          id="workflow"
          data-animate="workflow"
          className="scroll-mt-28 border-y border-white/10 bg-[rgba(9,14,22,0.66)] px-6 py-20"
        >
          <div className="mx-auto w-full max-w-6xl">
            <div className={`flex flex-col gap-4 md:flex-row md:items-end md:justify-between transition-all duration-700 ${sectionsVisible.workflow ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
                  Workflow
                </p>
                <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
                  A practical flow from intake to remediation.
                </h2>
              </div>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-sm font-medium text-sky-200 transition hover:text-sky-100"
              >
                See it in dashboard
                <ArrowRight size={15} />
              </Link>
            </div>

            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {workflowSteps.map((item, idx) => (
                <article
                  key={item.step}
                  className={`group rounded-2xl border border-white/10 bg-[rgba(14,18,28,0.84)] p-6 transition-all duration-700 hover:border-sky-300/30 hover:-translate-y-1 ${sectionsVisible.workflow ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{ transitionDelay: `${idx * 100}ms` }}
                >
                  <div className="text-xs font-semibold tracking-[0.22em] text-sky-300">
                    STEP {item.step}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-300">{item.description}</p>
                  <div className="mt-4 h-1 w-0 rounded-full bg-gradient-to-r from-sky-400 to-cyan-400 transition-all duration-500 group-hover:w-12" />
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="outcomes" data-animate="outcomes" className="scroll-mt-20 px-6 py-24">
          <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className={`transition-all duration-700 ${sectionsVisible.outcomes ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <p className="text-xs font-bold uppercase tracking-wider text-sky-400">
                Outcomes
              </p>
              <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
                Security leadership gets clean answers, fast
              </h2>
              <p className="mt-4 max-w-2xl text-slate-400 leading-relaxed">
                Analysts move faster, priorities stay defensible, and reporting stays ready
                for leadership and audits.
              </p>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {outcomeCards.map((item, idx) => (
                  <article 
                    key={item.label} 
                    className={`rounded-xl border border-slate-800/50 bg-slate-900/30 p-5 backdrop-blur-sm transition-all duration-700 hover:border-slate-700/50 hover:bg-slate-900/50 hover:-translate-y-0.5 ${sectionsVisible.outcomes ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                    style={{ transitionDelay: `${idx * 100}ms` }}
                  >
                    <p className="text-2xl font-black text-white">{item.value}</p>
                    <p className="mt-2 text-sm text-slate-500">{item.label}</p>
                  </article>
                ))}
              </div>
            </div>

            <aside className={`group relative overflow-hidden rounded-xl border border-sky-400/20 bg-gradient-to-br from-sky-400/10 to-slate-900/50 p-7 backdrop-blur-sm transition-all duration-700 hover:border-sky-400/30 ${sectionsVisible.outcomes ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '300ms' }}>
              <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-sky-500/10 blur-3xl transition-all duration-700 group-hover:bg-sky-500/20" />
              <div className="relative inline-flex rounded-lg border border-sky-400/30 bg-sky-400/10 p-2.5 text-sky-300 transition-all duration-300 group-hover:scale-110">
                <LockKeyhole size={18} />
              </div>
              <h3 className="relative mt-5 text-xl font-bold text-white">
                Ready for a cleaner security command surface?
              </h3>
              <p className="relative mt-3 text-sm leading-relaxed text-slate-300">
                Move from scattered data to a single operational view built for
                high-confidence decisions.
              </p>

              <div className="relative mt-6 space-y-2.5 text-sm text-slate-300">
                <div className="flex items-center gap-2.5 transition-all duration-300 hover:translate-x-1 hover:text-white">
                  <Gauge size={15} className="text-sky-400" />
                  Risk score clarity for every critical asset
                </div>
                <div className="flex items-center gap-2.5 transition-all duration-300 hover:translate-x-1 hover:text-white">
                  <Siren size={15} className="text-sky-400" />
                  Prioritized response queue for exploited issues
                </div>
                <div className="flex items-center gap-2.5 transition-all duration-300 hover:translate-x-1 hover:text-white">
                  <FileCheck2 size={15} className="text-sky-400" />
                  Compliance mapping tied to remediation
                </div>
              </div>

              <div className="relative mt-7 flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Link
                  href="/dashboard"
                  className="group/btn inline-flex items-center justify-center gap-2 rounded-lg bg-sky-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-all duration-300 hover:bg-sky-300"
                >
                  Launch Platform
                  <ChevronRight size={15} className="transition-transform group-hover/btn:translate-x-0.5" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900/50 px-5 py-2.5 text-sm text-slate-300 backdrop-blur-sm transition-all duration-300 hover:border-slate-600 hover:bg-slate-800/50 hover:text-white"
                >
                  Sign In
                </Link>
              </div>
            </aside>
          </div>
        </section>
      </main>


    </div>
  );
}
