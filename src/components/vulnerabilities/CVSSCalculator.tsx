"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface CVSSCalculatorProps {
  /** Existing vector to load when editing, e.g. "CVSS:3.1/AV:N/...". */
  initialVector?: string | null;
  onScoreChange: (score: string) => void;
  onVectorChange?: (vector: string) => void;
}

type AV = "N" | "A" | "L" | "P";
type AC = "L" | "H";
type PR = "N" | "L" | "H";
type UI = "N" | "R";
type S = "U" | "C";
type CIA = "N" | "L" | "H";

interface CVSSMetrics {
  a: CIA;
  ac: AC;
  av: AV;
  c: CIA;
  i: CIA;
  pr: PR;
  s: S;
  ui: UI;
}

interface MetricButtonProps {
  currentValue: string;
  label: string;
  onClick: () => void;
  value: string;
}

function MetricButton({
  label,
  value,
  currentValue,
  onClick,
}: MetricButtonProps) {
  return (
    <button
      className={`rounded-md border px-3 py-1.5 text-xs transition-all ${
        currentValue === value
          ? "border-sky-500 bg-sky-500/20 text-sky-600 dark:text-sky-400"
          : "border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
      }`}
      onClick={onClick}
      type="button"
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
export function parseVector(
  vector: string | null | undefined
): CVSSMetrics | null {
  if (!vector) {
    return null;
  }

  const parsed: CVSSMetrics = { ...DEFAULT_METRICS };
  let matched = 0;

  for (const part of vector.split("/")) {
    const [rawKey, rawValue] = part.split(":");
    if (!(rawKey && rawValue)) {
      continue;
    }

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

export function CVSSCalculator({
  onScoreChange,
  onVectorChange,
  initialVector,
}: CVSSCalculatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [metrics, setMetrics] = useState<CVSSMetrics>(
    () => parseVector(initialVector) ?? DEFAULT_METRICS
  );
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

    const iss =
      1 -
      (1 - WEIGHTS.cia[m.c]) * (1 - WEIGHTS.cia[m.i]) * (1 - WEIGHTS.cia[m.a]);

    let impact: number;
    if (m.s === "U") {
      impact = 6.42 * iss;
    } else {
      impact = 7.52 * (iss - 0.029) - 3.25 * (iss - 0.02) ** 15;
    }

    const exploitability =
      8.22 *
      WEIGHTS.av[m.av] *
      WEIGHTS.ac[m.ac] *
      WEIGHTS.pr[m.s][m.pr] *
      WEIGHTS.ui[m.ui];

    let baseScore: number;
    if (impact <= 0) {
      baseScore = 0;
    } else if (m.s === "U") {
      baseScore = Math.ceil(Math.min(impact + exploitability, 10) * 10) / 10;
    } else {
      baseScore =
        Math.ceil(Math.min(1.1 * (impact + exploitability), 10) * 10) / 10;
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
  }, [metrics, onScoreChange, onVectorChange, calculateScore, generateVector]);

  const updateMetric = (patch: Partial<CVSSMetrics>) => {
    hasUserEdited.current = true;
    setMetrics((previous) => ({ ...previous, ...patch }));
  };

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)]">
      <button
        className="flex w-full items-center justify-between p-3 transition-all duration-300 ease-in-out hover:bg-[var(--bg-elevated)]"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span className="font-medium text-sm">CVSS v3.1 Calculator</span>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isOpen && (
        <div className="space-y-4 border-[var(--border-color)] border-t p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Attack Vector */}
            <div className="space-y-2">
              <label className="font-medium text-[var(--text-muted)] text-xs uppercase tracking-wider">
                Attack Vector
              </label>
              <div className="flex flex-wrap gap-2">
                <MetricButton
                  currentValue={metrics.av}
                  label="Network"
                  onClick={() => updateMetric({ av: "N" })}
                  value="N"
                />
                <MetricButton
                  currentValue={metrics.av}
                  label="Adjacent"
                  onClick={() => updateMetric({ av: "A" })}
                  value="A"
                />
                <MetricButton
                  currentValue={metrics.av}
                  label="Local"
                  onClick={() => updateMetric({ av: "L" })}
                  value="L"
                />
                <MetricButton
                  currentValue={metrics.av}
                  label="Physical"
                  onClick={() => updateMetric({ av: "P" })}
                  value="P"
                />
              </div>
            </div>

            {/* Attack Complexity */}
            <div className="space-y-2">
              <label className="font-medium text-[var(--text-muted)] text-xs uppercase tracking-wider">
                Attack Complexity
              </label>
              <div className="flex flex-wrap gap-2">
                <MetricButton
                  currentValue={metrics.ac}
                  label="Low"
                  onClick={() => updateMetric({ ac: "L" })}
                  value="L"
                />
                <MetricButton
                  currentValue={metrics.ac}
                  label="High"
                  onClick={() => updateMetric({ ac: "H" })}
                  value="H"
                />
              </div>
            </div>

            {/* Privileges Required */}
            <div className="space-y-2">
              <label className="font-medium text-[var(--text-muted)] text-xs uppercase tracking-wider">
                Privileges Required
              </label>
              <div className="flex flex-wrap gap-2">
                <MetricButton
                  currentValue={metrics.pr}
                  label="None"
                  onClick={() => updateMetric({ pr: "N" })}
                  value="N"
                />
                <MetricButton
                  currentValue={metrics.pr}
                  label="Low"
                  onClick={() => updateMetric({ pr: "L" })}
                  value="L"
                />
                <MetricButton
                  currentValue={metrics.pr}
                  label="High"
                  onClick={() => updateMetric({ pr: "H" })}
                  value="H"
                />
              </div>
            </div>

            {/* User Interaction */}
            <div className="space-y-2">
              <label className="font-medium text-[var(--text-muted)] text-xs uppercase tracking-wider">
                User Interaction
              </label>
              <div className="flex flex-wrap gap-2">
                <MetricButton
                  currentValue={metrics.ui}
                  label="None"
                  onClick={() => updateMetric({ ui: "N" })}
                  value="N"
                />
                <MetricButton
                  currentValue={metrics.ui}
                  label="Required"
                  onClick={() => updateMetric({ ui: "R" })}
                  value="R"
                />
              </div>
            </div>

            {/* Scope */}
            <div className="space-y-2">
              <label className="font-medium text-[var(--text-muted)] text-xs uppercase tracking-wider">
                Scope
              </label>
              <div className="flex flex-wrap gap-2">
                <MetricButton
                  currentValue={metrics.s}
                  label="Unchanged"
                  onClick={() => updateMetric({ s: "U" })}
                  value="U"
                />
                <MetricButton
                  currentValue={metrics.s}
                  label="Changed"
                  onClick={() => updateMetric({ s: "C" })}
                  value="C"
                />
              </div>
            </div>

            {/* Confidentiality */}
            <div className="space-y-2">
              <label className="font-medium text-[var(--text-muted)] text-xs uppercase tracking-wider">
                Confidentiality
              </label>
              <div className="flex flex-wrap gap-2">
                <MetricButton
                  currentValue={metrics.c}
                  label="None"
                  onClick={() => updateMetric({ c: "N" })}
                  value="N"
                />
                <MetricButton
                  currentValue={metrics.c}
                  label="Low"
                  onClick={() => updateMetric({ c: "L" })}
                  value="L"
                />
                <MetricButton
                  currentValue={metrics.c}
                  label="High"
                  onClick={() => updateMetric({ c: "H" })}
                  value="H"
                />
              </div>
            </div>

            {/* Integrity */}
            <div className="space-y-2">
              <label className="font-medium text-[var(--text-muted)] text-xs uppercase tracking-wider">
                Integrity
              </label>
              <div className="flex flex-wrap gap-2">
                <MetricButton
                  currentValue={metrics.i}
                  label="None"
                  onClick={() => updateMetric({ i: "N" })}
                  value="N"
                />
                <MetricButton
                  currentValue={metrics.i}
                  label="Low"
                  onClick={() => updateMetric({ i: "L" })}
                  value="L"
                />
                <MetricButton
                  currentValue={metrics.i}
                  label="High"
                  onClick={() => updateMetric({ i: "H" })}
                  value="H"
                />
              </div>
            </div>

            {/* Availability */}
            <div className="space-y-2">
              <label className="font-medium text-[var(--text-muted)] text-xs uppercase tracking-wider">
                Availability
              </label>
              <div className="flex flex-wrap gap-2">
                <MetricButton
                  currentValue={metrics.a}
                  label="None"
                  onClick={() => updateMetric({ a: "N" })}
                  value="N"
                />
                <MetricButton
                  currentValue={metrics.a}
                  label="Low"
                  onClick={() => updateMetric({ a: "L" })}
                  value="L"
                />
                <MetricButton
                  currentValue={metrics.a}
                  label="High"
                  onClick={() => updateMetric({ a: "H" })}
                  value="H"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-[var(--border-color)] border-t pt-4">
            <div className="text-[var(--text-muted)] text-xs">
              CVSS v3.1 Base Score
            </div>
            <div className="font-bold text-2xl text-primary">
              {calculateScore(metrics)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
