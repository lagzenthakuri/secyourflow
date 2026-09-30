"use client";
import { Input as BoilerplateInput } from "@repo/design-system/components/ui/input";
import {
  Copy,
  Download,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  Smartphone,
} from "lucide-react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { SecurityLoader } from "@/components/ui/SecurityLoader";
import { useUiFeedback } from "@/hooks/useUiFeedback";
import { cn } from "@/lib/utils";

interface TotpStatusResponse {
  enabled: boolean;
  hasPendingEnrollment: boolean;
  recoveryCodesRemaining: number;
  verifiedAt: string | null;
}

interface EnrollmentResponse {
  otpauthUrl: string;
  qrCodeDataUrl: string;
  secret: string;
}

interface ApiError {
  error?: string;
}

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
    <div className="space-y-3 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4">
      <p className="font-medium text-sm text-yellow-600 dark:text-yellow-300">
        Save these recovery codes now. They are shown only once.
      </p>
      <pre className="overflow-x-auto rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)]/70 p-3 text-[var(--text-primary)] text-sm">
        {recoveryText}
      </pre>
      <div className="flex flex-wrap gap-2">
        <button
          className="btn btn-secondary py-1.5 text-sm"
          onClick={copyCodes}
        >
          <Copy size={14} />
          Copy
        </button>
        <button
          className="btn btn-secondary py-1.5 text-sm"
          onClick={downloadCodes}
        >
          <Download size={14} />
          Download
        </button>
        <button className="btn btn-ghost py-1.5 text-sm" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}

export function TwoFactorSettingsPanel() {
  const { prompt: requestInput } = useUiFeedback();
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
      const response = await fetch("/api/2fa/totp/status", {
        cache: "no-store",
      });
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
  }, [refreshStatus]);

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
      setNotice(
        "Scan the QR with Google Authenticator, then verify with a 6-digit code."
      );
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
      setRecoveryCodes(
        Array.isArray(payload.recoveryCodes) ? payload.recoveryCodes : []
      );
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

  const handleDisableTotp = async () => {
    const code = await requestInput({
      title: "Disable Two-Factor Authentication",
      message:
        "Enter your 6-digit authenticator code or recovery code to disable 2FA.",
      placeholder: "123456 or recovery code",
      confirmLabel: "Disable 2FA",
      cancelLabel: "Cancel",
      validate: (value) => (value ? null : "A code is required."),
    });
    if (!code) {
      return;
    }

    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/2fa/totp/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error || "Unable to disable 2FA.");
        return;
      }

      setNotice("Two-factor authentication has been disabled.");
      await update({
        twoFactorVerified: false,
        twoFactorVerifiedAt: null,
        user: { totpEnabled: false },
      });
      await refreshStatus();
    } catch (requestError) {
      console.error("2FA disable failed:", requestError);
      setError("Unable to disable 2FA.");
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

      setRecoveryCodes(
        Array.isArray(payload.recoveryCodes) ? payload.recoveryCodes : []
      );
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

  const isTwoFactorEnabled = Boolean(
    status?.enabled || session?.user?.totpEnabled
  );

  return (
    <div className="space-y-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="flex items-center gap-2 font-medium text-[var(--text-primary)] text-sm">
            <Smartphone size={16} />
            Google Authenticator (TOTP)
          </h4>
          <p className="mt-1 text-[var(--text-muted)] text-xs">
            Scan a QR code, verify once, and keep recovery codes offline.
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold text-[10px] uppercase tracking-wide",
            isTwoFactorEnabled
              ? "border border-green-500/40 bg-green-500/15 text-green-600 dark:text-green-300"
              : "border border-yellow-500/40 bg-yellow-500/15 text-yellow-700 dark:text-yellow-200"
          )}
        >
          {isTwoFactorEnabled ? (
            <ShieldCheck size={12} />
          ) : (
            <ShieldOff size={12} />
          )}
          {isTwoFactorEnabled ? "Enabled" : "Disabled"}
        </span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <SecurityLoader icon="shield" size="sm" variant="cyber" />
        </div>
      ) : (
        <>
          {status?.verifiedAt && (
            <p className="text-[var(--text-muted)] text-xs">
              Enabled on {new Date(status.verifiedAt).toLocaleString()} •{" "}
              {status.recoveryCodesRemaining} recovery codes remaining
            </p>
          )}

          {error && (
            <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-red-600 text-sm dark:text-red-300">
              {error}
            </p>
          )}

          {notice && (
            <p className="rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-green-600 text-sm dark:text-green-300">
              {notice}
            </p>
          )}

          {!(isTwoFactorEnabled || enrollment) && (
            <div className="flex flex-wrap gap-2">
              <button
                className="btn btn-primary"
                disabled={isSubmitting}
                onClick={handleEnroll}
              >
                {isSubmitting ? "Preparing..." : "Enable 2FA"}
              </button>
              {status?.hasPendingEnrollment && (
                <span className="self-center text-xs text-yellow-600 dark:text-yellow-300">
                  Enrollment is pending verification.
                </span>
              )}
            </div>
          )}

          {enrollment && (
            <div className="space-y-4 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
              <p className="text-blue-700 text-sm dark:text-blue-100">
                Scan with Google Authenticator. If you cannot scan, copy the
                secret manually.
              </p>
              <Image
                alt="TOTP enrollment QR code"
                className="rounded-lg bg-white p-2"
                height={176}
                src={enrollment.qrCodeDataUrl}
                unoptimized
                width={176}
              />
              <div>
                <p className="mb-1 text-[var(--text-muted)] text-xs">
                  Manual secret
                </p>
                <div className="flex flex-wrap gap-2">
                  <code className="break-all rounded bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)] text-sm">
                    {enrollment.secret}
                  </code>
                  <button
                    className="btn btn-secondary py-1.5 text-sm"
                    onClick={copyEnrollmentSecret}
                  >
                    <Copy size={14} />
                    Copy
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block font-medium text-[var(--text-primary)] text-sm">
                  Verify with 6-digit code
                </label>
                <BoilerplateInput
                  autoComplete="one-time-code"
                  className=""
                  onChange={(event) => setVerifyCode(event.target.value)}
                  placeholder="123456"
                  type="text"
                  value={verifyCode}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    className="btn btn-primary"
                    disabled={isSubmitting}
                    onClick={handleVerifyEnrollment}
                  >
                    {isSubmitting ? "Verifying..." : "Verify & Enable"}
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      setEnrollment(null);
                      setVerifyCode("");
                      setNotice(
                        "Enrollment screen closed. Start enroll again to view a new secret."
                      );
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
              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="btn btn-ghost"
                  disabled={isSubmitting}
                  onClick={handleRegenerateRecovery}
                >
                  <RefreshCw size={14} />
                  Regenerate Recovery Codes
                </button>
                <button
                  className="btn btn-ghost text-intent-danger hover:text-intent-danger-strong"
                  disabled={isSubmitting}
                  onClick={handleDisableTotp}
                >
                  <ShieldOff size={14} />
                  Disable 2FA
                </button>
              </div>
            </div>
          )}

          {recoveryCodes && recoveryCodes.length > 0 && (
            <RecoveryCodeViewer
              onDismiss={() => setRecoveryCodes(null)}
              recoveryCodes={recoveryCodes}
            />
          )}
        </>
      )}
    </div>
  );
}
