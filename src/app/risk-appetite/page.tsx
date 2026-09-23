"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardList, Plus, Scale, ShieldCheck, Trash2, TriangleAlert } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ShieldLoader } from "@/components/ui/ShieldLoader";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, Pill, ProgressBar, SectionCard } from "@/components/nis2/Nis2Primitives";
import { RiskLevelPill, type AppetiteStatus } from "@/components/grc/GrcPrimitives";

interface AppetiteStatement {
    id: string;
    category: string;
    statement: string;
    appetiteLevel: "AVERSE" | "CAUTIOUS" | "MODERATE" | "OPEN" | "HUNGRY";
    toleranceMax: number;
    boardApproved: boolean;
    boardApprovedAt: string | null;
    reviewDate: string | null;
    owner: string | null;
    appetiteLabel: string;
    risks: {
        evaluated: number;
        within: number;
        approaching: number;
        exceeded: number;
        maxScore: number;
        riskLevel: string;
    };
}

interface PortfolioSummary {
    status: AppetiteStatus;
    evaluated: number;
    within: number;
    approaching: number;
    exceeded: number;
    notEvaluated: number;
    matchedCategories: string[];
}

const APPETITE_LEVELS = ["AVERSE", "CAUTIOUS", "MODERATE", "OPEN", "HUNGRY"] as const;

const LEVEL_HELP: Record<string, string> = {
    AVERSE: "Lowest tolerance — avoid this risk where possible.",
    CAUTIOUS: "Tolerate only with strong compensating controls.",
    MODERATE: "Balance risk and business need.",
    OPEN: "Accept when the return justifies it.",
    HUNGRY: "Pursue deliberately to gain advantage.",
};

const emptyForm = {
    category: "",
    statement: "",
    appetiteLevel: "MODERATE",
    toleranceMax: 12,
    boardApproved: false,
    reviewDate: "",
    owner: "",
};

export default function RiskAppetitePage() {
    const [statements, setStatements] = useState<AppetiteStatement[]>([]);
    const [summary, setSummary] = useState<PortfolioSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyForm);

    const load = useCallback(async () => {
        try {
            setError(null);
            const response = await fetch("/api/risk-appetite", { cache: "no-store" });
            if (!response.ok) throw new Error("Failed to load risk appetite");
            const payload = await response.json();
            setStatements(payload.data ?? []);
            setSummary(payload.summary ?? null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load risk appetite");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const openCreate = () => {
        setEditingId(null);
        setForm(emptyForm);
        setIsModalOpen(true);
    };

    const openEdit = (statement: AppetiteStatement) => {
        setEditingId(statement.id);
        setForm({
            category: statement.category,
            statement: statement.statement,
            appetiteLevel: statement.appetiteLevel,
            toleranceMax: statement.toleranceMax,
            boardApproved: statement.boardApproved,
            reviewDate: statement.reviewDate ? statement.reviewDate.slice(0, 10) : "",
            owner: statement.owner ?? "",
        });
        setIsModalOpen(true);
    };

    const save = useCallback(async () => {
        setIsSaving(true);
        try {
            setError(null);
            const body = JSON.stringify({
                category: form.category,
                statement: form.statement,
                appetiteLevel: form.appetiteLevel,
                toleranceMax: form.toleranceMax,
                boardApproved: form.boardApproved,
                reviewDate: form.reviewDate ? new Date(form.reviewDate).toISOString() : null,
                owner: form.owner || null,
            });
            const response = await fetch(
                editingId ? `/api/risk-appetite/${editingId}` : "/api/risk-appetite",
                {
                    method: editingId ? "PATCH" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body,
                },
            );
            const payload = await response.json().catch(() => null);
            if (!response.ok) throw new Error(payload?.error ?? "Failed to save the statement");
            setIsModalOpen(false);
            setForm(emptyForm);
            setEditingId(null);
            setNotice(editingId ? "Statement updated — every linked view re-evaluates immediately." : "Statement created.");
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save the statement");
        } finally {
            setIsSaving(false);
        }
    }, [editingId, form, load]);

    const remove = useCallback(
        async (id: string) => {
            try {
                setError(null);
                const response = await fetch(`/api/risk-appetite/${id}`, { method: "DELETE" });
                if (!response.ok) {
                    const payload = await response.json().catch(() => null);
                    throw new Error(payload?.error ?? "Failed to delete the statement");
                }
                setNotice("Statement deleted. Risks now fall back to a broader statement or the catch-all.");
                await load();
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to delete the statement");
            }
        },
        [load],
    );

    const totals = useMemo(() => {
        if (!summary) return { risks: 0, toleranceAvg: 0 };
        return {
            risks: summary.evaluated,
            toleranceAvg: statements.length
                ? Math.round(
                      statements.reduce((sum, statement) => sum + statement.toleranceMax, 0) /
                          statements.length,
                  )
                : 0,
        };
    }, [statements, summary]);

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex min-h-[60vh] items-center justify-center">
                    <ShieldLoader size="lg" variant="cyber" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-5">
                <PageHeader
                    title="Risk Appetite"
                    description="Board-level statements of how much residual risk (1–25) the organization accepts per category. Every open risk is evaluated against its statement on read — change a tolerance and the whole platform reflects it."
                    badge={
                        <>
                            <Scale size={13} />
                            Within · Approaching · Exceeded
                        </>
                    }
                    actions={
                        <div className="flex items-center gap-2">
                            <Link
                                href="/risk-register"
                                className="rounded-xl border border-[var(--border-color)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                            >
                                Risk register
                            </Link>
                            <button
                                type="button"
                                onClick={openCreate}
                                className="btn btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
                            >
                                <Plus size={14} />
                                New statement
                            </button>
                        </div>
                    }
                    stats={[
                        {
                            label: "Statements",
                            value: statements.length,
                            trend: { value: "Board tolerances", neutral: true },
                            icon: Scale,
                        },
                        {
                            label: "Risks evaluated",
                            value: totals.risks,
                            trend: { value: "Open risks in scope", neutral: true },
                            icon: ClipboardList,
                        },
                        {
                            label: "Exceeded",
                            value: summary?.exceeded ?? 0,
                            trend: { value: "Past tolerance", neutral: true },
                            icon: TriangleAlert,
                        },
                        {
                            label: "Approaching",
                            value: summary?.approaching ?? 0,
                            trend: { value: "Within 20% of the limit", neutral: true },
                            icon: ShieldCheck,
                        },
                        {
                            label: "Avg. tolerance",
                            value: `${totals.toleranceAvg}/25`,
                            trend: { value: "Across statements", neutral: true },
                            icon: Scale,
                        },
                    ]}
                />

                {(error || notice) && (
                    <div
                        className={`rounded-xl border px-4 py-3 text-sm ${
                            error
                                ? "border-red-400/30 bg-red-400/10 text-red-600 dark:text-red-400"
                                : "border-emerald-400/30 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                        }`}
                    >
                        {error ?? notice}
                    </div>
                )}

                {/* Portfolio position */}
                {summary && (
                    <div className="flex flex-wrap gap-3">
                        <div className="flex-1 min-w-[180px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                                Portfolio position
                            </p>
                            <p className="mt-1 text-lg font-bold text-[var(--text-primary)]">
                                {summary.status.replace("_", " ")}
                            </p>
                            <p className="text-[11px] text-[var(--text-muted)]">
                                Worst status across {summary.evaluated} open risks
                            </p>
                        </div>
                        <div className="flex-1 min-w-[180px] rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                                Within
                            </p>
                            <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                {summary.within}
                            </p>
                        </div>
                        <div className="flex-1 min-w-[180px] rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                                Approaching
                            </p>
                            <p className="mt-1 text-lg font-bold text-amber-600 dark:text-amber-400">
                                {summary.approaching}
                            </p>
                        </div>
                        <div className="flex-1 min-w-[180px] rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-red-600 dark:text-red-400">
                                Exceeded
                            </p>
                            <p className="mt-1 text-lg font-bold text-red-600 dark:text-red-400">
                                {summary.exceeded}
                            </p>
                        </div>
                        <div className="flex-1 min-w-[180px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                                Not evaluated
                            </p>
                            <p className="mt-1 text-lg font-bold text-[var(--text-primary)]">
                                {summary.notEvaluated}
                            </p>
                            <p className="text-[11px] text-[var(--text-muted)]">No matching statement</p>
                        </div>
                    </div>
                )}

                <SectionCard
                    title="Appetite statements"
                    description="Each statement governs one risk category (case-insensitive); the literal ALL acts as the catch-all."
                >
                    {statements.length === 0 ? (
                        <EmptyState
                            message="No appetite statements yet. Add the tolerances your board has approved so risks are evaluated against them everywhere in the platform."
                            action={
                                <button
                                    type="button"
                                    onClick={openCreate}
                                    className="btn btn-primary rounded-xl px-4 py-2 text-sm font-semibold"
                                >
                                    Create the first statement
                                </button>
                            }
                        />
                    ) : (
                        <div className="space-y-3">
                            {statements.map((statement) => (
                                <article
                                    key={statement.id}
                                    className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4"
                                >
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="font-semibold text-[var(--text-primary)]">
                                                    {statement.category}
                                                </h3>
                                                <Pill
                                                    tone={
                                                        statement.appetiteLevel === "AVERSE"
                                                            ? "danger"
                                                            : statement.appetiteLevel === "CAUTIOUS"
                                                              ? "warning"
                                                              : statement.appetiteLevel === "HUNGRY" ||
                                                                  statement.appetiteLevel === "OPEN"
                                                                ? "info"
                                                                : "neutral"
                                                    }
                                                >
                                                    {statement.appetiteLabel}
                                                </Pill>
                                                {statement.boardApproved ? (
                                                    <Pill tone="success">Board approved</Pill>
                                                ) : (
                                                    <Pill tone="neutral">Draft</Pill>
                                                )}
                                                {statement.reviewDate && (
                                                    <Pill tone="neutral">
                                                        Review {new Date(statement.reviewDate).toLocaleDateString()}
                                                    </Pill>
                                                )}
                                                {statement.owner && (
                                                    <Pill tone="neutral">{statement.owner}</Pill>
                                                )}
                                            </div>
                                            <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
                                                {statement.statement}
                                            </p>
                                            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                                                {LEVEL_HELP[statement.appetiteLevel]}
                                            </p>
                                        </div>

                                        <div className="flex flex-col items-start gap-2 lg:items-end">
                                            <div className="flex items-center gap-2">
                                                <RiskLevelPill level={statement.risks.riskLevel} />
                                                <Pill tone="info">Tolerance ≤ {statement.toleranceMax}/25</Pill>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => openEdit(statement)}
                                                    className="rounded-lg border border-[var(--border-color)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-blue-500/40 hover:text-blue-500"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => void remove(statement.id)}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-red-500/40 hover:text-red-500"
                                                >
                                                    <Trash2 size={12} />
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Live evaluation of the risks this statement governs */}
                                    <div className="mt-4 border-t border-[var(--border-color)] pt-3">
                                        <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-muted)]">
                                            <span>{statement.risks.evaluated} open risks governed</span>
                                            <span>·</span>
                                            <span>{statement.risks.within} within</span>
                                            <span>·</span>
                                            <span>{statement.risks.approaching} approaching</span>
                                            <span>·</span>
                                            <span className="text-red-600 dark:text-red-400">
                                                {statement.risks.exceeded} exceeded
                                            </span>
                                            {statement.risks.evaluated > 0 && (
                                                <>
                                                    <span>·</span>
                                                    <span>worst score {statement.risks.maxScore}</span>
                                                </>
                                            )}
                                        </div>
                                        <ProgressBar
                                            value={
                                                statement.toleranceMax > 0
                                                    ? Math.min(
                                                          (statement.risks.maxScore / statement.toleranceMax) * 100,
                                                          100,
                                                      )
                                                    : 0
                                            }
                                            tone={
                                                statement.risks.exceeded > 0
                                                    ? "danger"
                                                    : statement.risks.approaching > 0
                                                      ? "warning"
                                                      : "success"
                                            }
                                        />
                                        <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                                            Worst governed risk vs tolerance ({statement.risks.maxScore} of{" "}
                                            {statement.toleranceMax} on the 1–25 scale)
                                        </p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </SectionCard>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingId ? "Edit appetite statement" : "New appetite statement"}
                maxWidth="lg"
                footer={
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="rounded-xl border border-[var(--border-color)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={
                                isSaving ||
                                form.category.trim().length < 1 ||
                                form.statement.trim().length < 2
                            }
                            onClick={() => void save()}
                            className="btn btn-primary rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
                        >
                            {isSaving ? "Saving…" : editingId ? "Save statement" : "Create statement"}
                        </button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block">
                            <span className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">
                                Risk category
                            </span>
                            <input
                                value={form.category}
                                onChange={(event) => setForm({ ...form, category: event.target.value })}
                                placeholder="Privacy, Operational, ALL…"
                                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)]"
                            />
                            <span className="mt-1 block text-[11px] text-[var(--text-muted)]">
                                Matched case-insensitively against the risk category. Use ALL as the catch-all.
                            </span>
                        </label>
                        <label className="block">
                            <span className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">
                                Appetite level
                            </span>
                            <select
                                value={form.appetiteLevel}
                                onChange={(event) =>
                                    setForm({ ...form, appetiteLevel: event.target.value })
                                }
                                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)]"
                            >
                                {APPETITE_LEVELS.map((level) => (
                                    <option key={level} value={level}>
                                        {level}
                                    </option>
                                ))}
                            </select>
                            <span className="mt-1 block text-[11px] text-[var(--text-muted)]">
                                {LEVEL_HELP[form.appetiteLevel]}
                            </span>
                        </label>
                    </div>

                    <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">
                            Statement
                        </span>
                        <textarea
                            value={form.statement}
                            onChange={(event) => setForm({ ...form, statement: event.target.value })}
                            rows={3}
                            placeholder="We accept residual privacy risk up to a score of 10; anything above requires board review."
                            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)]"
                        />
                    </label>

                    <div>
                        <div className="mb-1 flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)]">
                            <span>Tolerance (1–25, impact × likelihood)</span>
                            <span className="font-mono text-sm text-[var(--text-primary)]">
                                {form.toleranceMax}
                            </span>
                        </div>
                        <input
                            type="range"
                            min={1}
                            max={25}
                            step={1}
                            value={form.toleranceMax}
                            onChange={(event) =>
                                setForm({ ...form, toleranceMax: Number(event.target.value) })
                            }
                            className="w-full accent-blue-500"
                        />
                        <div className="mt-1 flex justify-between text-[10px] text-[var(--text-muted)]">
                            <span>1 — averse</span>
                            <span>13 — moderate</span>
                            <span>25 — open</span>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block">
                            <span className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">
                                Review date
                            </span>
                            <input
                                type="date"
                                value={form.reviewDate}
                                onChange={(event) => setForm({ ...form, reviewDate: event.target.value })}
                                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)]"
                            />
                        </label>
                        <label className="block">
                            <span className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">
                                Owner
                            </span>
                            <input
                                value={form.owner}
                                onChange={(event) => setForm({ ...form, owner: event.target.value })}
                                placeholder="Board / CRO"
                                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)]"
                            />
                        </label>
                    </div>

                    <label className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <input
                            type="checkbox"
                            checked={form.boardApproved}
                            onChange={(event) =>
                                setForm({ ...form, boardApproved: event.target.checked })
                            }
                            className="accent-blue-500"
                        />
                        Board approved
                    </label>
                </div>
            </Modal>
        </DashboardLayout>
    );
}
