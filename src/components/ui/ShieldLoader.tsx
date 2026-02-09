"use client";

import { cn } from "@/lib/utils";
import { useId } from "react";

interface ShieldLoaderProps {
  size?: "sm" | "md" | "lg" | "xl";
  text?: string;
  variant?: "primary" | "cyber"; // keep minimal (blue themes)
  className?: string;
}

const sizeMap = {
  sm: { px: 24, stroke: 1.0, text: "text-xs" },
  md: { px: 32, stroke: 1.0, text: "text-sm" },
  lg: { px: 40, stroke: 1.0, text: "text-sm" },
  xl: { px: 48, stroke: 1.0, text: "text-base" },
};

const variants = {
  primary: {
    text: "text-blue-300",
    // Use CSS vars if you have them; these are safe defaults:
    c1: "var(--color-primary-600, #2563eb)",
    c2: "var(--color-primary-500, #3b82f6)",
    c3: "var(--color-accent-500, #06b6d4)",
  },
  cyber: {
    text: "text-sky-300",
    c1: "var(--color-primary-600, #2563eb)",
    c2: "var(--color-accent-500, #06b6d4)",
    c3: "var(--color-primary-500, #3b82f6)",
  },
};

const SHIELD_PATH =
  "M12 2L4 6V11C4 16.55 7.84 21.74 12 23C16.16 21.74 20 16.55 20 11V6L12 2Z";

/**
 * Minimal shield loader:
 * - calm outline
 * - outside->inside fill wipe using an animated mask "hole" that shrinks
 * - subtle outline draw (no heavy glow)
 * - respects reduced motion via CSS
 */
export function ShieldLoader({
  size = "md",
  text,
  variant = "primary",
  className,
}: ShieldLoaderProps) {
  const id = useId().replace(/:/g, "");
  const clipId = `syf-shield-clip-${id}`;
  const maskId = `syf-shield-mask-${id}`;
  const gradFillId = `syf-shield-fill-${id}`;
  const gradStrokeId = `syf-shield-stroke-${id}`;

  const s = sizeMap[size];
  const v = variants[variant];

  return (
    <svg
      width={s.px}
      height={s.px}
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label="Loading"
      className={cn("syf-shield", className)}
    >
        <defs>
          {/* Clip to shield shape */}
          <clipPath id={clipId}>
            <path d={SHIELD_PATH} />
          </clipPath>

          {/* Fill gradient (calm blue) */}
          <linearGradient id={gradFillId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={v.c1} stopOpacity="0.9" />
            <stop offset="0.6" stopColor={v.c2} stopOpacity="0.85" />
            <stop offset="1" stopColor={v.c3} stopOpacity="0.75" />
          </linearGradient>

          {/* Stroke highlight gradient */}
          <linearGradient id={gradStrokeId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={v.c2} stopOpacity="0.9" />
            <stop offset="1" stopColor={v.c3} stopOpacity="0.9" />
          </linearGradient>

          {/* Mask: white reveals, black hides.
              The black circle starts big (hides center) then shrinks -> outside->inside reveal. */}
          <mask id={maskId} maskUnits="userSpaceOnUse">
            <rect x="0" y="0" width="24" height="24" fill="white" />
            <circle
              cx="12"
              cy="12"
              r="13"
              fill="black"
              className="syf-shield-wipe"
            />
          </mask>
        </defs>

        {/* Base outline (quiet) */}
        <path
          d={SHIELD_PATH}
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={s.stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Fill layer (outside -> inside wipe) */}
        <g clipPath={`url(#${clipId})`}>
          <rect
            x="0"
            y="0"
            width="24"
            height="24"
            fill={`url(#${gradFillId})`}
            mask={`url(#${maskId})`}
            opacity="0.22"
            className="syf-shield-fill"
          />
        </g>

        {/* Subtle animated stroke draw */}
        <path
          d={SHIELD_PATH}
          stroke={`url(#${gradStrokeId})`}
          strokeWidth={s.stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          className="syf-shield-stroke"
          strokeDasharray="96"
          strokeDashoffset="96"
        />
      </svg>
  );
}
