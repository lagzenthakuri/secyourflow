"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";

/**
 * Invitation acceptance.
 *
 * `POST /api/invitations/accept` has always existed and the invitation email
 * link has always pointed here, but the page did not — so every invitation was
 * a dead end.
 */
function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, password }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "Could not accept this invitation.");
      }

      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not accept this invitation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-6 text-sm text-red-700 dark:text-red-200">
        <div className="flex items-center gap-2 font-medium">
          <AlertCircle size={18} />
          This invitation link is missing its token.
        </div>
        <p className="mt-2 text-[var(--text-secondary)]">
          Ask whoever invited you to send the link again.
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-6 text-sm text-emerald-700 dark:text-emerald-200">
        <div className="flex items-center gap-2 font-medium">
          <CheckCircle2 size={18} />
          Account created. Redirecting you to sign in…
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-200"
        >
          <AlertCircle size={16} />
          {error}
        </div>
      ) : null}

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Full name</span>
        <input
          required
          minLength={2}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="input w-full"
          placeholder="Jane Okafor"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">Password</span>
        <input
          required
          type="password"
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="input w-full"
          placeholder="At least 8 characters"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
          Confirm password
        </span>
        <input
          required
          type="password"
          minLength={8}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className="input w-full"
        />
      </label>

      <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full">
        {isSubmitting ? "Creating account…" : "Accept invitation"}
      </button>

      <p className="text-center text-xs text-[var(--text-muted)]">
        Already have an account?{" "}
        <Link href="/login" className="text-sky-600 hover:underline dark:text-sky-400">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export default function AcceptInvitePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-sky-600 dark:text-sky-400" />
          <h1 className="mt-3 text-xl font-semibold text-[var(--text-primary)]">
            Accept your invitation
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Set a password to finish creating your SecYourFlow account.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6">
          <Suspense fallback={<p className="text-sm text-[var(--text-muted)]">Loading…</p>}>
            <AcceptInviteForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
