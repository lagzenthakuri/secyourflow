import { NextRequest, NextResponse } from "next/server";

// Mock threat feed data
const threatFeeds = [
    {
        id: "1",
        name: "NVD CVE Feed",
        source: "NIST",
        type: "CVE",
        isActive: true,
        lastSync: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    },
    {
        id: "2",
        name: "CISA KEV Catalog",
        source: "CISA",
        type: "CVE",
        isActive: true,
        lastSync: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    },
    {
        id: "3",
        name: "EPSS Scores",
        source: "FIRST",
        type: "CVE",
        isActive: true,
        lastSync: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    },
    {
        id: "4",
        name: "MITRE ATT&CK",
        source: "MITRE",
        type: "THREAT_ACTOR",
        isActive: true,
        lastSync: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    },
];

const threatIndicators = [
    {
        id: "1",
        type: "CVE",
        value: "CVE-2024-3400",
        confidence: 100,
        severity: "CRITICAL",
        description: "Active exploitation in the wild",
        tags: ["palo-alto", "vpn", "rce"],
    },
    {
        id: "2",
        type: "CVE",
        value: "CVE-2024-21762",
        confidence: 100,
        severity: "CRITICAL",
        description: "Fortinet FortiOS exploitation",
        tags: ["fortinet", "vpn", "rce"],
    },
];

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type");

    if (type === "feeds") {
        return NextResponse.json({ data: threatFeeds });
    }

    if (type === "indicators") {
        return NextResponse.json({ data: threatIndicators });
    }

    return NextResponse.json({
        feeds: threatFeeds,
        indicators: threatIndicators,
        stats: {
            activeFeeds: threatFeeds.filter((f) => f.isActive).length,
            totalIndicators: threatIndicators.length,
            criticalThreats: threatIndicators.filter((i) => i.severity === "CRITICAL").length,
        },
    });
}
