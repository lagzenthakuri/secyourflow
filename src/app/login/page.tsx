"use client";
import { Checkbox as BoilerplateCheckbox } from "@repo/design-system/components/ui/checkbox";
import { Input as BoilerplateInput } from "@repo/design-system/components/ui/input";
import { Spinner } from "@repo/design-system/components/ui/spinner";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { openGoogleAuthPopup } from "@/lib/auth/google-popup";
import {
  GOOGLE_AUTH_POPUP_NAME_PREFIX,
  publishGoogleAuthPopupResult,
} from "@/lib/auth/google-popup-storage";

function getAuthErrorMessage(
  error: string | null,
  code: string | null
): string | null {
  if (!error) {
    return null;
  }

  if (code === "service_unavailable") {
    return "Sign-in is temporarily unavailable. Please try again in a few moments.";
  }

  if (error === "CredentialsSignin") {
    if (code === "oauth_only") {
      return "This account is configured for social login. Use your configured OAuth provider to continue.";
    }

    if (code === "no_password_set") {
      return "This account has no password set. It was created through a sign-in method that is no longer available — ask an administrator to set a password for it.";
    }

    return "Invalid email or password.";
  }

  switch (error) {
    case "Configuration":
      return "Sign-in is temporarily unavailable. Please try again in a few moments.";
    case "AccessDenied":
      return "Access denied. You do not have permission to sign in.";
    case "Verification":
      return "Verification failed. The link may have expired.";
    case "OAuthAccountNotLinked":
      return "That email is already linked to another sign-in method. Use your original provider.";
    default:
      return "An authentication error occurred. Please try again.";
  }
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get("error");
    const code = urlParams.get("code");
    const message = getAuthErrorMessage(error, code);
    if (message) {
      setAuthError(message);

      const popupId = window.name.startsWith(GOOGLE_AUTH_POPUP_NAME_PREFIX)
        ? window.name.slice(GOOGLE_AUTH_POPUP_NAME_PREFIX.length)
        : "";
      if (popupId) {
        publishGoogleAuthPopupResult({ id: popupId, status: "error" });
        window.setTimeout(() => window.close(), 100);
      }
    }

    // Auth.js puts its internal error class in the query string. Display
    // the safe message above, then remove the technical parameters so a
    // refresh does not repeat the failure or leave `error=Configuration`
    // visible in production URLs.
    if (error || code) {
      urlParams.delete("error");
      urlParams.delete("code");
      const query = urlParams.toString();
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`
      );
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/dashboard",
      });

      if (!result || result.error) {
        setAuthError(
          getAuthErrorMessage(
            result?.error ?? "CredentialsSignin",
            result?.code ?? null
          )
        );
        return;
      }

      window.location.href = result.url || "/dashboard";
    } catch (error) {
      console.error("Login failed:", error);
      setAuthError("Unable to sign in right now.");
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
            Sign in to your account
          </p>
        </div>

        {/* Login Form */}
        <div className="card p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {authError && (
              <div
                aria-live="polite"
                className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-600 text-sm dark:text-red-300"
                role="alert"
              >
                {authError}
              </div>
            )}

            {/* Email */}
            <div>
              <label
                className="mb-2 block font-medium text-[var(--text-primary)] text-sm"
                htmlFor="login-email"
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
                  id="login-email"
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
              <div className="mb-2 flex items-center justify-between">
                <label
                  className="block font-medium text-[var(--text-primary)] text-sm"
                  htmlFor="login-password"
                >
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock
                  className="absolute top-1/2 left-3 -translate-y-1/2 text-[var(--text-muted)]"
                  size={18}
                />
                <BoilerplateInput
                  autoComplete="current-password"
                  className="!pl-10 !pr-10"
                  id="login-password"
                  name="password"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                />
                <button
                  aria-controls="login-password"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  onClick={() => setShowPassword(!showPassword)}
                  type="button"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <BoilerplateCheckbox
                className="h-4 w-4 rounded border-[var(--border-color)] bg-[var(--bg-tertiary)] text-blue-500 focus:ring-blue-500"
                id="remember"
              />
              <label
                className="ml-2 text-[var(--text-secondary)] text-sm"
                htmlFor="remember"
              >
                Remember me for 30 days
              </label>
            </div>

            {/* Submit Button */}
            <button
              aria-label={isLoading ? "Signing in…" : undefined}
              className="btn btn-primary w-full disabled:text-primary-foreground disabled:opacity-100"
              disabled={isLoading || isGoogleLoading}
              type="submit"
            >
              {isLoading ? (
                <>
                  <Spinner
                    aria-label="Signing in"
                    className="size-5 text-primary-foreground"
                  />
                  <span className="text-primary-foreground">Signing in…</span>
                </>
              ) : (
                <>
                  Sign In
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
            label="Continue with Google"
            loading={isGoogleLoading}
            onClick={() => {
              setAuthError(null);
              openGoogleAuthPopup({
                onStart: () => setIsGoogleLoading(true),
                onError: (message) => {
                  setIsGoogleLoading(false);
                  setAuthError(message);
                },
              });
            }}
          />
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-[var(--text-muted)] text-sm">
          Don&apos;t have an account?{" "}
          <Link
            className="text-intent-accent hover:text-intent-accent-strong"
            href="/signup"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
