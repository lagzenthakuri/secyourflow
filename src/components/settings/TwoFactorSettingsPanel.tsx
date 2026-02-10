"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Copy, Download, RefreshCw, ShieldCheck, ShieldOff, Smartphone } from "lucide-react";
import { useSession } from "next-auth/react";
import { SecurityLoader } from "@/components/ui/SecurityLoader";
import { cn } from "@/lib/utils";

type TotpStatusResponse = {
    enabled: boolean;
    verifiedAt: string | null;
    hasPendingEnrollment: boolean;
    recoveryCodesRemaining: number;
};

type EnrollmentResponse = {
    secret: string;
    otpauthUrl: string;
    qrCodeDataUrl: string;
};

type ApiError = {
    error?: string;
};

async function parseApiError(response: Response): Promise<string> {
    try {
        const payload = (await response.json()) as ApiError;
        if (payload.error) {
            return payload.error;
        }
    } catch {
        // Ignore parse errors and return fallback below.
    }

    return "Request failed.";
}

function RecoveryCodeViewer({
    recoveryCodes,
    onDismiss,
}: {
    recoveryCodes: string[];
    onDismiss: () => void;
}) {
    const recoveryText = useMemo(() => recoveryCodes.join("\n"), [recoveryCodes]);

    const copyCodes = async () => {
        try {
            await navigator.clipboard.writeText(recoveryText);
        } catch (error) {
            console.error("Copy recovery codes failed:", error);
        }
    };

    const downloadCodes = () => {
        const blob = new Blob([`${recoveryText}\n`], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "secyourflow-recovery-codes.txt";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="p-4 rounded-lg border border-yellow-500/40 bg-yellow-500/10 space-y-3">
            <p className="text-sm text-yellow-300 font-medium">
                Save these recovery codes now. They are shown only once.
            </p>
            <pre className="text-sm bg-[var(--bg-primary)]/70 border border-[var(--border-color)] rounded-lg p-3 text-white overflow-x-auto">
                {recoveryText}
            </pre>
            <div className="flex flex-wrap gap-2">
                <button className="btn btn-secondary text-sm py-1.5" onClick={copyCodes}>
                    <Copy size={14} />
                    Copy
                </button>
                <button className="btn btn-secondary text-sm py-1.5" onClick={downloadCodes}>
                    <Download size={14} />
                    Download
                </button>
                <button className="btn btn-ghost text-sm py-1.5" onClick={onDismiss}>
                    Dismiss
                </button>
            </div>
        </div>
    );
}

export function TwoFactorSettingsPanel() {
    const { data: session, update } = useSession();
    const [status, setStatus] = useState<TotpStatusResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [enrollment, setEnrollment] = useState<EnrollmentResponse | null>(null);
    const [verifyCode, setVerifyCode] = useState("");
    const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

    const refreshStatus = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch("/api/2fa/totp/status", { cache: "no-store" });
            if (!response.ok) {
                setError(await parseApiError(response));
                return;
            }

            const payload = (await response.json()) as TotpStatusResponse;
            setStatus(payload);
        } catch (requestError) {
            console.error("2FA status fetch failed:", requestError);
            setError("Unable to fetch two-factor status.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        refreshStatus();
    }, []);

    const handleEnroll = async () => {
        setError(null);
        setNotice(null);
        setRecoveryCodes(null);
        setIsSubmitting(true);

        try {
            const response = await fetch("/api/2fa/totp/enroll", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });

            if (!response.ok) {
                setError(await parseApiError(response));
                return;
            }

            const payload = (await response.json()) as EnrollmentResponse;
            setEnrollment(payload);
            setNotice("Scan the QR with Google Authenticator, then verify with a 6-digit code.");
        } catch (requestError) {
            console.error("TOTP enroll failed:", requestError);
            setError("Failed to start enrollment.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVerifyEnrollment = async () => {
        if (!verifyCode.trim()) {
            setError("Enter the 6-digit authenticator code.");
            return;
        }

        setError(null);
        setNotice(null);
        setIsSubmitting(true);

        try {
            const response = await fetch("/api/2fa/totp/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: verifyCode }),
            });

            const payload = await response.json();
            if (!response.ok) {
                setError(payload?.error || "Verification failed.");
                return;
            }

            setEnrollment(null);
            setVerifyCode("");
            setRecoveryCodes(Array.isArray(payload.recoveryCodes) ? payload.recoveryCodes : []);
            setNotice("Two-factor authentication is now enabled.");
            await update({
                twoFactorVerified: true,
                twoFactorVerifiedAt: Date.now(),
                user: { totpEnabled: true },
            });
            await refreshStatus();
        } catch (requestError) {
            console.error("TOTP verify failed:", requestError);
            setError("Unable to verify enrollment.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRegenerateRecovery = async () => {
        setError(null);
        setNotice(null);
        setIsSubmitting(true);

        try {
            const response = await fetch("/api/2fa/totp/recovery/regenerate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });

            const payload = await response.json();
            if (!response.ok) {
                setError(payload?.error || "Unable to regenerate recovery codes.");
                return;
            }

            setRecoveryCodes(Array.isArray(payload.recoveryCodes) ? payload.recoveryCodes : []);
            setNotice("Recovery codes regenerated. Old codes are invalid.");
            await refreshStatus();
        } catch (requestError) {
            console.error("Recovery regeneration failed:", requestError);
            setError("Unable to regenerate recovery codes.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const copyEnrollmentSecret = async () => {
        if (!enrollment?.secret) {
            return;
        }

        try {
            await navigator.clipboard.writeText(enrollment.secret);
            setNotice("Secret copied to clipboard.");
        } catch (copyError) {
            console.error("Copy enrollment secret failed:", copyError);
            setError("Could not copy secret.");
        }
    };

    const isTwoFactorEnabled = Boolean(status?.enabled || session?.user?.totpEnabled);

    return (
        <div className="p-4 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h4 className="text-sm font-medium text-white flex items-center gap-2">
                        <Smartphone size={16} />
                        Google Authenticator (TOTP)
                    </h4>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                        Scan a QR code, verify once, and keep recovery codes offline.
                    </p>
                </div>
                <span
                    className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
                        isTwoFactorEnabled
                            ? "bg-green-500/15 border border-green-500/40 text-green-300"
                            : "bg-yellow-500/15 border border-yellow-500/40 text-yellow-200",
                    )}
                >
                    {isTwoFactorEnabled ? <ShieldCheck size={12} /> : <ShieldOff size={12} />}
                    {isTwoFactorEnabled ? "Enabled" : "Disabled"}
                </span>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-6">
                    <SecurityLoader size="sm" icon="shield" variant="cyber" />
                </div>
            ) : (
                <>
                    {status?.verifiedAt && (
                        <p className="text-xs text-[var(--text-muted)]">
                            Enabled on {new Date(status.verifiedAt).toLocaleString()} • {status.recoveryCodesRemaining} recovery
                            codes remaining
                        </p>
                    )}

                    {error && (
                        <p className="text-sm text-red-300 border border-red-500/40 bg-red-500/10 rounded-lg px-3 py-2">
                            {error}
                        </p>
                    )}

                    {notice && (
                        <p className="text-sm text-green-300 border border-green-500/40 bg-green-500/10 rounded-lg px-3 py-2">
                            {notice}
                        </p>
                    )}

                    {!isTwoFactorEnabled && !enrollment && (
                        <div className="flex flex-wrap gap-2">
                            <button className="btn btn-primary" onClick={handleEnroll} disabled={isSubmitting}>
                                {isSubmitting ? "Preparing..." : "Enable 2FA"}
                            </button>
                            {status?.hasPendingEnrollment && (
                                <span className="text-xs text-yellow-300 self-center">
                                    Enrollment is pending verification.
                                </span>
                            )}
                        </div>
                    )}

                    {enrollment && (
                        <div className="space-y-4 border border-blue-500/30 bg-blue-500/10 rounded-lg p-4">
                            <p className="text-sm text-blue-100">
                                Scan with Google Authenticator. If you cannot scan, copy the secret manually.
                            </p>
                            <Image
                                src={enrollment.qrCodeDataUrl}
                                alt="TOTP enrollment QR code"
                                width={176}
                                height={176}
                                unoptimized
                                className="rounded-lg bg-white p-2"
                            />
                            <div>
                                <p className="text-xs text-[var(--text-muted)] mb-1">Manual secret</p>
                                <div className="flex flex-wrap gap-2">
                                    <code className="px-3 py-2 rounded bg-[var(--bg-primary)] text-sm text-white break-all">
                                        {enrollment.secret}
                                    </code>
                                    <button className="btn btn-secondary text-sm py-1.5" onClick={copyEnrollmentSecret}>
                                        <Copy size={14} />
                                        Copy
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm text-white font-medium">
                                    Verify with 6-digit code
                                </label>
                                <input
                                    type="text"
                                    className="input"
                                    value={verifyCode}
                                    onChange={(event) => setVerifyCode(event.target.value)}
                                    placeholder="123456"
                                    autoComplete="one-time-code"
                                />
                                <div className="flex flex-wrap gap-2">
                                    <button className="btn btn-primary" onClick={handleVerifyEnrollment} disabled={isSubmitting}>
                                        {isSubmitting ? "Verifying..." : "Verify & Enable"}
                                    </button>
                                    <button
                                        className="btn btn-ghost"
                                        onClick={() => {
                                            setEnrollment(null);
                                            setVerifyCode("");
                                            setNotice("Enrollment screen closed. Start enroll again to view a new secret.");
                                        }}
                                    >
                                        Close Enrollment
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {isTwoFactorEnabled && (
                        <div className="space-y-4">
                            <p className="text-xs text-[var(--text-muted)]">
                                Two-factor authentication is mandatory and cannot be disabled.
                            </p>

                            <div className="flex flex-wrap items-center gap-2">
                                <button className="btn btn-ghost" onClick={handleRegenerateRecovery} disabled={isSubmitting}>
                                    <RefreshCw size={14} />
                                    Regenerate Recovery Codes
                                </button>
                            </div>
                        </div>
                    )}

                    {recoveryCodes && recoveryCodes.length > 0 && (
                        <RecoveryCodeViewer recoveryCodes={recoveryCodes} onDismiss={() => setRecoveryCodes(null)} />
                    )}
                </>
            )}
        </div>
    );
}
