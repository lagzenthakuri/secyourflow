"use client";
import { Input as BoilerplateInput } from "@repo/design-system/components/ui/input";


import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight } from "lucide-react";
import { signIn } from "next-auth/react";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { Spinner } from "@repo/design-system/components/ui/spinner";
import { openGoogleAuthPopup } from "@/lib/auth/google-popup";

interface SignUpPageClientProps {
    registrationEnabled: boolean;
}

export default function SignUpPageClient({ registrationEnabled }: SignUpPageClientProps) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!registrationEnabled) {
        return (
            <main className="min-h-screen bg-[var(--bg-primary)] bg-grid flex items-center justify-center p-6">
                <div className="w-full max-w-md text-center">
                    <Link href="/" className="mb-8 inline-flex items-center gap-3 justify-center" aria-label="SecYourFlow home">
                        <Image src="/logo1.png" alt="" width={64} height={64} />
                        <span className="text-xl font-semibold tracking-[0.2em] text-[var(--text-primary)]">SECYOUR<span className="text-intent-accent">FLOW</span></span>
                    </Link>
                    <section className="card p-8 text-left">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-intent-accent">Workspace access</p>
                        <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">Access is by invitation</h1>
                        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">Public account creation is currently closed. Contact Shyena Technologies to request a workspace invitation.</p>
                        <div className="mt-6 flex flex-col gap-3">
                            <Link href="/contact" className="btn btn-primary w-full justify-center">Request an invitation<ArrowRight size={18} /></Link>
                            <Link href="/login" className="btn w-full justify-center">Already have access? Sign in</Link>
                        </div>
                    </section>
                </div>
            </main>
        );
    }

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

            const data = (await res.json().catch(() => null)) as { error?: string } | null;

            if (!res.ok) {
                setError(data?.error || "Registration failed. Please try again.");
                return;
            }

            // Login immediately after signup.
            await signIn("credentials", {
                email,
                password,
                redirectTo: "/dashboard",
            });
        } catch (err) {
            console.error("Signup error:", err);
            setError("Something went wrong. Please try again.");
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
                        Create your account
                    </p>
                </div>

                {/* Signup Form */}
                <div className="card p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div
                                role="alert"
                                aria-live="polite"
                                className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-300 text-sm"
                            >
                                {error}
                            </div>
                        )}

                        {/* Name */}
                        <div>
                            <label htmlFor="signup-name" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                Full Name
                            </label>
                            <div className="relative">
                                <User
                                    size={18}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                                />
                                <BoilerplateInput
                                    id="signup-name"
                                    type="text"
                                    name="name"
                                    autoComplete="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="John Doe"
                                    className="!pl-10"
                                    required
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label htmlFor="signup-email" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail
                                    size={18}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                                />
                                <BoilerplateInput
                                    id="signup-email"
                                    type="email"
                                    name="email"
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@company.com"
                                    className="!pl-10"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="signup-password" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock
                                    size={18}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                                />
                                <BoilerplateInput
                                    id="signup-password"
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    autoComplete="new-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="!pl-10 !pr-10"
                                    required
                                    minLength={8}
                                    aria-describedby="signup-password-help"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    aria-pressed={showPassword}
                                    aria-controls="signup-password"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <p id="signup-password-help" className="mt-1.5 text-xs text-[var(--text-muted)]">
                                Use at least 8 characters.
                            </p>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading || isGoogleLoading}
                            aria-label={isLoading ? "Creating account…" : undefined}
                            className="btn btn-primary w-full disabled:opacity-100 disabled:text-primary-foreground"
                        >
                            {isLoading ? (
                                <>
                                    <Spinner aria-label="Creating account" className="size-5 text-primary-foreground" />
                                    <span className="text-primary-foreground">Creating account…</span>
                                </>
                            ) : (
                                <>
                                    Create Account
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="flex items-center gap-3 my-6">
                        <span className="h-px flex-1 bg-[var(--border-color)]" />
                        <span className="text-xs uppercase tracking-widest text-[var(--text-muted)]">or</span>
                        <span className="h-px flex-1 bg-[var(--border-color)]" />
                    </div>

                    <GoogleAuthButton
                        disabled={isLoading}
                        loading={isGoogleLoading}
                        label="Sign up with Google"
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
                <p className="text-center text-sm text-[var(--text-muted)] mt-6">
                    Already have an account?{" "}
                    <Link href="/login" className="text-intent-accent hover:text-intent-accent-strong">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
