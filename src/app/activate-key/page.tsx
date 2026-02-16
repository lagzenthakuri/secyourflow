"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { KeyRound, ShieldCheck, AlertTriangle } from "lucide-react";

type ProductKeyStatusResponse = {
  role: string;
  isActive: boolean;
  activation?: {
    activatedAt: string;
    productKey: {
      codePrefix: string;
      targetRole: string;
      expiresAt: string;
    };
  } | null;
};

export default function ActivateProductKeyPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [productKey, setProductKey] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusData, setStatusData] = useState<ProductKeyStatusResponse | null>(null);

  const userRole = session?.user?.role ?? "ANALYST";
  const isMainOfficer = userRole === "MAIN_OFFICER";

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/product-keys/status", { cache: "no-store" });
      const payload = (await response.json()) as ProductKeyStatusResponse | { error?: string };
      if (!response.ok) {
        setError(typeof (payload as { error?: unknown }).error === "string" ? (payload as { error: string }).error : "Unable to load key status");
        return;
      }

      const parsed = payload as ProductKeyStatusResponse;
      setStatusData(parsed);
      if (parsed.isActive || isMainOfficer) {
        router.replace("/dashboard");
      }
    } catch {
      setError("Unable to load key status");
    } finally {
      setIsLoading(false);
    }
  }, [isMainOfficer, router]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }

    if (status === "authenticated") {
      void fetchStatus();
    }
  }, [fetchStatus, router, status]);

  const normalizedInput = useMemo(() => productKey.toUpperCase().trim(), [productKey]);

  const handleActivate = async () => {
    if (!normalizedInput) {
      setError("Enter the product key provided by your MAIN_OFFICER.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/product-keys/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productKey: normalizedInput }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error || "Activation failed");
        return;
      }

      router.replace("/dashboard");
    } catch {
      setError("Activation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] px-4 py-12 text-[var(--text-primary)] sm:px-6">
      <div className="mx-auto max-w-xl rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-2">
            <KeyRound size={18} />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Activate Product Key</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Your role requires an active key before platform features are enabled.
            </p>
          </div>
        </div>

        {isLoading || status === "loading" ? (
          <p className="text-sm text-[var(--text-muted)]">Checking license status...</p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Role</p>
              <p className="mt-1 text-sm font-medium">{userRole}</p>
            </div>

            {statusData?.activation ? (
              <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  <ShieldCheck size={16} />
                  Active key detected
                </p>
                <p className="mt-1 text-xs text-emerald-800/90 dark:text-emerald-200/90">
                  Expires on {new Date(statusData.activation.productKey.expiresAt).toLocaleString()}
                </p>
              </div>
            ) : null}

            <div>
              <label className="mb-2 block text-sm font-medium">Product Key</label>
              <input
                type="text"
                value={productKey}
                onChange={(event) => setProductKey(event.target.value)}
                placeholder="SYF-XXXX-XXXX-XXXX-XXXX-XXXX"
                autoComplete="off"
                className="input font-mono uppercase"
              />
            </div>

            {error ? (
              <div className="rounded-xl border border-red-400/35 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-200">
                <p className="flex items-center gap-2">
                  <AlertTriangle size={16} />
                  {error}
                </p>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => {
                void handleActivate();
              }}
              disabled={isSubmitting}
              className="btn btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Activating..." : "Activate Key"}
            </button>

            <p className="text-xs text-[var(--text-muted)]">
              Ask your MAIN_OFFICER to generate a key for your role if you don&apos;t have one.
            </p>
            <Link href="/dashboard" className="text-xs text-sky-600 hover:text-sky-500 dark:text-sky-400">
              Back to dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
