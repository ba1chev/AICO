import type { Calculation } from '@domains/calculator/models/Calculation';

export interface PDFReportContext {
  title: string;
  subtitle: string;
  generatedAt: Date;
  totals: {
    count: number;
    energyKWh: number;
    co2eKg: number;
    waterLiters: number;
  };
  calculations: Calculation[];
}

export class PDFExporter {
  async export(ctx: PDFReportContext): Promise<Blob> {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 40;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(transliterate(ctx.title), margin, y);
    y += 22;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(110);
    doc.text(transliterate(ctx.subtitle), margin, y);
    y += 14;
    doc.text(`Generated: ${ctx.generatedAt.toISOString().slice(0, 19).replace('T', ' ')}`, margin, y);
    y += 24;

    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Summary', margin, y);
    y += 16;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const summary = [
      `Calculations: ${ctx.totals.count}`,
      `Total energy: ${ctx.totals.energyKWh.toFixed(2)} kWh`,
      `Total CO2e: ${ctx.totals.co2eKg.toFixed(3)} kg`,
      `Total water: ${ctx.totals.waterLiters.toFixed(2)} L`,
    ];
    for (const line of summary) {
      doc.text(line, margin, y);
      y += 14;
    }
    y += 12;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Calculations', margin, y);
    y += 16;

    const headers = ['Date', 'Hardware', 'Region', 'Hours', 'kWh', 'CO2e kg', 'Water L'];
    const colWidths = [110, 110, 90, 45, 50, 55, 55];
    const rowHeight = 14;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    drawRow(doc, headers, colWidths, margin, y, true);
    y += rowHeight;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    for (const c of ctx.calculations) {
      if (y + rowHeight > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
      const row = [
        c.createdAt.toISOString().slice(0, 16).replace('T', ' '),
        transliterate(c.params.hardware.displayName),
        transliterate(c.params.region.name),
        c.params.durationHours.toFixed(1),
        c.result.energyKWh.toFixed(2),
        c.result.co2eKg.toFixed(3),
        c.result.waterLiters.toFixed(2),
      ];
      drawRow(doc, row, colWidths, margin, y, false);
      y += rowHeight;
    }

    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(
      'AICO — academic report. Cyrillic transliterated to Latin in this PDF.',
      margin,
      doc.internal.pageSize.getHeight() - 20,
    );

    void pageWidth;
    return doc.output('blob');
  }
}

function drawRow(
  doc: import('jspdf').jsPDF,
  cells: string[],
  widths: number[],
  startX: number,
  y: number,
  header: boolean,
): void {
  let x = startX;
  if (header) {
    const totalWidth = widths.reduce((s, w) => s + w, 0);
    doc.setFillColor(230, 230, 230);
    doc.rect(startX - 2, y - 10, totalWidth + 4, 14, 'F');
  }
  for (let i = 0; i < cells.length; i++) {
    const w = widths[i] ?? 60;
    const text = truncate(cells[i] ?? '', Math.floor(w / 5));
    doc.text(text, x, y);
    x += w;
  }
}

function truncate(s: string, maxChars: number): string {
  if (s.length <= maxChars) return s;
  return `${s.slice(0, Math.max(0, maxChars - 1))}…`;
}

const TRANSLIT_MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u',
  ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sht', ъ: 'a', ь: 'y', ю: 'yu', я: 'ya',
};

function transliterate(s: string): string {
  let out = '';
  for (const ch of s) {
    const lower = ch.toLowerCase();
    const mapped = TRANSLIT_MAP[lower];
    if (mapped !== undefined) {
      out += ch === lower ? mapped : capitalize(mapped);
    } else {
      out += ch;
    }
  }
  return out;
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1);
}
