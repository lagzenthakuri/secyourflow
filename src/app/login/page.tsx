"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { signIn } from "next-auth/react";

function getAuthErrorMessage(error: string | null, code: string | null): string | null {
    if (!error) {
        return null;
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
            return "There is a problem with the server configuration.";
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
    const [authError, setAuthError] = useState<string | null>(null);
    const [googleEnabled, setGoogleEnabled] = useState(false);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get("error");
        const code = urlParams.get("code");
        const message = getAuthErrorMessage(error, code);
        if (message) {
            setAuthError(message);
        }
    }, []);

    // Offer Google only when the server actually has the provider configured,
    // so a missing client id degrades to password-only instead of a dead button.
    useEffect(() => {
        let cancelled = false;

        fetch("/api/auth/providers")
            .then((response) => (response.ok ? response.json() : null))
            .then((providers) => {
                if (!cancelled && providers && "google" in providers) {
                    setGoogleEnabled(true);
                }
            })
            .catch(() => undefined);

        return () => {
            cancelled = true;
        };
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
                setAuthError(getAuthErrorMessage(result?.error ?? "CredentialsSignin", result?.code ?? null));
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
        <div className="min-h-screen bg-[var(--bg-primary)] bg-grid flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-3 justify-center">
                        <Image
                            src="/logo1.png"
                            alt="SecYourFlow"
                            width={80}
                            height={80}
                        />
                        <span className="text-2xl font-semibold tracking-[0.25em] text-[var(--text-primary)]">
                            SECYOUR<span className="text-intent-accent">FLOW</span>
                        </span>
                    </Link>
                    <p className="text-[var(--text-secondary)] mt-4">
                        Sign in to your account
                    </p>
                </div>

                {/* Login Form */}
                <div className="card p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {authError && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-300 text-sm">
                                {authError}
                            </div>
                        )}

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail
                                    size={18}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                                />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@company.com"
                                    className="input !pl-10"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-[var(--text-primary)]">
                                    Password
                                </label>
                                <button
                                    type="button"
                                    disabled
                                    aria-disabled="true"
                                    className="text-xs text-[var(--text-muted)] cursor-not-allowed"
                                >
                                    Forgot password? (Coming soon)
                                </button>
                            </div>
                            <div className="relative">
                                <Lock
                                    size={18}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                                />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="input !pl-10 !pr-10"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Remember Me */}
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="remember"
                                className="w-4 h-4 rounded border-[var(--border-color)] bg-[var(--bg-tertiary)] text-blue-500 focus:ring-blue-500"
                            />
                            <label
                                htmlFor="remember"
                                className="ml-2 text-sm text-[var(--text-secondary)]"
                            >
                                Remember me for 30 days
                            </label>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn btn-primary w-full"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    {googleEnabled && (
                        <>
                            <div className="flex items-center gap-3 my-6">
                                <span className="h-px flex-1 bg-[var(--border-color)]" />
                                <span className="text-xs uppercase tracking-widest text-[var(--text-muted)]">
                                    or
                                </span>
                                <span className="h-px flex-1 bg-[var(--border-color)]" />
                            </div>

                            <button
                                type="button"
                                disabled={isLoading}
                                onClick={() => {
                                    setAuthError(null);
                                    void signIn("google", { callbackUrl: "/dashboard" });
                                }}
                                className="w-full inline-flex items-center justify-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-elevated)] disabled:opacity-60"
                            >
                                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                                    <path
                                        fill="#4285F4"
                                        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
                                    />
                                    <path
                                        fill="#34A853"
                                        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
                                    />
                                    <path
                                        fill="#FBBC05"
                                        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
                                    />
                                    <path
                                        fill="#EA4335"
                                        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
                                    />
                                </svg>
                                Continue with Google
                            </button>
                        </>
                    )}
                </div>

                {/* Footer */}
                <p className="text-center text-sm text-[var(--text-muted)] mt-6">
                    Don&apos;t have an account?{" "}
                    <Link href="/signup" className="text-intent-accent hover:text-intent-accent-strong">
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    );
}
