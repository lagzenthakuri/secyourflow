"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, MapPin, Send, ArrowRight } from "lucide-react";
import { useState } from "react";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: "" });

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          access_key: process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY,
          name: formData.name,
          email: formData.email,
          message: formData.message,
          subject: "New Contact Form Submission from SecYourFlow",
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSubmitStatus({
          type: "success",
          message: "Thank you! Your message has been sent successfully.",
        });
        setFormData({ name: "", email: "", message: "" });
      } else {
        setSubmitStatus({
          type: "error",
          message: "Something went wrong. Please try again.",
        });
      }
    } catch (error) {
      setSubmitStatus({
        type: "error",
        message: "Failed to send message. Please try again later.",
      });
      console.error("Form submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Background Effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute -top-56 left-1/2 h-[680px] w-[980px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.15),rgba(10,10,15,0)_64%)]" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-[rgba(10,10,15,0.84)] backdrop-blur-xl" role="navigation" aria-label="Main navigation">
        <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-6">
          <Link href="/" className="inline-flex items-center gap-3" aria-label="SecYourFlow home">
            <Image
              src="/logo1.png"
              alt="SecYourFlow logo"
              width={40}
              height={40}
            />
            <span className="text-xs font-semibold tracking-[0.25em] text-[var(--text-primary)] sm:text-sm">
              SECYOUR<span className="text-sky-300">FLOW</span>
            </span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <Link href="/#features" className="text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] focus:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2 focus:ring-offset-slate-950 rounded px-2 py-1">
              Platform
            </Link>
            <Link href="/#workflow" className="text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] focus:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2 focus:ring-offset-slate-950 rounded px-2 py-1">
              Workflow
            </Link>
            <Link href="/#use-cases" className="text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] focus:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2 focus:ring-offset-slate-950 rounded px-2 py-1">
              Use Cases
            </Link>
            <Link href="/#outcomes" className="text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] focus:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2 focus:ring-offset-slate-950 rounded px-2 py-1">
              Outcomes
            </Link>
            <Link href="/contact" className="text-sm text-sky-300 transition hover:text-[var(--text-primary)] focus:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2 focus:ring-offset-slate-950 rounded px-2 py-1">
              Contact
            </Link>
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

      {/* Main Content */}
      <div className="relative z-10 pt-20">
        <div className="min-h-screen flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-16 items-center">
            
            {/* Left Side - Contact Info */}
            <div className="space-y-12">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors group"
              >
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                BACK TO HOME
              </Link>

              <div>
                <h1 className="text-5xl lg:text-6xl font-bold text-[var(--text-primary)] mb-6">
                  Contact <span className="text-blue-400">Us</span>
                </h1>
                <p className="text-lg text-[var(--text-muted)] leading-relaxed">
                  Get in touch with us. We would love to hear from you!
                </p>
              </div>

              <div className="space-y-8">
                <h2 className="text-sm font-semibold text-blue-400 uppercase tracking-wider">
                  GET IN TOUCH
                </h2>

                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-5 h-5 flex items-center justify-center">
                      <Mail size={20} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1">EMAIL</p>
                      <p className="text-[var(--text-primary)] font-medium">thakurizen2@gmail.com</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-5 h-5 flex items-center justify-center">
                      <Phone size={20} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1">PHONE</p>
                      <p className="text-[var(--text-primary)] font-medium">+977 9849291185</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-5 h-5 flex items-center justify-center">
                      <MapPin size={20} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1">ADDRESS</p>
                      <p className="text-[var(--text-primary)] font-medium">Kathmandu 44600</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Contact Form */}
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-8 uppercase tracking-wide">
                SEND US A MESSAGE
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                {submitStatus.type && (
                  <div
                    className={`p-4 rounded-lg border ${
                      submitStatus.type === "success"
                        ? "bg-green-500/10 border-green-500/50 text-green-400"
                        : "bg-red-500/10 border-red-500/50 text-red-400"
                    }`}
                  >
                    {submitStatus.message}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-3">
                      NAME
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-4 bg-slate-800/50 border border-slate-700/50 rounded-lg text-[var(--text-primary)] placeholder-slate-500 focus:outline-none focus:border-blue-400/50 focus:ring-1 focus:ring-blue-400/50 transition-all duration-300"
                      placeholder="Your name"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-3">
                      EMAIL
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-4 bg-slate-800/50 border border-slate-700/50 rounded-lg text-[var(--text-primary)] placeholder-slate-500 focus:outline-none focus:border-blue-400/50 focus:ring-1 focus:ring-blue-400/50 transition-all duration-300"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-3">
                    MESSAGE
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="w-full px-4 py-4 bg-slate-800/50 border border-slate-700/50 rounded-lg text-[var(--text-primary)] placeholder-slate-500 focus:outline-none focus:border-blue-400/50 focus:ring-1 focus:ring-blue-400/50 transition-all duration-300 resize-none"
                    placeholder="Your message here..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full px-6 py-4 bg-blue-500 hover:bg-blue-600 text-[var(--text-primary)] font-semibold rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group uppercase tracking-wide"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      SENDING...
                    </>
                  ) : (
                    <>
                      <Send size={18} className="group-hover:translate-x-1 transition-transform" />
                      SEND MESSAGE
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
