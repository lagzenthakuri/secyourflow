"use client";

import { useState } from "react";
import {
    ComposableMap,
    Geographies,
    Geography,
    Marker,
    ZoomableGroup
} from "react-simple-maps";
import { Asset } from "@/types";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface AssetMapProps {
    assets: Asset[];
}

// Simple mapping for common country names to coordinates (rough center)
// In a real app, this would be done via geocoding or a proper database
const COUNTRY_COORDS: Record<string, [number, number]> = {
    "USA": [-95.7129, 37.0902],
    "United States": [-95.7129, 37.0902],
    "UK": [-3.436, 55.3781],
    "United Kingdom": [-3.436, 55.3781],
    "Germany": [10.4515, 51.1657],
    "France": [2.2137, 46.2276],
    "India": [78.9629, 20.5937],
    "China": [104.1954, 35.8617],
    "Japan": [138.2529, 36.2048],
    "Australia": [133.7751, -25.2744],
    "Brazil": [-51.9253, -14.235],
    "Canada": [-106.3468, 56.1304],
    "Singapore": [103.8198, 1.3521],
    "Netherlands": [5.2913, 52.1326],
    "Ireland": [-8.2439, 53.4129],
    "Nepal": [84.124, 28.3949],
};

export function AssetMap({ assets }: AssetMapProps) {
    const [tooltipContent, setTooltipContent] = useState("");

    const mapStyle = {
        activeFill: "rgba(59, 130, 246, 0.4)",
        activeHoverFill: "rgba(59, 130, 246, 0.8)",
        neutralFill: "var(--bg-tertiary)",
        neutralHoverFill: "var(--bg-elevated)",
        neutralStroke: "var(--border-color)",
        neutralHoverStroke: "var(--border-hover)",
        markerLabel: "var(--text-primary)",
    } as const;

    // Aggregate assets by country
    const countryStats = assets.reduce((acc, asset) => {
        if (!asset.location) return acc;

        // Try to extract country if format is "Country / City"
        const country = asset.location.split("/")[0].trim();
        if (!acc[country]) {
            acc[country] = { count: 0, critical: 0, assets: [] };
        }
        acc[country].count++;
        if (asset.criticality === "CRITICAL") acc[country].critical++;
        acc[country].assets.push(asset);
        return acc;
    }, {} as Record<string, { count: number; critical: number; assets: Asset[] }>);

    return (
        <div className="relative w-full h-[500px] bg-[var(--bg-tertiary)] rounded-xl overflow-hidden border border-[var(--border-color)]">
            <div className="absolute top-4 left-4 z-10">
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Global Asset Distribution</h3>
                <p className="text-sm text-[var(--text-muted)]">Real-time geographic locations of items</p>
            </div>

            {tooltipContent && (
                <div className="absolute bottom-4 right-4 z-20 bg-[var(--bg-elevated)] border border-[var(--border-color)] p-3 rounded-lg shadow-xl max-w-xs animate-in fade-in slide-in-from-bottom-2">
                    <p className="text-sm font-bold text-[var(--text-primary)] mb-1">{tooltipContent.split(':')[0]}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{tooltipContent.split(':')[1]}</p>
                </div>
            )}

            <ComposableMap
                projectionConfig={{
                    rotate: [-10, 0, 0],
                    scale: 147
                }}
                className="w-full h-full"
            >
                <ZoomableGroup>
                    <Geographies geography={geoUrl}>
                        {({ geographies }: { geographies: Array<{ rsmKey: string; properties: { name: string }; [key: string]: unknown }> }) =>
                            geographies.map((geo) => {
                                const countryName = geo.properties.name;
                                const hasAssets = Object.keys(countryStats).some(c =>
                                    c.toLowerCase() === countryName.toLowerCase() ||
                                    (c === "USA" && countryName === "United States of America") ||
                                    (c === "UK" && countryName === "United Kingdom")
                                );

                                return (
                                    <Geography
                                        key={geo.rsmKey}
                                        geography={geo}
                                        onMouseEnter={() => {
                                            const stat = Object.entries(countryStats).find(([c]) =>
                                                c.toLowerCase() === countryName.toLowerCase() ||
                                                (c === "USA" && countryName === "United States of America") ||
                                                (c === "UK" && countryName === "United Kingdom")
                                            );
                                            if (stat) {
                                                setTooltipContent(`${countryName}: ${stat[1].count} assets (${stat[1].critical} critical)`);
                                            }
                                        }}
                                        onMouseLeave={() => setTooltipContent("")}
                                        style={{
                                            default: {
                                                fill: hasAssets ? mapStyle.activeFill : mapStyle.neutralFill,
                                                stroke: mapStyle.neutralStroke,
                                                strokeWidth: 0.5,
                                                outline: "none",
                                            },
                                            hover: {
                                                fill: hasAssets ? mapStyle.activeHoverFill : mapStyle.neutralHoverFill,
                                                stroke: mapStyle.neutralHoverStroke,
                                                strokeWidth: 0.5,
                                                outline: "none",
                                                cursor: "pointer"
                                            },
                                        }}
                                    />
                                );
                            })
                        }
                    </Geographies>

                    {Object.entries(countryStats).map(([country, stats]) => {
                        const coords = COUNTRY_COORDS[country] || COUNTRY_COORDS["USA"]; // Default to USA if unknown for now
                        if (!COUNTRY_COORDS[country]) return null; // Skip if we don't have coords and it's not a common one

                        return (
                            <Marker key={country} coordinates={coords}>
                                <circle
                                    r={4 + Math.min(stats.count, 10)}
                                    fill={stats.critical > 0 ? "#ef4444" : "#3b82f6"}
                                    className="opacity-60 animate-pulse"
                                />
                                <circle
                                    r={2}
                                    fill={mapStyle.markerLabel}
                                />
                                <text
                                    textAnchor="middle"
                                    y={-15}
                                    style={{ fontFamily: "Inter, sans-serif", fill: mapStyle.markerLabel, fontSize: "10px", fontWeight: "bold", pointerEvents: "none" }}
                                >
                                    {country} ({stats.count})
                                </text>
                            </Marker>
                        );
                    })}
                </ZoomableGroup>
            </ComposableMap>

            <div className="absolute bottom-4 left-4 flex flex-col gap-2 bg-[var(--bg-elevated)]/80 backdrop-blur-md p-3 rounded-lg border border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-[10px] text-[var(--text-primary)] font-medium">Active Assets</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-[10px] text-[var(--text-primary)] font-medium">Critical Issues</span>
                </div>
            </div>
        </div>
    );
}
