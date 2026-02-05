"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
    LoadingBar,
    LoadingSkeleton,
} from "@/components/ui/LoadingBar";
import { SecurityLoader } from "@/components/ui/SecurityLoader";
import { Play, Pause, RotateCcw } from "lucide-react";

export default function LoadingDemo() {
    const [showTopBar, setShowTopBar] = useState(true);
    const [showBottomBar, setShowBottomBar] = useState(false);
    const [progress, setProgress] = useState(65);
    const [variant, setVariant] = useState<"primary" | "cyber" | "success" | "warning" | "danger">("cyber");

    const variants = ["primary", "cyber", "success", "warning", "danger"] as const;

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Loading Components</h1>
                    <p className="text-[var(--text-secondary)]">
                        Reusable loading indicators with security-themed styling
                    </p>
                </div>

                {/* Loading Bars Demo */}
                <div className="card p-6 space-y-6">
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-4">Loading Bars</h2>
                        <p className="text-sm text-[var(--text-secondary)] mb-6">
                            Top/bottom positioned progress bars with smooth animations
                        </p>
                    </div>

                    {/* Controls */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-white">Position</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setShowTopBar(true);
                                        setShowBottomBar(false);
                                    }}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out ${showTopBar
                                        ? "bg-blue-500 text-white"
                                        : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
                                        }`}
                                >
                                    Top
                                </button>
                                <button
                                    onClick={() => {
                                        setShowTopBar(false);
                                        setShowBottomBar(true);
                                    }}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out ${showBottomBar
                                        ? "bg-blue-500 text-white"
                                        : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
                                        }`}
                                >
                                    Bottom
                                </button>
                                <button
                                    onClick={() => {
                                        setShowTopBar(false);
                                        setShowBottomBar(false);
                                    }}
                                    className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-all duration-300 ease-in-out"
                                >
                                    Hide
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-medium text-white">
                                Progress: {progress}%
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={progress}
                                onChange={(e) => setProgress(Number(e.target.value))}
                                className="w-full"
                            />
                        </div>
                    </div>

                    {/* Variant Selection */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-white">Color Variant</label>
                        <div className="flex flex-wrap gap-2">
                            {variants.map((v) => (
                                <button
                                    key={v}
                                    onClick={() => setVariant(v)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all duration-300 ease-in-out ${variant === v
                                        ? "bg-blue-500 text-white"
                                        : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
                                        }`}
                                >
                                    {v}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Inline Examples */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-white">Inline Loading Bars</h3>

                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-[var(--text-muted)] mb-2">Determinate (with progress)</p>
                                <LoadingBar
                                    position="inline"
                                    progress={progress}
                                    variant={variant}
                                    height={4}
                                />
                            </div>

                            <div>
                                <p className="text-xs text-[var(--text-muted)] mb-2">Indeterminate (animated)</p>
                                <LoadingBar
                                    position="inline"
                                    variant={variant}
                                    height={4}
                                />
                            </div>

                            <div>
                                <p className="text-xs text-[var(--text-muted)] mb-2">Thick bar with glow</p>
                                <LoadingBar
                                    position="inline"
                                    variant={variant}
                                    height={8}
                                    showGlow={true}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Loading Spinners */}
                <div className="card p-6 space-y-6">
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-4">Loading Spinners</h2>
                        <p className="text-sm text-[var(--text-secondary)] mb-6">
                            Circular loading indicators for various use cases
                        </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="flex flex-col items-center gap-3 p-4 bg-[var(--bg-tertiary)] rounded-lg">
                            <SecurityLoader size="xs" variant="cyber" />
                            <span className="text-xs text-[var(--text-muted)]">Extra Small</span>
                        </div>
                        <div className="flex flex-col items-center gap-3 p-4 bg-[var(--bg-tertiary)] rounded-lg">
                            <SecurityLoader size="sm" variant="cyber" />
                            <span className="text-xs text-[var(--text-muted)]">Small</span>
                        </div>
                        <div className="flex flex-col items-center gap-3 p-4 bg-[var(--bg-tertiary)] rounded-lg">
                            <SecurityLoader size="md" variant="cyber" />
                            <span className="text-xs text-[var(--text-muted)]">Medium</span>
                        </div>
                        <div className="flex flex-col items-center gap-3 p-4 bg-[var(--bg-tertiary)] rounded-lg">
                            <SecurityLoader size="lg" variant="cyber" />
                            <span className="text-xs text-[var(--text-muted)]">Large</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
                            <SecurityLoader variant="cyber" text="Loading data..." size="sm" />
                        </div>
                        <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
                            <SecurityLoader variant="success" text="Processing..." size="sm" />
                        </div>
                        <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
                            <SecurityLoader variant="danger" text="Scanning..." size="sm" />
                        </div>
                    </div>
                </div>

                {/* Loading Dots */}
                <div className="card p-6 space-y-6">
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-4">Loading Dots</h2>
                        <p className="text-sm text-[var(--text-secondary)] mb-6">
                            Subtle animated dots for inline loading states
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center justify-center gap-2 p-4 bg-[var(--bg-tertiary)] rounded-lg">
                            <SecurityLoader variant="cyber" size="xs" text="Loading..." />
                        </div>
                        <div className="flex items-center justify-center gap-2 p-4 bg-[var(--bg-tertiary)] rounded-lg">
                            <SecurityLoader variant="primary" size="xs" text="Processing..." />
                        </div>
                        <div className="flex items-center justify-center gap-2 p-4 bg-[var(--bg-tertiary)] rounded-lg">
                            <SecurityLoader variant="success" size="xs" text="Analyzing..." />
                        </div>
                    </div>
                </div>

                {/* Loading Skeletons */}
                <div className="card p-6 space-y-6">
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-4">Loading Skeletons</h2>
                        <p className="text-sm text-[var(--text-secondary)] mb-6">
                            Placeholder skeletons for content loading states
                        </p>
                    </div>

                    <div className="space-y-6">
                        {/* Card Skeleton */}
                        <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg space-y-3">
                            <div className="flex items-center gap-3">
                                <LoadingSkeleton width="48px" height="48px" rounded="lg" />
                                <div className="flex-1 space-y-2">
                                    <LoadingSkeleton width="60%" height="16px" />
                                    <LoadingSkeleton width="40%" height="12px" />
                                </div>
                            </div>
                            <LoadingSkeleton lines={3} height="12px" />
                        </div>

                        {/* List Skeleton */}
                        <div className="space-y-2">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                                    <LoadingSkeleton width="32px" height="32px" rounded="full" />
                                    <div className="flex-1">
                                        <LoadingSkeleton width="70%" height="14px" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Usage Examples */}
                <div className="card p-6 space-y-4">
                    <h2 className="text-xl font-semibold text-white mb-4">Usage Examples</h2>

                    <div className="bg-[var(--bg-tertiary)] p-4 rounded-lg">
                        <pre className="text-xs text-[var(--text-secondary)] overflow-x-auto">
                            {`// Top loading bar
<LoadingBar 
  position="top" 
  variant="cyber" 
  isLoading={isLoading} 
/>

// Progress bar
<LoadingBar 
  position="inline" 
  progress={uploadProgress} 
  variant="primary" 
/>

// Security Loader with icon & text
<SecurityLoader 
  size="lg" 
  variant="cyber" 
  text="Loading data..." 
/>

// Small Security Loader
<SecurityLoader variant="cyber" size="xs" />

// Skeleton loader
<LoadingSkeleton lines={3} height="12px" />`}
                        </pre>
                    </div>
                </div>
            </div>

            {/* Active Loading Bars */}
            {showTopBar && (
                <LoadingBar
                    position="top"
                    progress={progress}
                    variant={variant}
                    height={4}
                />
            )}
            {showBottomBar && (
                <LoadingBar
                    position="bottom"
                    progress={progress}
                    variant={variant}
                    height={4}
                />
            )}
        </DashboardLayout>
    );
}
