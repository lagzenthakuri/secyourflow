import { NextResponse } from "next/server";
import { requireThreatIntelContext } from "@/modules/threat-intel/auth";
import { ThreatIntelRepository } from "@/modules/threat-intel/persistence/repository";

const CSV_FORMULA_PREFIX = /^[=+\-@\t\r]/;

function neutralizeCsvFormula(value: string): string {
  if (!CSV_FORMULA_PREFIX.test(value)) {
    return value;
  }

  return `'${value}`;
}

function toCsvValue(value: string): string {
  const normalized = neutralizeCsvFormula(value);
  if (normalized.includes(",") || normalized.includes('"') || normalized.includes("\n")) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }

  return normalized;
}

export async function GET(request: Request) {
  const authResult = await requireThreatIntelContext(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const searchParams = new URL(request.url).searchParams;
    const format = (searchParams.get("format") || "json").toLowerCase();
    const includeExpired = searchParams.get("includeExpired") === "true";

    const repository = new ThreatIntelRepository();
    const indicators = await repository.listIndicators(authResult.context.organizationId, {
      includeExpired,
    });

    if (format === "csv") {
      const headers = [
        "id",
        "type",
        "value",
        "normalizedValue",
        "confidence",
        "severity",
        "firstSeen",
        "lastSeen",
        "expiresAt",
        "source",
        "description",
        "tags",
        "tacticId",
        "techniqueId",
      ];

      const lines = [headers.join(",")];
      for (const indicator of indicators) {
        const row = [
          indicator.id,
          indicator.type,
          indicator.value,
          indicator.normalizedValue,
          indicator.confidence?.toString() ?? "",
          indicator.severity ?? "",
          indicator.firstSeen.toISOString(),
          indicator.lastSeen.toISOString(),
          indicator.expiresAt?.toISOString() ?? "",
          indicator.source ?? "",
          indicator.description ?? "",
          indicator.tags.join("|"),
          indicator.tacticId ?? "",
          indicator.techniqueId ?? "",
        ].map((value) => toCsvValue(value));
        lines.push(row.join(","));
      }

      return new Response(lines.join("\n"), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": "attachment; filename=threat-indicators.csv",
        },
      });
    }

    return NextResponse.json({ data: indicators });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to export IOCs",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
