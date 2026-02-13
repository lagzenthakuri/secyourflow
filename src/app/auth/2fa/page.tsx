"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, KeyRound, LogOut, QrCode } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

type EnrollmentResponse = {
    secret: string;
    otpauthUrl: string;
    qrCodeDataUrl: string;
};

type ApiError = {
    error?: string;
    code?: string;
};

type ApiFailure = {
    error: string;
    code?: string;
};

function isSixDigitTotpCode(value: string): boolean {
    return /^\d{6}$/.test(value.replace(/\s+/g, "").trim());
}

async function parseApiFailure(response: Response, fallback: string): Promise<ApiFailure> {
    try {
        const payload = (await response.json()) as ApiError;
        if (typeof payload.error === "string" && payload.error.length > 0) {
            return { error: payload.error, code: payload.code };
        }
    } catch {
        // Ignore parse failures and fall back below.
    }

    return { error: fallback };
}

export default function TwoFactorChallengePage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [code, setCode] = useState("");
    const [verifyCode, setVerifyCode] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [enrollment, setEnrollment] = useState<EnrollmentResponse | null>(null);
    const lastSubmissionRef = useRef<{ flow: "enrollment" | "challenge"; code: string; at: number } | null>(null);
    const lastAutoSubmittedEnrollmentCodeRef = useRef<string | null>(null);
    const lastAutoSubmittedChallengeCodeRef = useRef<string | null>(null);

    const isTotpEnabled = Boolean(session?.user?.totpEnabled);
    const isTwoFactorVerified = session?.twoFactorVerified === true;

    const navigateToDashboard = useCallback(() => {
        if (typeof window !== "undefined") {
            window.location.assign("/dashboard");
            return;
        }

        router.replace("/dashboard");
    }, [router]);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.replace("/login");
            return;
        }

        if (status !== "authenticated") {
            return;
        }

        if (isTotpEnabled && isTwoFactorVerified) {
            router.replace("/dashboard");
        }
    }, [isTotpEnabled, isTwoFactorVerified, router, status]);

    const shouldSkipDuplicateSubmission = useCallback((flow: "enrollment" | "challenge", submittedCode: string) => {
        const normalized = submittedCode.replace(/\s+/g, "").trim();
        const previous = lastSubmissionRef.current;
        const now = Date.now();
        if (previous && previous.flow === flow && previous.code === normalized && now - previous.at < 1200) {
            return true;
        }

        lastSubmissionRef.current = { flow, code: normalized, at: now };
        return false;
    }, []);

    const startEnrollment = async () => {
        setError(null);
        setNotice(null);
        setIsSubmitting(true);

        try {
            const response = await fetch("/api/2fa/totp/enroll", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });

            if (!response.ok) {
                const failure = await parseApiFailure(response, "Unable to start enrollment.");
                setError(failure.error);
                return;
            }

            const data = (await response.json()) as EnrollmentResponse;
            setEnrollment(data);
            setNotice("Scan the QR code and verify with a 6-digit code to continue.");
        } catch (requestError) {
            console.error("2FA enroll error:", requestError);
            setError("Unable to start enrollment. Try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const submitEnrollmentCode = useCallback(async (submittedCode: string) => {
        const normalizedCode = submittedCode.replace(/\D/g, "").slice(0, 6);
        if (!normalizedCode) {
            setError("Enter your 6-digit authenticator code.");
            return;
        }
        if (shouldSkipDuplicateSubmission("enrollment", normalizedCode)) {
            return;
        }

        setError(null);
        setNotice(null);
        setIsSubmitting(true);

        try {
            const response = await fetch("/api/2fa/totp/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: normalizedCode }),
            });

            if (!response.ok) {
                const failure = await parseApiFailure(response, "Invalid authentication code.");
                if (failure.code === "replay_detected") {
                    setError("That code was already used. Enter the next 6-digit code.");
                } else {
                    setError(failure.error);
                }
                return;
            }

            navigateToDashboard();
        } catch (requestError) {
            console.error("2FA enrollment verification error:", requestError);
            setError("Unable to verify code. Try again.");
        } finally {
            setIsSubmitting(false);
        }
    }, [navigateToDashboard, shouldSkipDuplicateSubmission]);

    const submitEnrollmentVerification = async (event: FormEvent) => {
        event.preventDefault();
        await submitEnrollmentCode(verifyCode);
    };

    const submitChallengeCode = useCallback(async (submittedCode: string) => {
        const normalizedCode = submittedCode.replace(/\s+/g, "").trim();
        if (!normalizedCode) {
            setError("Enter your authenticator or recovery code.");
            return;
        }
        if (shouldSkipDuplicateSubmission("challenge", normalizedCode)) {
            return;
        }

        setError(null);
        setNotice(null);
        setIsSubmitting(true);

        try {
            const response = await fetch("/api/2fa/totp/challenge", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: normalizedCode }),
            });

            if (!response.ok) {
                const failure = await parseApiFailure(response, "Invalid authentication code.");
                if (failure.code === "replay_detected") {
                    setError("That code was already used. Enter the next 6-digit code.");
                } else {
                    setError(failure.error);
                }
                return;
            }

            navigateToDashboard();
        } catch (requestError) {
            console.error("2FA challenge error:", requestError);
            setError("Unable to verify code. Try again.");
        } finally {
            setIsSubmitting(false);
        }
    }, [navigateToDashboard, shouldSkipDuplicateSubmission]);

    const submitChallenge = async (event: FormEvent) => {
        event.preventDefault();
        await submitChallengeCode(code);
    };

    useEffect(() => {
        const normalizedCode = verifyCode.replace(/\D/g, "").slice(0, 6);
        if (normalizedCode !== verifyCode) {
            setVerifyCode(normalizedCode);
            return;
        }

        if (!enrollment || isSubmitting) {
            return;
        }

        if (normalizedCode.length !== 6) {
            lastAutoSubmittedEnrollmentCodeRef.current = null;
            return;
        }

        if (lastAutoSubmittedEnrollmentCodeRef.current === normalizedCode) {
            return;
        }

        lastAutoSubmittedEnrollmentCodeRef.current = normalizedCode;
        void submitEnrollmentCode(normalizedCode);
    }, [enrollment, isSubmitting, submitEnrollmentCode, verifyCode]);

    useEffect(() => {
        if (!isTotpEnabled || isSubmitting) {
            return;
        }

        const normalizedCode = code.replace(/\s+/g, "").trim();
        if (!isSixDigitTotpCode(normalizedCode)) {
            lastAutoSubmittedChallengeCodeRef.current = null;
            return;
        }

        if (lastAutoSubmittedChallengeCodeRef.current === normalizedCode) {
            return;
        }

        lastAutoSubmittedChallengeCodeRef.current = normalizedCode;
        void submitChallengeCode(normalizedCode);
    }, [code, isSubmitting, isTotpEnabled, submitChallengeCode]);

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] bg-grid flex items-center justify-center px-4 py-8">
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
                            SECYOUR<span className="text-sky-300">FLOW</span>
                        </span>
                    </Link>
                </div>

                <div className="card p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-11 h-11 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
                            <ShieldCheck className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold text-[var(--text-primary)]">Two-Factor Challenge</h1>
                            <p className="text-xs text-[var(--text-muted)]">
                                Two-factor authentication is required before you can access the platform.
                            </p>
                        </div>
                    </div>

                {!isTotpEnabled ? (
                    <div className="space-y-4">
                        {!enrollment ? (
                            <button type="button" className="btn btn-primary w-full" onClick={startEnrollment} disabled={isSubmitting}>
                                {isSubmitting ? "Preparing QR..." : (
                                    <>
                                        <QrCode size={16} />
                                        Set Up 2FA Now
                                    </>
                                )}
                            </button>
                        ) : (
                            <form onSubmit={submitEnrollmentVerification} className="space-y-4">
                                <p className="text-sm text-blue-100 border border-blue-500/30 bg-blue-500/10 rounded-lg px-3 py-2">
                                    Scan this QR code in Google Authenticator, then verify with a 6-digit code.
                                </p>
                                <Image
                                    src={enrollment.qrCodeDataUrl}
                                    alt="TOTP enrollment QR code"
                                    width={176}
                                    height={176}
                                    unoptimized
                                    className="rounded-lg bg-white p-2 mx-auto"
                                />
                                <div>
                                    <p className="text-xs text-[var(--text-muted)] mb-1">Manual secret</p>
                                    <code className="px-3 py-2 rounded bg-[var(--bg-primary)] text-sm text-[var(--text-primary)] break-all block">
                                        {enrollment.secret}
                                    </code>
                                </div>
                                <label className="block">
                                    <span className="text-sm font-medium text-[var(--text-primary)]">Authenticator Code</span>
                                    <div className="relative mt-2">
                                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                                        <input
                                            type="text"
                                            value={verifyCode}
                                            onChange={(event) => setVerifyCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                                            className="input !pl-9"
                                            placeholder="123456"
                                            autoFocus
                                            autoComplete="one-time-code"
                                            required
                                        />
                                    </div>
                                </label>
                                <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
                                    {isSubmitting ? "Verifying..." : "Verify and Continue"}
                                </button>
                            </form>
                        )}
                    </div>
                ) : (
                    <form onSubmit={submitChallenge} className="space-y-4">
                        <label className="block">
                            <span className="text-sm font-medium text-[var(--text-primary)]">Authenticator or Recovery Code</span>
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

                        <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
                            {isSubmitting ? "Verifying..." : "Verify and Continue"}
                        </button>
                    </form>
                )}

                {notice && (
                    <p className="text-sm text-green-300 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 mt-4">
                        {notice}
                    </p>
                )}

                {error && (
                    <p className="text-sm text-red-400 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 mt-4">
                        {error}
                    </p>
                )}

                {!isTotpEnabled && enrollment ? (
                    <button
                        onClick={startEnrollment}
                        className="btn btn-ghost w-full mt-3"
                        type="button"
                        disabled={isSubmitting}
                    >
                        Generate New QR
                    </button>
                ) : null}

                <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="btn btn-ghost w-full mt-3"
                    type="button"
                >
                    <LogOut size={16} />
                    Sign out
                </button>
                </div>
            </div>
        </div>
    );
}
