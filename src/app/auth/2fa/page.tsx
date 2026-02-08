"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, KeyRound, LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

export default function TwoFactorChallengePage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [code, setCode] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (status !== "authenticated") {
            return;
        }

        if (!session?.user?.totpEnabled || session.twoFactorVerified) {
            router.replace("/dashboard");
        }
    }, [router, session?.twoFactorVerified, session?.user?.totpEnabled, status]);

    const submitChallenge = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const response = await fetch("/api/2fa/totp/challenge", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code }),
            });

            const data = await response.json();
            if (!response.ok) {
                setError(data?.error || "Invalid authentication code.");
                return;
            }

            router.replace("/dashboard");
            router.refresh();
        } catch (requestError) {
            console.error("2FA challenge error:", requestError);
            setError("Unable to verify code. Try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] bg-grid bg-gradient-radial flex items-center justify-center px-4 py-8">
            <div className="w-full max-w-md card p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-11 h-11 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-white">Two-Factor Challenge</h1>
                        <p className="text-xs text-[var(--text-muted)]">
                            Enter your authenticator code to continue.
                        </p>
                    </div>
                </div>

                <form onSubmit={submitChallenge} className="space-y-4">
                    <label className="block">
                        <span className="text-sm font-medium text-white">Authenticator or Recovery Code</span>
                        <div className="relative mt-2">
                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                            <input
                                type="text"
                                value={code}
                                onChange={(event) => setCode(event.target.value)}
                                className="input !pl-9"
                                placeholder="123456 or ABCDE-FGHIJ"
                                autoFocus
                                autoComplete="one-time-code"
                                required
                            />
                        </div>
                    </label>

                    {error && (
                        <p className="text-sm text-red-400 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
                            {error}
                        </p>
                    )}

                    <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
                        {isSubmitting ? "Verifying..." : "Verify and Continue"}
                    </button>
                </form>

                <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="btn btn-ghost w-full mt-3 text-[var(--text-secondary)]"
                    type="button"
                >
                    <LogOut size={16} />
                    Sign out
                </button>
            </div>
        </div>
    );
}
