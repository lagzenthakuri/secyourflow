import { createRequire } from "module";
import type { RenderedReport, TabularReportData } from "@/lib/reporting/types";

type XlsxModule = {
  utils: {
    book_new: () => unknown;
    aoa_to_sheet: (rows: Array<Array<string>>) => unknown;
    book_append_sheet: (workbook: unknown, worksheet: unknown, name: string) => void;
  };
  write: (
    workbook: unknown,
    options: { type: "buffer"; bookType: "xlsx"; compression: boolean },
  ) => Buffer;
};

const require = createRequire(import.meta.url);

function loadXlsx(): XlsxModule {
  try {
    return require("xlsx") as XlsxModule;
  } catch {
    throw new Error(
      'XLSX export dependency is missing. Install it with "npm install xlsx" and restart the server.',
    );
  }
}

export function renderXlsxReport(data: TabularReportData, fileNameBase: string): RenderedReport {
  const XLSX = loadXlsx();
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
