"use client";
import { Input as BoilerplateInput } from "@repo/design-system/components/ui/input";
import { Spinner } from "@repo/design-system/components/ui/spinner";
import { ArrowRight, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { openGoogleAuthPopup } from "@/lib/auth/google-popup";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!res.ok) {
        setError(data?.error || "Registration failed. Please try again.");
        return;
      }

      // Login immediately after signup.
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/dashboard",
      });

      if (result?.error) {
        setError(
          "Account created, but automatic login failed. Please sign in."
        );
        setTimeout(() => router.push("/login"), 2000);
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Signup error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] bg-grid p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link
            className="inline-flex items-center justify-center gap-3"
            href="/"
          >
            <Image alt="SecYourFlow" height={80} src="/logo1.png" width={80} />
            <span className="font-semibold text-2xl text-[var(--text-primary)] tracking-[0.25em]">
              SECYOUR<span className="text-intent-accent">FLOW</span>
            </span>
          </Link>
          <p className="mt-4 text-[var(--text-secondary)]">
            Create your account
          </p>
        </div>

        {/* Signup Form */}
        <div className="card p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div
                aria-live="polite"
                className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-600 text-sm dark:text-red-300"
                role="alert"
              >
                {error}
              </div>
            )}

            {/* Name */}
            <div>
              <label
                className="mb-2 block font-medium text-[var(--text-primary)] text-sm"
                htmlFor="signup-name"
              >
                Full Name
              </label>
              <div className="relative">
                <User
                  className="absolute top-1/2 left-3 -translate-y-1/2 text-[var(--text-muted)]"
                  size={18}
                />
                <BoilerplateInput
                  autoComplete="name"
                  className="!pl-10"
                  id="signup-name"
                  name="name"
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  required
                  type="text"
                  value={name}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label
                className="mb-2 block font-medium text-[var(--text-primary)] text-sm"
                htmlFor="signup-email"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail
                  className="absolute top-1/2 left-3 -translate-y-1/2 text-[var(--text-muted)]"
                  size={18}
                />
                <BoilerplateInput
                  autoComplete="email"
                  className="!pl-10"
                  id="signup-email"
                  name="email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  type="email"
                  value={email}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                className="mb-2 block font-medium text-[var(--text-primary)] text-sm"
                htmlFor="signup-password"
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute top-1/2 left-3 -translate-y-1/2 text-[var(--text-muted)]"
                  size={18}
                />
                <BoilerplateInput
                  aria-describedby="signup-password-help"
                  autoComplete="new-password"
                  className="!pl-10 !pr-10"
                  id="signup-password"
                  minLength={8}
                  name="password"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                />
                <button
                  aria-controls="signup-password"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  onClick={() => setShowPassword(!showPassword)}
                  type="button"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p
                className="mt-1.5 text-[var(--text-muted)] text-xs"
                id="signup-password-help"
              >
                Use at least 8 characters.
              </p>
            </div>

            {/* Submit Button */}
            <button
              aria-label={isLoading ? "Creating account…" : undefined}
              className="btn btn-primary w-full disabled:text-primary-foreground disabled:opacity-100"
              disabled={isLoading || isGoogleLoading}
              type="submit"
            >
              {isLoading ? (
                <>
                  <Spinner
                    aria-label="Creating account"
                    className="size-5 text-primary-foreground"
                  />
                  <span className="text-primary-foreground">
                    Creating account…
                  </span>
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-[var(--border-color)]" />
            <span className="text-[var(--text-muted)] text-xs uppercase tracking-widest">
              or
            </span>
            <span className="h-px flex-1 bg-[var(--border-color)]" />
          </div>

          <GoogleAuthButton
            disabled={isLoading}
            label="Sign up with Google"
            loading={isGoogleLoading}
            onClick={() => {
              setError(null);
              openGoogleAuthPopup({
                onStart: () => setIsGoogleLoading(true),
                onError: (message) => {
                  setIsGoogleLoading(false);
                  setError(message);
                },
              });
            }}
          />
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-[var(--text-muted)] text-sm">
          Already have an account?{" "}
          <Link
            className="text-intent-accent hover:text-intent-accent-strong"
            href="/login"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
