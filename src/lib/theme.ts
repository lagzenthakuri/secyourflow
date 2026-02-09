/**
 * Centralized theme constants for severity levels
 */
export const SEVERITY_THEME = {
  CRITICAL: {
    color: '#ef4444',
    bgClass: 'border-red-400/35 bg-red-500/10 text-red-200',
  },
  HIGH: {
    color: '#f97316',
    bgClass: 'border-orange-400/35 bg-orange-500/10 text-orange-200',
  },
  MEDIUM: {
    color: '#eab308',
    bgClass: 'border-yellow-400/35 bg-yellow-500/10 text-yellow-200',
  },
  LOW: {
    color: '#22c55e',
    bgClass: 'border-emerald-400/35 bg-emerald-500/10 text-emerald-200',
  },
  INFORMATIONAL: {
    color: '#6b7280',
    bgClass: 'border-slate-400/35 bg-slate-500/10 text-slate-200',
  },
} as const;

export function getSeverityTheme(severity: string) {
  return SEVERITY_THEME[severity as keyof typeof SEVERITY_THEME] || SEVERITY_THEME.INFORMATIONAL;
}
