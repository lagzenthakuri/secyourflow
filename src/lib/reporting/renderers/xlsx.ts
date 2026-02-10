import * as XLSX from "xlsx";
import type { RenderedReport, TabularReportData } from "@/lib/reporting/types";

export function renderXlsxReport(data: TabularReportData, fileNameBase: string): RenderedReport {
  const workbook = XLSX.utils.book_new();

  const summarySheetData = [
    ["Title", data.title],
    ["Generated At", data.generatedAt],
    ...data.summary.map((item) => [item.label, String(item.value)]),
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summarySheetData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  const dataSheet = XLSX.utils.aoa_to_sheet([data.headers, ...data.rows]);
  XLSX.utils.book_append_sheet(workbook, dataSheet, "Data");

  const bytes = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
    compression: true,
  }) as Buffer;

  return {
    fileName: `${fileNameBase}.xlsx`,
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    bytes,
  };
}
