"use client";
import { Input as BoilerplateInput } from "@repo/design-system/components/ui/input";
import { KeyRound, LogOut, QrCode, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

interface EnrollmentResponse {
  otpauthUrl: string;
  qrCodeDataUrl: string;
  secret: string;
}

interface ApiError {
  code?: string;
  error?: string;
}

interface ApiFailure {
  code?: string;
  error: string;
}

function isSixDigitTotpCode(value: string): boolean {
  return /^\d{6}$/.test(value.replace(/\s+/g, "").trim());
}

async function parseApiFailure(
  response: Response,
  fallback: string
): Promise<ApiFailure> {
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
  const lastSubmissionRef = useRef<{
    flow: "enrollment" | "challenge";
    code: string;
    at: number;
  } | null>(null);
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

    // Two-factor is opt-in from Settings. This page only serves the
    // challenge for accounts that already turned it on — an account
    // without it is never pushed into enrolling here.
    if (!isTotpEnabled || isTwoFactorVerified) {
      router.replace("/dashboard");
    }
  }, [isTotpEnabled, isTwoFactorVerified, router, status]);

  const shouldSkipDuplicateSubmission = useCallback(
    (flow: "enrollment" | "challenge", submittedCode: string) => {
      const normalized = submittedCode.replace(/\s+/g, "").trim();
      const previous = lastSubmissionRef.current;
      const now = Date.now();
      if (
        previous &&
        previous.flow === flow &&
        previous.code === normalized &&
        now - previous.at < 1200
      ) {
        return true;
      }

      lastSubmissionRef.current = { flow, code: normalized, at: now };
      return false;
    },
    []
  );

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
        const failure = await parseApiFailure(
          response,
          "Unable to start enrollment."
        );
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

  const submitEnrollmentCode = useCallback(
    async (submittedCode: string) => {
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
          const failure = await parseApiFailure(
            response,
            "Invalid authentication code."
          );
          if (failure.code === "replay_detected") {
            setError(
              "That code was already used. Enter the next 6-digit code."
            );
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
    },
    [navigateToDashboard, shouldSkipDuplicateSubmission]
  );

  const submitEnrollmentVerification = async (event: FormEvent) => {
    event.preventDefault();
    await submitEnrollmentCode(verifyCode);
  };

  const submitChallengeCode = useCallback(
    async (submittedCode: string) => {
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
          const failure = await parseApiFailure(
            response,
            "Invalid authentication code."
          );
          if (failure.code === "replay_detected") {
            setError(
              "That code was already used. Enter the next 6-digit code."
            );
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
    },
    [navigateToDashboard, shouldSkipDuplicateSubmission]
  );

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

  // The session is only known client-side, so hold a neutral placeholder
  // until it resolves rather than server-rendering a prompt that may be
  // wrong for this account.
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] bg-grid px-4 py-8">
        <div
          aria-label="Loading"
          className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border-color)] border-t-intent-accent"
          role="status"
        />
      </div>
    );
  }

  // Two-factor is opt-in from Settings, so an account without it is on its
  // way to the dashboard — never show it an enrollment prompt here.
  if (!isTotpEnabled) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] bg-grid px-4 py-8">
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
        </div>

        <div className="card p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-500/40 bg-blue-500/20">
              <ShieldCheck className="h-6 w-6 text-intent-accent" />
            </div>
            <div>
              <h1 className="font-semibold text-[var(--text-primary)] text-xl">
                Two-Factor Challenge
              </h1>
              <p className="text-[var(--text-muted)] text-xs">
                Two-factor authentication is required before you can access the
                platform.
              </p>
            </div>
          </div>

          {isTotpEnabled ? (
            <form className="space-y-4" onSubmit={submitChallenge}>
              <label className="block">
                <span className="font-medium text-[var(--text-primary)] text-sm">
                  Authenticator or Recovery Code
                </span>
                <div className="relative mt-2">
                  <KeyRound
                    className="absolute top-1/2 left-3 -translate-y-1/2 text-[var(--text-muted)]"
                    size={16}
                  />
                  <BoilerplateInput
                    autoComplete="one-time-code"
                    autoFocus
                    className="!pl-9"
                    onChange={(event) => setCode(event.target.value)}
                    placeholder="123456 or ABCDE-FGHIJ"
                    required
                    type="text"
                    value={code}
                  />
                </div>
              </label>

              <button
                className="btn btn-primary w-full"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? "Verifying..." : "Verify and Continue"}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              {enrollment ? (
                <form
                  className="space-y-4"
                  onSubmit={submitEnrollmentVerification}
                >
                  <p className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-blue-700 text-sm dark:text-blue-100">
                    Scan this QR code in Google Authenticator, then verify with
                    a 6-digit code.
                  </p>
                  <Image
                    alt="TOTP enrollment QR code"
                    className="mx-auto rounded-lg bg-white p-2"
                    height={176}
                    src={enrollment.qrCodeDataUrl}
                    unoptimized
                    width={176}
                  />
                  <div>
                    <p className="mb-1 text-[var(--text-muted)] text-xs">
                      Manual secret
                    </p>
                    <code className="block break-all rounded bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)] text-sm">
                      {enrollment.secret}
                    </code>
                  </div>
                  <label className="block">
                    <span className="font-medium text-[var(--text-primary)] text-sm">
                      Authenticator Code
                    </span>
                    <div className="relative mt-2">
                      <KeyRound
                        className="absolute top-1/2 left-3 -translate-y-1/2 text-[var(--text-muted)]"
                        size={16}
                      />
                      <BoilerplateInput
                        autoComplete="one-time-code"
                        autoFocus
                        className="!pl-9"
                        onChange={(event) =>
                          setVerifyCode(
                            event.target.value.replace(/\D/g, "").slice(0, 6)
                          )
                        }
                        placeholder="123456"
                        required
                        type="text"
                        value={verifyCode}
                      />
                    </div>
                  </label>
                  <button
                    className="btn btn-primary w-full"
                    disabled={isSubmitting}
                    type="submit"
                  >
                    {isSubmitting ? "Verifying..." : "Verify and Continue"}
                  </button>
                </form>
              ) : (
                <button
                  className="btn btn-primary w-full"
                  disabled={isSubmitting}
                  onClick={startEnrollment}
                  type="button"
                >
                  {isSubmitting ? (
                    "Preparing QR..."
                  ) : (
                    <>
                      <QrCode size={16} />
                      Set Up 2FA Now
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {notice && (
            <p className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-green-600 text-sm dark:text-green-300">
              {notice}
            </p>
          )}

          {error && (
            <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-intent-danger text-sm">
              {error}
            </p>
          )}

          {!isTotpEnabled && enrollment ? (
            <button
              className="btn btn-ghost mt-3 w-full"
              disabled={isSubmitting}
              onClick={startEnrollment}
              type="button"
            >
              Generate New QR
            </button>
          ) : null}

          <button
            className="btn btn-ghost mt-3 w-full"
            onClick={() => signOut({ callbackUrl: "/login" })}
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
