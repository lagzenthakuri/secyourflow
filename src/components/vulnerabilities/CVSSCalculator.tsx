"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface CVSSCalculatorProps {
    onScoreChange: (score: string) => void;
    onVectorChange?: (vector: string) => void;
    /** Existing vector to load when editing, e.g. "CVSS:3.1/AV:N/...". */
    initialVector?: string | null;
}

type AV = "N" | "A" | "L" | "P";
type AC = "L" | "H";
type PR = "N" | "L" | "H";
type UI = "N" | "R";
type S = "U" | "C";
type CIA = "N" | "L" | "H";

interface CVSSMetrics {
    av: AV;
    ac: AC;
    pr: PR;
    ui: UI;
    s: S;
    c: CIA;
    i: CIA;
    a: CIA;
}

interface MetricButtonProps {
    label: string;
    value: string;
    currentValue: string;
    onClick: () => void;
}

function MetricButton({ label, value, currentValue, onClick }: MetricButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`px-3 py-1.5 text-xs rounded-md border transition-all ${currentValue === value
                ? "bg-sky-500/20 border-sky-500 text-sky-600 dark:text-sky-400"
                : "bg-[var(--bg-tertiary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
                }`}
        >
            <div className="font-medium">{label}</div>
            <div className="opacity-60">{value}</div>
        </button>
    );
}

const DEFAULT_METRICS: CVSSMetrics = {
    av: "N",
    ac: "L",
    pr: "N",
    ui: "N",
    s: "U",
    c: "N",
    i: "N",
    a: "N",
};

const ALLOWED: Record<keyof CVSSMetrics, readonly string[]> = {
    av: ["N", "A", "L", "P"],
    ac: ["L", "H"],
    pr: ["N", "L", "H"],
    ui: ["N", "R"],
    s: ["U", "C"],
    c: ["N", "L", "H"],
    i: ["N", "L", "H"],
    a: ["N", "L", "H"],
};

/** Reads a CVSS v3.x vector string back into metric selections. */
export function parseVector(vector: string | null | undefined): CVSSMetrics | null {
    if (!vector) return null;

    const parsed: CVSSMetrics = { ...DEFAULT_METRICS };
    let matched = 0;

    for (const part of vector.split("/")) {
        const [rawKey, rawValue] = part.split(":");
        if (!rawKey || !rawValue) continue;

        const key = rawKey.toLowerCase() as keyof CVSSMetrics;
        const value = rawValue.toUpperCase();
        if (ALLOWED[key]?.includes(value)) {
            // Each metric is a narrow union; the allow-list above is the check.
            (parsed[key] as string) = value;
            matched += 1;
        }
    }

    return matched >= 4 ? parsed : null;
}

export function CVSSCalculator({ onScoreChange, onVectorChange, initialVector }: CVSSCalculatorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [metrics, setMetrics] = useState<CVSSMetrics>(() => parseVector(initialVector) ?? DEFAULT_METRICS);
    // The calculator must not publish a score the user never chose. Mounting it
    // used to emit "0.0" immediately, which set severity to INFORMATIONAL and
    // then disabled the severity dropdown because `!!"0.0"` is true — so every
    // manually added vulnerability was saved as INFORMATIONAL / CVSS 0.
    const hasUserEdited = useRef(false);

    const calculateScore = (m: CVSSMetrics) => {
        const WEIGHTS = {
            av: { N: 0.85, A: 0.62, L: 0.55, P: 0.2 },
            ac: { L: 0.77, H: 0.44 },
            pr: {
                U: { N: 0.85, L: 0.62, H: 0.27 },
                C: { N: 0.85, L: 0.68, H: 0.5 },
            },
            ui: { N: 0.85, R: 0.62 },
            cia: { N: 0, L: 0.22, H: 0.56 },
        };

        const iss = 1 - (1 - WEIGHTS.cia[m.c]) * (1 - WEIGHTS.cia[m.i]) * (1 - WEIGHTS.cia[m.a]);

        let impact: number;
        if (m.s === "U") {
            impact = 6.42 * iss;
        } else {
            impact = 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15);
        }

        const exploitability = 8.22 * WEIGHTS.av[m.av] * WEIGHTS.ac[m.ac] * WEIGHTS.pr[m.s][m.pr] * WEIGHTS.ui[m.ui];

        let baseScore: number;
        if (impact <= 0) {
            baseScore = 0;
        } else if (m.s === "U") {
            baseScore = Math.ceil(Math.min(impact + exploitability, 10) * 10) / 10;
        } else {
            baseScore = Math.ceil(Math.min(1.1 * (impact + exploitability), 10) * 10) / 10;
        }

        return baseScore.toFixed(1);
    };

    const generateVector = (m: CVSSMetrics) => {
        return `CVSS:3.1/AV:${m.av}/AC:${m.ac}/PR:${m.pr}/UI:${m.ui}/S:${m.s}/C:${m.c}/I:${m.i}/A:${m.a}`;
    };

    useEffect(() => {
        if (!hasUserEdited.current) {
            return;
        }

        onScoreChange(calculateScore(metrics));
        onVectorChange?.(generateVector(metrics));
    }, [metrics, onScoreChange, onVectorChange]);

    const updateMetric = (patch: Partial<CVSSMetrics>) => {
        hasUserEdited.current = true;
        setMetrics((previous) => ({ ...previous, ...patch }));
    };

    return (
        <div className="border border-[var(--border-color)] rounded-lg overflow-hidden bg-[var(--bg-tertiary)]">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-3 hover:bg-[var(--bg-elevated)] transition-all duration-300 ease-in-out"
            >
                <span className="text-sm font-medium">CVSS v3.1 Calculator</span>
                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {isOpen && (
                <div className="p-4 space-y-4 border-t border-[var(--border-color)]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Attack Vector */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Attack Vector</label>
                            <div className="flex flex-wrap gap-2">
                                <MetricButton label="Network" value="N" currentValue={metrics.av} onClick={() => updateMetric({ av: "N" })} />
                                <MetricButton label="Adjacent" value="A" currentValue={metrics.av} onClick={() => updateMetric({ av: "A" })} />
                                <MetricButton label="Local" value="L" currentValue={metrics.av} onClick={() => updateMetric({ av: "L" })} />
                                <MetricButton label="Physical" value="P" currentValue={metrics.av} onClick={() => updateMetric({ av: "P" })} />
                            </div>
                        </div>

                        {/* Attack Complexity */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Attack Complexity</label>
                            <div className="flex flex-wrap gap-2">
                                <MetricButton label="Low" value="L" currentValue={metrics.ac} onClick={() => updateMetric({ ac: "L" })} />
                                <MetricButton label="High" value="H" currentValue={metrics.ac} onClick={() => updateMetric({ ac: "H" })} />
                            </div>
                        </div>

                        {/* Privileges Required */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Privileges Required</label>
                            <div className="flex flex-wrap gap-2">
                                <MetricButton label="None" value="N" currentValue={metrics.pr} onClick={() => updateMetric({ pr: "N" })} />
                                <MetricButton label="Low" value="L" currentValue={metrics.pr} onClick={() => updateMetric({ pr: "L" })} />
                                <MetricButton label="High" value="H" currentValue={metrics.pr} onClick={() => updateMetric({ pr: "H" })} />
                            </div>
                        </div>

                        {/* User Interaction */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">User Interaction</label>
                            <div className="flex flex-wrap gap-2">
                                <MetricButton label="None" value="N" currentValue={metrics.ui} onClick={() => updateMetric({ ui: "N" })} />
                                <MetricButton label="Required" value="R" currentValue={metrics.ui} onClick={() => updateMetric({ ui: "R" })} />
                            </div>
                        </div>

                        {/* Scope */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Scope</label>
                            <div className="flex flex-wrap gap-2">
                                <MetricButton label="Unchanged" value="U" currentValue={metrics.s} onClick={() => updateMetric({ s: "U" })} />
                                <MetricButton label="Changed" value="C" currentValue={metrics.s} onClick={() => updateMetric({ s: "C" })} />
                            </div>
                        </div>

                        {/* Confidentiality */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Confidentiality</label>
                            <div className="flex flex-wrap gap-2">
                                <MetricButton label="None" value="N" currentValue={metrics.c} onClick={() => updateMetric({ c: "N" })} />
                                <MetricButton label="Low" value="L" currentValue={metrics.c} onClick={() => updateMetric({ c: "L" })} />
                                <MetricButton label="High" value="H" currentValue={metrics.c} onClick={() => updateMetric({ c: "H" })} />
                            </div>
                        </div>

                        {/* Integrity */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Integrity</label>
                            <div className="flex flex-wrap gap-2">
                                <MetricButton label="None" value="N" currentValue={metrics.i} onClick={() => updateMetric({ i: "N" })} />
                                <MetricButton label="Low" value="L" currentValue={metrics.i} onClick={() => updateMetric({ i: "L" })} />
                                <MetricButton label="High" value="H" currentValue={metrics.i} onClick={() => updateMetric({ i: "H" })} />
                            </div>
                        </div>

                        {/* Availability */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Availability</label>
                            <div className="flex flex-wrap gap-2">
                                <MetricButton label="None" value="N" currentValue={metrics.a} onClick={() => updateMetric({ a: "N" })} />
                                <MetricButton label="Low" value="L" currentValue={metrics.a} onClick={() => updateMetric({ a: "L" })} />
                                <MetricButton label="High" value="H" currentValue={metrics.a} onClick={() => updateMetric({ a: "H" })} />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-[var(--border-color)] flex items-center justify-between">
                        <div className="text-xs text-[var(--text-muted)]">
                            CVSS v3.1 Base Score
                        </div>
                        <div className="text-2xl font-bold text-primary">
                            {calculateScore(metrics)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
