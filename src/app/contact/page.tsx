"use client";
import { Input as BoilerplateInput } from "@repo/design-system/components/ui/input";
import { Textarea as BoilerplateTextarea } from "@repo/design-system/components/ui/textarea";
import { ArrowLeft, ArrowRight, Mail, MapPin, Phone, Send } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
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
        <div className="hero-radial-soft absolute -top-56 left-1/2 h-[680px] w-[980px] -translate-x-1/2 rounded-full" />
      </div>

      {/* Navigation */}
      <nav
        aria-label="Main navigation"
        className="marketing-nav-glass fixed top-0 z-50 w-full border-b backdrop-blur-xl"
      >
        <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-6">
          <Link
            aria-label="SecYourFlow home"
            className="inline-flex items-center gap-3"
            href="/"
          >
            <Image
              alt="SecYourFlow logo"
              height={40}
              src="/logo1.png"
              width={40}
            />
            <span className="font-semibold text-[var(--text-primary)] text-xs tracking-[0.25em] sm:text-sm">
              SECYOUR<span className="text-intent-accent">FLOW</span>
            </span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <Link
              className="rounded px-2 py-1 text-[var(--text-secondary)] text-sm transition hover:text-[var(--text-primary)] focus:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2 focus:ring-offset-[var(--focus-ring-offset)]"
              href="/#features"
            >
              Platform
            </Link>
            <Link
              className="rounded px-2 py-1 text-[var(--text-secondary)] text-sm transition hover:text-[var(--text-primary)] focus:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2 focus:ring-offset-[var(--focus-ring-offset)]"
              href="/#workflow"
            >
              Workflow
            </Link>
            <Link
              className="rounded px-2 py-1 text-[var(--text-secondary)] text-sm transition hover:text-[var(--text-primary)] focus:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2 focus:ring-offset-[var(--focus-ring-offset)]"
              href="/#use-cases"
            >
              Use Cases
            </Link>
            <Link
              className="rounded px-2 py-1 text-[var(--text-secondary)] text-sm transition hover:text-[var(--text-primary)] focus:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2 focus:ring-offset-[var(--focus-ring-offset)]"
              href="/#outcomes"
            >
              Outcomes
            </Link>
            <Link
              className="rounded px-2 py-1 text-intent-accent text-sm transition hover:text-[var(--text-primary)] focus:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2 focus:ring-offset-[var(--focus-ring-offset)]"
              href="/contact"
            >
              Contact
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              className="inline-flex items-center gap-2 rounded-xl bg-sky-300 px-4 py-2 font-semibold text-slate-950 text-sm shadow-[0_10px_28px_-16px_rgba(56,189,248,0.9)] transition hover:bg-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2 focus:ring-offset-[var(--focus-ring-offset)]"
              href="/dashboard"
            >
              Dashboard
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 pt-20">
        <div className="flex min-h-screen items-center justify-center px-6 py-12">
          <div className="grid w-full max-w-6xl items-center gap-16 lg:grid-cols-2">
            {/* Left Side - Contact Info */}
            <div className="space-y-12">
              <Link
                className="group inline-flex items-center gap-2 text-intent-accent text-sm transition-colors hover:text-intent-accent-strong"
                href="/"
              >
                <ArrowLeft
                  className="transition-transform group-hover:-translate-x-1"
                  size={16}
                />
                BACK TO HOME
              </Link>

              <div>
                <h1 className="mb-6 font-bold text-5xl text-[var(--text-primary)] lg:text-6xl">
                  Contact <span className="text-intent-accent">Us</span>
                </h1>
                <p className="text-[var(--text-muted)] text-lg leading-relaxed">
                  Get in touch with us. We would love to hear from you!
                </p>
              </div>

              <div className="space-y-8">
                <h2 className="font-semibold text-intent-accent text-sm uppercase tracking-wider">
                  GET IN TOUCH
                </h2>

                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-5 w-5 items-center justify-center">
                      <Mail className="text-intent-accent" size={20} />
                    </div>
                    <div>
                      <p className="mb-1 font-medium text-[var(--text-secondary)] text-sm uppercase tracking-wide">
                        EMAIL
                      </p>
                      <p className="font-medium text-[var(--text-primary)]">
                        thakurizen2@gmail.com
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex h-5 w-5 items-center justify-center">
                      <Phone className="text-intent-accent" size={20} />
                    </div>
                    <div>
                      <p className="mb-1 font-medium text-[var(--text-secondary)] text-sm uppercase tracking-wide">
                        PHONE
                      </p>
                      <p className="font-medium text-[var(--text-primary)]">
                        +977 9849291185
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex h-5 w-5 items-center justify-center">
                      <MapPin className="text-intent-accent" size={20} />
                    </div>
                    <div>
                      <p className="mb-1 font-medium text-[var(--text-secondary)] text-sm uppercase tracking-wide">
                        ADDRESS
                      </p>
                      <p className="font-medium text-[var(--text-primary)]">
                        Kathmandu 44600
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Contact Form */}
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-8 backdrop-blur-sm">
              <h2 className="mb-8 font-bold text-2xl text-[var(--text-primary)] uppercase tracking-wide">
                SEND US A MESSAGE
              </h2>

              <form className="space-y-6" onSubmit={handleSubmit}>
                {submitStatus.type && (
                  <div
                    className={`rounded-lg border p-4 ${
                      submitStatus.type === "success"
                        ? "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400"
                        : "border-red-500/50 bg-red-500/10 text-intent-danger"
                    }`}
                  >
                    {submitStatus.message}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label
                      className="mb-3 block font-medium text-[var(--text-secondary)] text-sm uppercase tracking-wide"
                      htmlFor="name"
                    >
                      NAME
                    </label>
                    <BoilerplateInput
                      className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-4 text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-all duration-300 focus:border-blue-400/50 focus:outline-none focus:ring-1 focus:ring-blue-400/50"
                      id="name"
                      name="name"
                      onChange={handleChange}
                      placeholder="Your name"
                      required
                      type="text"
                      value={formData.name}
                    />
                  </div>

                  <div>
                    <label
                      className="mb-3 block font-medium text-[var(--text-secondary)] text-sm uppercase tracking-wide"
                      htmlFor="email"
                    >
                      EMAIL
                    </label>
                    <BoilerplateInput
                      className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-4 text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-all duration-300 focus:border-blue-400/50 focus:outline-none focus:ring-1 focus:ring-blue-400/50"
                      id="email"
                      name="email"
                      onChange={handleChange}
                      placeholder="your@email.com"
                      required
                      type="email"
                      value={formData.email}
                    />
                  </div>
                </div>

                <div>
                  <label
                    className="mb-3 block font-medium text-[var(--text-secondary)] text-sm uppercase tracking-wide"
                    htmlFor="message"
                  >
                    MESSAGE
                  </label>
                  <BoilerplateTextarea
                    className="w-full resize-none rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-4 text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-all duration-300 focus:border-blue-400/50 focus:outline-none focus:ring-1 focus:ring-blue-400/50"
                    id="message"
                    name="message"
                    onChange={handleChange}
                    placeholder="Your message here..."
                    required
                    rows={6}
                    value={formData.message}
                  />
                </div>

                <button
                  className="group flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-6 py-4 font-semibold text-white uppercase tracking-wide transition-all duration-300 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-[var(--focus-ring-offset)] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      SENDING...
                    </>
                  ) : (
                    <>
                      <Send
                        className="transition-transform group-hover:translate-x-1"
                        size={18}
                      />
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
