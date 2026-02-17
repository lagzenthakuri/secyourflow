"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Lock, Eye, EyeOff, ShieldCheck, Key, ArrowRight, CheckCircle2, AlertCircle, User } from "lucide-react";

function ActivateContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token");

    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [productKey, setProductKey] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<"idle" | "success">("idle");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/auth/activate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password, productKey, name }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Activation failed");
                return;
            }

            setStatus("success");
            setTimeout(() => {
                router.push("/login");
            }, 3000);
        } catch (err) {
            setError("Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    if (status === "success") {
        return (
            <div className="text-center space-y-6">
                <div className="flex justify-center">
                    <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 animate-bounce">
                        <CheckCircle2 size={48} />
                    </div>
                </div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Organization Activated!</h1>
                <p className="text-[var(--text-secondary)]">
                    Your account and organization have been successfully activated. Redirecting you to login...
                </p>
                <Link href="/login" className="btn btn-primary w-full">
                    Go to Login
                </Link>
            </div>
        );
    }

    if (!token) {
        return (
            <div className="text-center space-y-6">
                <div className="flex justify-center">
                    <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                        <AlertCircle size={48} />
                    </div>
                </div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Invalid Link</h1>
                <p className="text-[var(--text-secondary)]">
                    The activation link is missing or malformed.
                </p>
                <Link href="/login" className="btn btn-secondary w-full">
                    Back to Login
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Activate Your Organization</h1>
                <p className="text-[var(--text-secondary)] mt-2">
                    Set your password and enter your product key to get started.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-300 text-sm flex items-center gap-2">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    {/* Product Key */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                            Product Key
                        </label>
                        <div className="relative">
                            <Key
                                size={18}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                            />
                            <input
                                type="text"
                                value={productKey}
                                onChange={(e) => setProductKey(e.target.value.toUpperCase())}
                                placeholder="SYF-XXXX-XXXX-XXXX"
                                className="input !pl-10 font-mono tracking-wider"
                                required
                            />
                        </div>
                    </div>

                    {/* Full Name */}
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
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Your Full Name"
                                className="input !pl-10"
                                required
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                            New Password
                        </label>
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

                    {/* Confirm Password */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                            Confirm Password
                        </label>
                        <div className="relative">
                            <Lock
                                size={18}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                            />
                            <input
                                type={showPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                className="input !pl-10"
                                required
                            />
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="btn btn-primary w-full h-12 text-lg"
                >
                    {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            Activate Account
                            <ArrowRight size={18} />
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}

export default function ActivatePage() {
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
                </div>

                <div className="card p-8 border-t-4 border-intent-accent shadow-2xl relative overflow-hidden">
                    {/* Decorative element */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-intent-accent/5 rounded-full -mr-16 -mt-16" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-intent-accent/5 rounded-full -ml-12 -mb-12" />

                    <Suspense fallback={<div className="text-center py-10">Loading...</div>}>
                        <ActivateContent />
                    </Suspense>
                </div>

                <p className="text-center text-xs text-[var(--text-muted)] mt-8 uppercase tracking-widest">
                    Enterprise Security Platform
                </p>
            </div>
        </div>
    );
}
