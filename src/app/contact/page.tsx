"use client";

import Link from "next/link";
import { ArrowLeft, Mail, MessageSquare, Phone, MapPin } from "lucide-react";
import { useState } from "react";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log("Form submitted:", formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-sky-400 hover:text-sky-300 transition-colors mb-8"
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>

        <h1 className="text-4xl font-bold text-white mb-4">Contact Us</h1>
        <p className="text-slate-400 mb-12">
          Have questions? We&apos;d love to hear from you. Send us a message and we&apos;ll respond as soon as possible.
        </p>

        <div className="grid gap-8 lg:grid-cols-[1fr_1.5fr]">
          {/* Contact Information */}
          <div className="space-y-6">
            <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/30">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-400/10 border border-sky-400/30">
                  <Mail size={20} className="text-sky-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Email</h3>
                  <p className="text-sm text-slate-400">support@secyourall.com</p>
                  <p className="text-sm text-slate-400">sales@secyourall.com</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/30">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-400/10 border border-sky-400/30">
                  <Phone size={20} className="text-sky-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Phone</h3>
                  <p className="text-sm text-slate-400">+1 (555) 123-4567</p>
                  <p className="text-xs text-slate-500 mt-1">Mon-Fri 9am-6pm EST</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/30">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-400/10 border border-sky-400/30">
                  <MessageSquare size={20} className="text-sky-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Live Chat</h3>
                  <p className="text-sm text-slate-400">Available 24/7</p>
                  <button className="mt-2 text-xs text-sky-400 hover:text-sky-300 transition-colors">
                    Start a conversation →
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/30">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-400/10 border border-sky-400/30">
                  <MapPin size={20} className="text-sky-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Office</h3>
                  <p className="text-sm text-slate-400">
                    123 Security Boulevard<br />
                    Cyber City, CC 12345<br />
                    United States
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="p-8 rounded-xl border border-slate-800 bg-slate-900/30">
            <h2 className="text-2xl font-semibold text-white mb-6">Send us a message</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/50 focus:border-sky-400 transition-colors"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/50 focus:border-sky-400 transition-colors"
                  placeholder="your.email@example.com"
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-slate-300 mb-2">
                  Subject
                </label>
                <select
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-sky-400/50 focus:border-sky-400 transition-colors"
                >
                  <option value="">Select a subject</option>
                  <option value="general">General Inquiry</option>
                  <option value="support">Technical Support</option>
                  <option value="sales">Sales</option>
                  <option value="partnership">Partnership</option>
                  <option value="feedback">Feedback</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-slate-300 mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/50 focus:border-sky-400 transition-colors resize-none"
                  placeholder="Tell us how we can help..."
                />
              </div>

              <button
                type="submit"
                className="w-full px-6 py-3 rounded-lg bg-sky-400 text-slate-950 font-semibold hover:bg-sky-300 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>

        <div className="mt-12 p-6 bg-slate-800/50 rounded-lg border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-3">Maintained by SHYENA</h2>
          <p className="text-sm text-slate-400">
            For technical inquiries or platform maintenance questions, please reach out to our
            dedicated maintenance team at: maintenance@secyourall.com
          </p>
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
