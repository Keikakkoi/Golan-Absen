import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

type ReportCellAlign = 'left' | 'center';

@Injectable({ providedIn: 'root' })
export class ReportExportService {
  private readonly blue = '#1769AA';
  private readonly ink = '#172B3A';
  private readonly muted = '#526F8C';
  private readonly border = '#B8CBD8';

  downloadCsv(filename: string, headers: string[], rows: unknown[][]): void {
    const csv = [headers, ...rows].map(row => row.map(value => `"${String(value ?? '-').replace(/"/g, '""')}"`).join(',')).join('\r\n');
    this.download(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }), filename);
  }
  downloadExcel(filename: string, headers: string[], rows: unknown[][]): void {
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows].map(row => row.map(value => String(value ?? '-'))));
    worksheet['!cols'] = headers.map(() => ({ wch: 22 }));
    const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Karyawan');
    this.download(new Blob([XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
  }
  downloadJson(filename: string, data: unknown): void { this.download(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' }), filename); }

  async downloadPdf(filename: string, title: string, printDate: string, headers: string[], rows: unknown[][]): Promise<void> {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const logo = await this.loadLogoDataUrl(); const margin = 10;
    const pageWidth = pdf.internal.pageSize.getWidth(); const pageHeight = pdf.internal.pageSize.getHeight();
    const isAlpha = this.isAlphaReport(headers); const isLogbook = this.isLogbookReport(headers); const isWorkReport = this.isWorkReport(headers); const widths = this.getColumnWidths(headers.length, pageWidth - margin * 2);
    const columnStyles: Record<number, { cellWidth: number; halign?: ReportCellAlign }> = {};
    widths.forEach((cellWidth, index) => columnStyles[index] = { cellWidth });
    if (isAlpha) [0, 3, 4].forEach(index => columnStyles[index].halign = 'center');
    if (isLogbook) [0, 3, 4].forEach(index => columnStyles[index].halign = 'center');
    if (isWorkReport) [0, 1, 13, 14].forEach(index => { if (columnStyles[index]) columnStyles[index].halign = 'center'; });
    autoTable(pdf, {
      head: [headers], body: rows.map(row => row.map(value => String(value ?? '-'))), startY: 35,
      margin: { top: 35, right: margin, bottom: 14, left: margin }, tableWidth: pageWidth - margin * 2,
      theme: 'grid', rowPageBreak: 'avoid', showHead: 'everyPage',
      styles: { font: 'helvetica', fontSize: isAlpha || isLogbook || isWorkReport ? 7 : 6.4, cellPadding: isAlpha || isLogbook || isWorkReport ? 2.2 : 2, overflow: 'linebreak', valign: 'top', textColor: this.ink, lineColor: this.border, lineWidth: .2 },
      headStyles: { fillColor: this.blue, textColor: '#FFFFFF', fontStyle: 'bold', fontSize: isAlpha || isLogbook || isWorkReport ? 7 : 6.2, halign: 'center', valign: 'middle' },
      alternateRowStyles: { fillColor: '#F1F7FB' }, columnStyles,
      didParseCell: data => {
        if ((!isAlpha && !isLogbook && !isWorkReport) || data.section !== 'body') return;
        if (isAlpha && data.column.index === 3) { const total = Number(data.cell.raw || 0); data.cell.styles.fontStyle = 'bold'; data.cell.styles.textColor = total > 2 ? '#B42318' : total > 0 ? '#A15C00' : '#19734B'; }
        if (isAlpha && data.column.index === 4) { data.cell.styles.fontStyle = 'bold'; data.cell.styles.textColor = '#B42318'; data.cell.styles.fillColor = '#FEE4E2'; }
        if (isLogbook && data.column.index === 4) this.styleLogbookStatus(data.cell, String(data.cell.raw || 'draft'));
        if (isWorkReport && data.column.index >= 13 && data.column.index <= 14) this.styleWorkReportStatus(data.cell, String(data.cell.raw || '-'));
      },
      didDrawPage: data => this.drawPdfHeader(pdf, logo, title, printDate, data.pageNumber, pageWidth, pageHeight, margin)
    });
    this.download(pdf.output('blob'), filename);
  }

  printReport(title: string, printDate: string, headers: string[], rows: unknown[][]): void { this.openPrintWindow(title, printDate, headers, rows, false); }
  printAlphaReport(title: string, printDate: string, headers: string[], rows: unknown[][]): void { this.openPrintWindow(title, printDate, headers, rows, true); }
  async downloadStatisticsPdf(filename: string, title: string, printDate: string, summaryRows: unknown[][], detailHeaders: string[], detailRows: unknown[][]): Promise<void> {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }); const logo = await this.loadLogoDataUrl(); const margin = 10;
    const pageWidth = pdf.internal.pageSize.getWidth(); const pageHeight = pdf.internal.pageSize.getHeight();
    const drawHeader = (data: any) => this.drawPdfHeader(pdf, logo, title, printDate, data.pageNumber, pageWidth, pageHeight, margin);
    autoTable(pdf, { head: [['RINGKASAN STATISTIK', 'NILAI']], body: summaryRows.map(row => [String(row[0] ?? '-'), String(row[1] ?? '-')]), startY: 35, margin: { top: 35, right: margin, bottom: 14, left: margin }, tableWidth: 105, theme: 'grid', styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.5, textColor: this.ink, lineColor: this.border, lineWidth: .2 }, headStyles: { fillColor: this.blue, textColor: '#FFFFFF', fontStyle: 'bold', halign: 'center' }, alternateRowStyles: { fillColor: '#F1F7FB' }, columnStyles: { 0: { cellWidth: 68 }, 1: { cellWidth: 37, halign: 'center' } }, didDrawPage: drawHeader });
    const summaryEnd = (pdf as any).lastAutoTable?.finalY || 70;
    const widths = this.getColumnWidths(detailHeaders.length, pageWidth - margin * 2); const columnStyles: Record<number, { cellWidth: number; halign?: ReportCellAlign }> = {};
    widths.forEach((cellWidth, index) => columnStyles[index] = { cellWidth }); [0, 1, 2, 3, 4, 5].forEach(index => { if (columnStyles[index]) columnStyles[index].halign = index === 1 || index === 3 || index === 4 ? 'center' : 'left'; });
    autoTable(pdf, { head: [detailHeaders], body: detailRows.map(row => row.map(value => String(value ?? '-'))), startY: summaryEnd + 8, margin: { top: 35, right: margin, bottom: 14, left: margin }, tableWidth: pageWidth - margin * 2, theme: 'grid', rowPageBreak: 'avoid', showHead: 'everyPage', styles: { font: 'helvetica', fontSize: 7, cellPadding: 2.2, overflow: 'linebreak', valign: 'top', textColor: this.ink, lineColor: this.border, lineWidth: .2 }, headStyles: { fillColor: this.blue, textColor: '#FFFFFF', fontStyle: 'bold', fontSize: 7, halign: 'center', valign: 'middle' }, alternateRowStyles: { fillColor: '#F1F7FB' }, columnStyles, didDrawPage: drawHeader });
    this.download(pdf.output('blob'), filename);
  }
  printStatisticsReport(title: string, printDate: string, summaryRows: unknown[][], detailHeaders: string[], detailRows: unknown[][]): void {
    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=800'); if (!printWindow) return; const escape = (value: unknown) => this.escapeHtml(String(value ?? '-')); const logoUrl = new URL('assets/icon_golan.png', document.baseURI).href;
    const summary = summaryRows.map(row => `<tr><td>${escape(row[0])}</td><td class="summary-value">${escape(row[1])}</td></tr>`).join(''); const detail = detailRows.map(row => `<tr>${row.map(cell => `<td>${escape(cell).replace(/\n/g, '<br>')}</td>`).join('')}</tr>`).join(''); const widths = this.getPrintColumnWidths(detailHeaders.length);
    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escape(title)}</title><style>@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Arial,sans-serif;color:${this.ink};font-size:7.5px;margin:0}.report-header{display:flex;align-items:center;gap:12px;border-bottom:2px solid ${this.blue};padding:0 0 8px;margin-bottom:10px}.report-header img{width:42px;height:42px;object-fit:contain}.report-header h1{margin:0;color:${this.blue};font-size:17px}.report-header h2{margin:3px 0 0;font-size:12px}.report-header p{margin:3px 0 0;color:${this.muted};font-size:8px}.summary-table{width:105mm;border-collapse:collapse;margin-bottom:10px}.summary-table th,.summary-table td,table.detail-table th,table.detail-table td{border:1px solid ${this.border};padding:5px 4px;line-height:1.3;vertical-align:top}.summary-table th,table.detail-table th{background:${this.blue};color:#fff;font-weight:700;text-align:center}.summary-table td:last-child{text-align:center;font-weight:700}.summary-table tr:nth-child(even),.detail-table tbody tr:nth-child(even){background:#F1F7FB}.detail-table{width:100%;border-collapse:collapse;table-layout:fixed}.detail-table th,.detail-table td{overflow-wrap:anywhere;word-break:break-word}.detail-table thead{display:table-header-group}.detail-table tr{break-inside:avoid;page-break-inside:avoid}</style></head><body><header class="report-header"><img src="${logoUrl}" alt="Logo Golan"><div><h1>GOLAN - PT. GOLAN DIGITAL KREATIF</h1><h2>${escape(title)}</h2><p>Tanggal pembuatan laporan: ${escape(printDate)}</p></div></header><table class="summary-table"><thead><tr><th>RINGKASAN STATISTIK</th><th>NILAI</th></tr></thead><tbody>${summary}</tbody></table><table class="detail-table"><colgroup>${widths.map(width => `<col style="width:${width}">`).join('')}</colgroup><thead><tr>${detailHeaders.map(header => `<th>${escape(header)}</th>`).join('')}</tr></thead><tbody>${detail}</tbody></table><script>window.onload=function(){window.print();}</script></body></html>`); printWindow.document.close();
  }
  print(): void { window.print(); }

  private drawPdfHeader(pdf: any, logo: string | null, title: string, printDate: string, page: number, pageWidth: number, pageHeight: number, margin: number): void {
    if (logo) pdf.addImage(logo, 'PNG', margin, 8, 18, 18);
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14); pdf.setTextColor(this.blue); pdf.text('GOLAN - PT. GOLAN DIGITAL KREATIF', margin + 23, 14);
    pdf.setFontSize(11); pdf.setTextColor(this.ink); pdf.text(title, margin + 23, 20); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(this.muted); pdf.text(`Tanggal pembuatan laporan: ${printDate}`, margin + 23, 25);
    pdf.setDrawColor(this.blue); pdf.setLineWidth(.6); pdf.line(margin, 30, pageWidth - margin, 30); pdf.setFontSize(7); pdf.text(`Halaman ${page}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  private openPrintWindow(title: string, printDate: string, headers: string[], rows: unknown[][], alpha: boolean): void {
    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=800'); if (!printWindow) return;
    const escape = (value: unknown) => this.escapeHtml(String(value ?? '-')); const logoUrl = new URL('assets/icon_golan.png', document.baseURI).href; const widths = this.getPrintColumnWidths(headers.length);
    const logbook = this.isLogbookReport(headers); const workReport = this.isWorkReport(headers);
    const body = rows.map(row => `<tr>${row.map((cell, index) => { const classes = alpha && index === 3 ? `alpha-total ${this.alphaLevel(Number(cell))}` : alpha && index === 4 ? 'status-follow-up' : logbook && index === 4 ? `logbook-status ${this.logbookStatusClass(String(cell))}` : workReport && index >= 13 && index <= 14 ? `work-status ${this.workStatusClass(String(cell))}` : ''; const content = escape(cell).replace(/\n/g, '<br>'); return `<td class="${classes}">${content}</td>`; }).join('')}</tr>`).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escape(title)}</title><style>@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Arial,sans-serif;color:${this.ink};font-size:7.5px;margin:0}.report-header{display:flex;align-items:center;gap:12px;border-bottom:2px solid ${this.blue};padding:0 0 8px;margin-bottom:10px}.report-header img{width:42px;height:42px;object-fit:contain}.report-header h1{margin:0;color:${this.blue};font-size:17px;line-height:1.2}.report-header h2{margin:3px 0 0;font-size:12px}.report-header p{margin:3px 0 0;color:${this.muted};font-size:8px}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid ${this.border};padding:5px 4px;text-align:left;vertical-align:top;overflow-wrap:anywhere;word-break:break-word;line-height:1.3}th{background:${this.blue};color:#fff;font-size:7px;text-align:center;vertical-align:middle}td{font-size:7px}tbody tr:nth-child(even){background:#F1F7FB}thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}.alpha-total{text-align:center;font-weight:700}.alpha-total.green{color:#19734B}.alpha-total.orange{color:#A15C00}.alpha-total.red{color:#B42318}.status-follow-up{background:#FEE4E2;color:#B42318;font-weight:700;text-align:center}.logbook-status{text-align:center;font-weight:700}.logbook-status.approved{background:#DCFCE7;color:#166534}.logbook-status.submitted{background:#DBEAFE;color:#1D4ED8}.logbook-status.rejected{background:#FEE2E2;color:#B42318}.logbook-status.draft{background:#F1F5F9;color:#475569}</style></head><body><header class="report-header"><img src="${logoUrl}" alt="Logo Golan"><div><h1>GOLAN - PT. GOLAN DIGITAL KREATIF</h1><h2>${escape(title)}</h2><p>Tanggal pembuatan laporan: ${escape(printDate)}</p></div></header><table><colgroup>${widths.map(width => `<col style="width:${width}">`).join('')}</colgroup><thead><tr>${headers.map(header => `<th>${escape(header)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table><script>window.onload=function(){window.print();}</script></body></html>`;
    printWindow.document.write(html); printWindow.document.close();
  }

  private isAlphaReport(headers: string[]): boolean { return headers.map(header => header.toUpperCase()).join('|') === 'NIK|NAMA KARYAWAN|DIVISI|TOTAL ALPHA|STATUS|DETAIL'; }
  private isLogbookReport(headers: string[]): boolean { return headers.map(header => header.toUpperCase()).join('|') === 'TANGGAL|TUGAS|KEGIATAN|SCREENSHOT|STATUS|CATATAN MANAJER'; }
  private isWorkReport(headers: string[]): boolean { return headers.length >= 14 && headers.some(header => header.toUpperCase() === 'STATUS VALIDASI'); }
  private workStatusClass(value: string): string { const status = value.toLowerCase(); return status.includes('tidak') || status.includes('rejected') || status.includes('ditolak') ? 'danger' : status.includes('sudah') || status.includes('approved') || status.includes('sesuai') ? 'success' : 'pending'; }
  private styleWorkReportStatus(cell: any, value: string): void { const status = this.workStatusClass(value); const styles: Record<string, { textColor: string; fillColor: string }> = { success: { textColor: '#166534', fillColor: '#DCFCE7' }, danger: { textColor: '#B42318', fillColor: '#FEE2E2' }, pending: { textColor: '#A15C00', fillColor: '#FEF3C7' } }; const style = styles[status]; cell.styles.fontStyle = 'bold'; cell.styles.textColor = style.textColor; cell.styles.fillColor = style.fillColor; }
  private logbookStatusClass(value: string): string { return value.toLowerCase().replace(/\s+/g, '-'); }
  private styleLogbookStatus(cell: any, value: string): void { const status = this.logbookStatusClass(value); const styles: Record<string, { textColor: string; fillColor: string }> = { approved: { textColor: '#166534', fillColor: '#DCFCE7' }, submitted: { textColor: '#1D4ED8', fillColor: '#DBEAFE' }, rejected: { textColor: '#B42318', fillColor: '#FEE2E2' }, draft: { textColor: '#475569', fillColor: '#F1F5F9' } }; const style = styles[status] || styles['draft']; cell.styles.fontStyle = 'bold'; cell.styles.textColor = style.textColor; cell.styles.fillColor = style.fillColor; }
  private alphaLevel(total: number): string { return total > 2 ? 'red' : total > 0 ? 'orange' : 'green'; }
  private download(blob: Blob, filename: string): void { const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url); }
  private escapeHtml(value: string): string { return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] || character)); }
  private async loadLogoDataUrl(): Promise<string | null> { try { const response = await fetch(new URL('assets/icon_golan.png', document.baseURI).href); if (!response.ok) return null; const blob = await response.blob(); return await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => resolve(null); reader.readAsDataURL(blob); }); } catch { return null; } }
  private getColumnWidths(count: number, totalWidth: number): number[] { const weights = count === 6 ? [13, 25, 19, 14, 15, 34] : this.getGenericColumnWeights(count); const total = weights.reduce((sum, width) => sum + width, 0); return weights.map(width => totalWidth * width / total); }
  private getPrintColumnWidths(count: number): string[] { const weights = count === 6 ? [10, 19, 15, 11, 12, 33] : this.getGenericColumnWeights(count); const total = weights.reduce((sum, width) => sum + width, 0); return weights.map(width => `${(width / total * 100).toFixed(3)}%`); }
  private getGenericColumnWeights(count: number): number[] { if (count >= 15) return [4, 10, 14, 8, 8, 12, 15, 18, 9, 10, 12, 12, 12, 10, 10, ...Array.from({ length: count - 15 }, () => 8)]; if (count === 14) return [4, 8, 10, 9, 8, 9, 12, 16, 13, 10, 12, 9, 10, 10]; if (count === 4) return [45, 18, 18, 19]; if (count === 5) return [24, 14, 20, 20, 22]; if (count === 7) return [18, 18, 14, 16, 14, 10, 10]; return Array.from({ length: count }, () => 1); }
}
