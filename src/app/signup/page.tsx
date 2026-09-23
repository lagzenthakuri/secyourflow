"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { useAuthProviders } from "@/hooks/use-auth-providers";

export default function SignUpPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { googleEnabled } = useAuthProviders();

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
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
                callbackUrl: "/dashboard",
            });

            if (result?.error) {
                setError("Account created, but automatic login failed. Please sign in.");
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
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                Full Name
                            </label>
                            <div className="relative">
                                <User
                                    size={18}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                                />
                                <input
                                    type="text"
                                    name="name"
                                    autoComplete="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="John Doe"
                                    className="input !pl-10"
                                    required
                                />
                            </div>
                        </div>

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
                                    name="email"
                                    autoComplete="email"
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
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock
                                    size={18}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                                />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    autoComplete="new-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="input !pl-10 !pr-10"
                                    required
                                    minLength={8}
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
                                    Create Account
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

                            <GoogleAuthButton
                                disabled={isLoading}
                                onClick={() => {
                                    setError(null);
                                    setIsLoading(true);
                                    void signIn("google", { callbackUrl: "/dashboard" });
                                }}
                            />
                        </>
                    )}
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
