import type { TabularReportData, RenderedReport } from "@/lib/reporting/types";

const CSV_FORMULA_PREFIX = /^[=+\-@\t\r]/;

function neutralizeCsvFormula(value: string): string {
  if (!CSV_FORMULA_PREFIX.test(value)) {
    return value;
  }

  // Prevent spreadsheet formula execution (CSV injection).
  return `'${value}`;
}

function escapeCsv(value: string | number) {
  const text = neutralizeCsvFormula(String(value ?? ""));
  if (!text.includes(",") && !text.includes("\"") && !text.includes("\n")) {
    return text;
  }
  return `"${text.replace(/\"/g, '""')}"`;
}

export function renderCsvReport(data: TabularReportData, fileNameBase: string): RenderedReport {
  const headerLine = data.headers.map(escapeCsv).join(",");
  const bodyLines = data.rows.map((row) => row.map((cell) => escapeCsv(cell)).join(","));
  const summaryLines = data.summary.map((item) => `${escapeCsv(item.label)},${escapeCsv(item.value)}`);

  const content = [
    escapeCsv(data.title),
    `Generated At,${escapeCsv(data.generatedAt)}`,
    ...summaryLines,
    "",
    headerLine,
    ...bodyLines,
    "",
  ].join("\n");

  return {
    fileName: `${fileNameBase}.csv`,
    mimeType: "text/csv",
    bytes: Buffer.from(content, "utf8"),
  };
}
