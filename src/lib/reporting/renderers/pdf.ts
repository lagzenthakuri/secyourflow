import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { RenderedReport, TabularReportData } from "@/lib/reporting/types";

export function renderPdfReport(data: TabularReportData, fileNameBase: string): RenderedReport {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text(data.title, 14, 18);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated at: ${new Date(data.generatedAt).toLocaleString()}`, 14, 25);

  autoTable(doc, {
    startY: 32,
    head: [["Metric", "Value"]],
    body: data.summary.map((item) => [item.label, String(item.value)]),
    headStyles: {
      fillColor: [56, 189, 248],
      textColor: [0, 0, 0],
    },
    styles: {
      fontSize: 9,
    },
  });

  const tableRef = doc as unknown as { lastAutoTable?: { finalY: number } };

  autoTable(doc, {
    startY: tableRef.lastAutoTable ? tableRef.lastAutoTable.finalY + 8 : 60,
    head: [data.headers],
    body: data.rows,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [30, 30, 30],
      textColor: [255, 255, 255],
    },
  });

  return {
    fileName: `${fileNameBase}.pdf`,
    mimeType: "application/pdf",
    bytes: Buffer.from(doc.output("arraybuffer")),
  };
}
