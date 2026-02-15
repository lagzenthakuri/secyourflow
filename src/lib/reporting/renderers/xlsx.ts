import { createRequire } from "module";
import type { RenderedReport, TabularReportData } from "@/lib/reporting/types";

type WorkbookLike = {
  creator?: string;
  addWorksheet: (name: string) => {
    addRow: (row: Array<string | number>) => void;
  };
  xlsx: {
    writeBuffer: () => Promise<ArrayBuffer | Buffer>;
  };
};

type ExcelJsModule = {
  Workbook: new () => WorkbookLike;
};

const require = createRequire(import.meta.url);

function loadExcelJs(): ExcelJsModule {
  try {
    return require("exceljs") as ExcelJsModule;
  } catch {
    throw new Error(
      'XLSX export dependency is missing. Install it with "npm install exceljs" and restart the server.',
    );
  }
}

export async function renderXlsxReport(
  data: TabularReportData,
  fileNameBase: string,
): Promise<RenderedReport> {
  const ExcelJS = loadExcelJs();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SecYourFlow";

  const summarySheet = workbook.addWorksheet("Summary");
  summarySheet.addRow(["Title", data.title]);
  summarySheet.addRow(["Generated At", data.generatedAt]);
  for (const item of data.summary) {
    summarySheet.addRow([item.label, String(item.value)]);
  }

  const dataSheet = workbook.addWorksheet("Data");
  dataSheet.addRow(data.headers);
  for (const row of data.rows) {
    dataSheet.addRow(row);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

  return {
    fileName: `${fileNameBase}.xlsx`,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    bytes,
  };
}
