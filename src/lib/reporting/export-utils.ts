import { NextResponse } from "next/server";
import { renderCsvReport } from "@/lib/reporting/renderers/csv";
import { renderXlsxReport } from "@/lib/reporting/renderers/xlsx";
import type { TabularReportData } from "@/lib/reporting/types";

export async function renderTabularExport(
  data: TabularReportData,
  format: "csv" | "xlsx",
  fileBase: string,
) {
  if (format === "xlsx") {
    return renderXlsxReport(data, fileBase);
  }

  return renderCsvReport(data, fileBase);
}

export function exportResponse(
  artifact: { bytes: Buffer; mimeType: string; fileName: string },
) {
  return new NextResponse(Uint8Array.from(artifact.bytes), {
    status: 200,
    headers: {
      "Content-Type": artifact.mimeType,
      "Content-Disposition": `attachment; filename=\"${artifact.fileName}\"`,
      "Content-Length": String(artifact.bytes.byteLength),
    },
  });
}
