"use client";

import { useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Textarea } from "@repo/design-system/components/ui/textarea";

export function ContactForm() {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus(null);
    const accessKey = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY;

    if (!accessKey) {
      const subject = encodeURIComponent(`SecYourFlow inquiry from ${formData.name}`);
      const body = encodeURIComponent(`${formData.message}\n\nFrom: ${formData.name}\nEmail: ${formData.email}`);
      window.location.assign(`mailto:thakurizen2@gmail.com?subject=${subject}&body=${body}`);
      setStatus({ type: "success", message: "Your email app is opening with your message ready to send." });
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ access_key: accessKey, ...formData, subject: "SecYourFlow inquiry" }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error("Contact request was not accepted.");
      setStatus({ type: "success", message: "Your message has been sent." });
      setFormData({ name: "", email: "", message: "" });
    } catch {
      setStatus({ type: "error", message: "We could not send your message. Please try again later." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <div className="mb-7 border-b border-border pb-5">
        <h2 className="text-xl font-semibold">Send us a message</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">Share a little context and we’ll get back to you.</p>
      </div>
      {status ? <div role="status" aria-live="polite" className={`mb-5 rounded-lg border px-4 py-3 text-sm ${status.type === "success" ? "border-emerald-600/30 bg-emerald-600/10 text-emerald-800 dark:text-emerald-300" : "border-destructive/30 bg-destructive/10 text-destructive"}`}>{status.message}</div> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2"><label className="text-sm font-medium" htmlFor="contact-name">Your name <span className="text-destructive">*</span></label><Input id="contact-name" name="name" autoComplete="name" placeholder="Jane Smith" required value={formData.name} onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))} /></div>
        <div className="space-y-2"><label className="text-sm font-medium" htmlFor="contact-email">Email address <span className="text-destructive">*</span></label><Input id="contact-email" name="email" type="email" autoComplete="email" placeholder="jane@company.com" required value={formData.email} onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))} /></div>
      </div>
      <div className="mt-5 space-y-2"><label className="text-sm font-medium" htmlFor="contact-message">How can we help? <span className="text-destructive">*</span></label><Textarea id="contact-message" name="message" placeholder="Tell us what you’re looking for or where you need a hand." required rows={7} value={formData.message} onChange={(event) => setFormData((current) => ({ ...current, message: event.target.value }))} /></div>
      <div className="mt-6 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-muted-foreground">No credentials or sensitive security data, please.</p>
        <Button type="submit" disabled={isSubmitting} className="sm:min-w-40">{isSubmitting ? "Sending…" : "Send message"}{isSubmitting ? null : <Send className="ml-2 size-4" />}</Button>
      </div>
    </form>
  );
}
