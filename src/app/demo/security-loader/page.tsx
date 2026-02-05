"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
    SecurityLoader,
    SecurityLoadingOverlay,
    SecurityLoadingCard
} from "@/components/ui/SecurityLoader";

export default function SecurityLoaderDemo() {
    const [showOverlay, setShowOverlay] = useState(false);
    const [variant, setVariant] = useState<"primary" | "cyber" | "success" | "warning" | "danger">("cyber");
    const [icon, setIcon] = useState<"shield" | "lock" | "scan" | "alert" | "check">("shield");
    const [size, setSize] = useState<"sm" | "md" | "lg" | "xl">("md");

    const variants = ["primary", "cyber", "success", "warning", "danger"] as const;
    const icons = ["shield", "lock", "scan", "alert", "check"] as const;
    const sizes = ["sm", "md", "lg", "xl"] as const;

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Security Loader</h1>
                    <p className="text-[var(--text-secondary)]">
                        Animated shield loader with blue ring - perfect for security operations
                    </p>
                </div>

                {/* Interactive Demo */}
                <div className="card p-6 space-y-6">
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-4">Interactive Demo</h2>
                        <p className="text-sm text-[var(--text-secondary)] mb-6">
                            Customize the security loader with different options
                        </p>
                    </div>

                    {/* Controls */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Icon Selection */}
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-white">Icon</label>
                            <div className="flex flex-wrap gap-2">
                                {icons.map((i) => (
                                    <button
                                        key={i}
                                        onClick={() => setIcon(i)}
                                        className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-all duration-300 ease-in-out ${icon === i
                                                ? "bg-blue-500 text-white"
                                                : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
                                            }`}
                                    >
                                        {i}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Size Selection */}
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-white">Size</label>
                            <div className="flex flex-wrap gap-2">
                                {sizes.map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setSize(s)}
                                        className={`px-3 py-2 rounded-lg text-xs font-medium uppercase transition-all duration-300 ease-in-out ${size === s
                                                ? "bg-blue-500 text-white"
                                                : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
                                            }`}
                                    >
                                        {s}
                                    </button>
                                ))}
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
                                        className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-all duration-300 ease-in-out ${variant === v
                                                ? "bg-blue-500 text-white"
                                                : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
                                            }`}
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="mt-8 p-12 bg-[var(--bg-tertiary)] rounded-xl flex items-center justify-center">
                        <SecurityLoader
                            size={size}
                            icon={icon}
                            variant={variant}
                            text="Securing your data..."
                        />
                    </div>
                </div>

                {/* Size Variants */}
                <div className="card p-6 space-y-6">
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-4">Size Variants</h2>
                        <p className="text-sm text-[var(--text-secondary)] mb-6">
                            Different sizes for various use cases
                        </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="flex flex-col items-center gap-4 p-6 bg-[var(--bg-tertiary)] rounded-lg">
                            <SecurityLoader size="sm" icon="shield" variant="cyber" />
                            <span className="text-xs text-[var(--text-muted)]">Small</span>
                        </div>
                        <div className="flex flex-col items-center gap-4 p-6 bg-[var(--bg-tertiary)] rounded-lg">
                            <SecurityLoader size="md" icon="shield" variant="cyber" />
                            <span className="text-xs text-[var(--text-muted)]">Medium</span>
                        </div>
                        <div className="flex flex-col items-center gap-4 p-6 bg-[var(--bg-tertiary)] rounded-lg">
                            <SecurityLoader size="lg" icon="shield" variant="cyber" />
                            <span className="text-xs text-[var(--text-muted)]">Large</span>
                        </div>
                        <div className="flex flex-col items-center gap-4 p-6 bg-[var(--bg-tertiary)] rounded-lg">
                            <SecurityLoader size="xl" icon="shield" variant="cyber" />
                            <span className="text-xs text-[var(--text-muted)]">Extra Large</span>
                        </div>
                    </div>
                </div>

                {/* Icon Variants */}
                <div className="card p-6 space-y-6">
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-4">Icon Variants</h2>
                        <p className="text-sm text-[var(--text-secondary)] mb-6">
                            Different icons for different security operations
                        </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                        <div className="flex flex-col items-center gap-4 p-6 bg-[var(--bg-tertiary)] rounded-lg">
                            <SecurityLoader size="md" icon="shield" variant="cyber" />
                            <span className="text-xs text-[var(--text-muted)]">Shield</span>
                        </div>
                        <div className="flex flex-col items-center gap-4 p-6 bg-[var(--bg-tertiary)] rounded-lg">
                            <SecurityLoader size="md" icon="lock" variant="cyber" />
                            <span className="text-xs text-[var(--text-muted)]">Lock</span>
                        </div>
                        <div className="flex flex-col items-center gap-4 p-6 bg-[var(--bg-tertiary)] rounded-lg">
                            <SecurityLoader size="md" icon="scan" variant="cyber" />
                            <span className="text-xs text-[var(--text-muted)]">Scan</span>
                        </div>
                        <div className="flex flex-col items-center gap-4 p-6 bg-[var(--bg-tertiary)] rounded-lg">
                            <SecurityLoader size="md" icon="alert" variant="warning" />
                            <span className="text-xs text-[var(--text-muted)]">Alert</span>
                        </div>
                        <div className="flex flex-col items-center gap-4 p-6 bg-[var(--bg-tertiary)] rounded-lg">
                            <SecurityLoader size="md" icon="check" variant="success" />
                            <span className="text-xs text-[var(--text-muted)]">Check</span>
                        </div>
                    </div>
                </div>

                {/* Color Variants */}
                <div className="card p-6 space-y-6">
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-4">Color Variants</h2>
                        <p className="text-sm text-[var(--text-secondary)] mb-6">
                            Match the loader to your operation type
                        </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                        <div className="flex flex-col items-center gap-4 p-6 bg-[var(--bg-tertiary)] rounded-lg">
                            <SecurityLoader size="md" icon="shield" variant="primary" />
                            <span className="text-xs text-[var(--text-muted)]">Primary</span>
                        </div>
                        <div className="flex flex-col items-center gap-4 p-6 bg-[var(--bg-tertiary)] rounded-lg">
                            <SecurityLoader size="md" icon="shield" variant="cyber" />
                            <span className="text-xs text-[var(--text-muted)]">Cyber</span>
                        </div>
                        <div className="flex flex-col items-center gap-4 p-6 bg-[var(--bg-tertiary)] rounded-lg">
                            <SecurityLoader size="md" icon="check" variant="success" />
                            <span className="text-xs text-[var(--text-muted)]">Success</span>
                        </div>
                        <div className="flex flex-col items-center gap-4 p-6 bg-[var(--bg-tertiary)] rounded-lg">
                            <SecurityLoader size="md" icon="alert" variant="warning" />
                            <span className="text-xs text-[var(--text-muted)]">Warning</span>
                        </div>
                        <div className="flex flex-col items-center gap-4 p-6 bg-[var(--bg-tertiary)] rounded-lg">
                            <SecurityLoader size="md" icon="alert" variant="danger" />
                            <span className="text-xs text-[var(--text-muted)]">Danger</span>
                        </div>
                    </div>
                </div>

                {/* With Text */}
                <div className="card p-6 space-y-6">
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-4">With Text Labels</h2>
                        <p className="text-sm text-[var(--text-secondary)] mb-6">
                            Add descriptive text below the loader
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-8 bg-[var(--bg-tertiary)] rounded-lg">
                            <SecurityLoader
                                size="lg"
                                icon="scan"
                                variant="cyber"
                                text="Scanning for vulnerabilities..."
                            />
                        </div>
                        <div className="p-8 bg-[var(--bg-tertiary)] rounded-lg">
                            <SecurityLoader
                                size="lg"
                                icon="lock"
                                variant="primary"
                                text="Encrypting data..."
                            />
                        </div>
                        <div className="p-8 bg-[var(--bg-tertiary)] rounded-lg">
                            <SecurityLoader
                                size="lg"
                                icon="shield"
                                variant="success"
                                text="Securing connection..."
                            />
                        </div>
                    </div>
                </div>

                {/* Loading Card */}
                <div className="card p-6 space-y-6">
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-4">Security Loading Card</h2>
                        <p className="text-sm text-[var(--text-secondary)] mb-6">
                            Pre-styled card component for loading states
                        </p>
                    </div>

                    <SecurityLoadingCard
                        isLoading={true}
                        text="Loading security data..."
                        icon="shield"
                        variant="cyber"
                        size="lg"
                    />
                </div>

                {/* Overlay Demo */}
                <div className="card p-6 space-y-6">
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-4">Full Screen Overlay</h2>
                        <p className="text-sm text-[var(--text-secondary)] mb-6">
                            Block the entire screen during critical operations
                        </p>
                    </div>

                    <button
                        onClick={() => {
                            setShowOverlay(true);
                            setTimeout(() => setShowOverlay(false), 3000);
                        }}
                        className="btn btn-primary"
                    >
                        Show Overlay (3 seconds)
                    </button>
                </div>

                {/* Usage Examples */}
                <div className="card p-6 space-y-4">
                    <h2 className="text-xl font-semibold text-white mb-4">Usage Examples</h2>

                    <div className="bg-[var(--bg-tertiary)] p-4 rounded-lg">
                        <pre className="text-xs text-[var(--text-secondary)] overflow-x-auto">
                            {`// Basic loader
<SecurityLoader 
  size="lg" 
  icon="shield" 
  variant="cyber"
  text="Securing your data..."
/>

// Loading card
<SecurityLoadingCard
  isLoading={isLoading}
  text="Loading security data..."
  icon="shield"
  variant="cyber"
/>

// Full screen overlay
<SecurityLoadingOverlay
  isLoading={isProcessing}
  text="Processing security scan..."
  icon="scan"
  variant="cyber"
/>

// In a component
{isLoading ? (
  <SecurityLoader 
    size="md" 
    icon="shield" 
    variant="cyber" 
  />
) : (
  <DataContent />
)}`}
                        </pre>
                    </div>
                </div>
            </div>

            {/* Active Overlay */}
            <SecurityLoadingOverlay
                isLoading={showOverlay}
                text="Performing security operation..."
                icon="shield"
                variant="cyber"
                size="xl"
            />
        </DashboardLayout>
    );
}
