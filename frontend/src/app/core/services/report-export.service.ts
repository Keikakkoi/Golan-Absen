import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

@Injectable({ providedIn: 'root' })
export class ReportExportService {
  downloadCsv(filename: string, headers: string[], rows: unknown[][]): void {
    const csv = [headers, ...rows]
      .map(row => row.map(value => `"${String(value ?? '-').replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    this.download(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }), filename);
  }

  downloadExcel(filename: string, headers: string[], rows: unknown[][]): void {
    const normalizedRows = [headers, ...rows].map(row => row.map(value => String(value ?? '-')));
    const worksheet = XLSX.utils.aoa_to_sheet(normalizedRows);
    worksheet['!cols'] = headers.map(() => ({ wch: 22 }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Karyawan');
    const content = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    this.download(new Blob([content], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
  }

  downloadJson(filename: string, data: unknown): void {
    this.download(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' }), filename);
  }

  downloadPdf(filename: string, title: string, printDate: string, headers: string[], rows: unknown[][]): void {
    const safe = (value: unknown) => this.pdfText(String(value ?? '-').replace(/[\r\n]+/g, ' '));
    const wrap = (value: unknown, size = 18): string[] => { const text = safe(value); const parts: string[] = []; for (let i = 0; i < text.length; i += size) parts.push(text.slice(i, i + size)); return parts.length ? parts : ['-']; };
    const widths = [55, 70, 45, 95, 55, 85, 95, 60, 60, 55, 55, 55, 65, 60];
    const pageRows = 14; const pages: string[] = [];
    for (let start = 0; start < rows.length || start === 0; start += pageRows) {
      const chunk = rows.slice(start, start + pageRows); let y = 535; const commands: string[] = ['0.05 0.45 0.65 rg', '25 548 30 22 re f', '1 1 1 rg', 'BT', '/F1 7 Tf', '29 557 Td', '(GOLAN) Tj', 'ET', '0 0 0 rg', 'BT', '/F1 14 Tf', '65 565 Td', `(${safe('GOLAN - PT. GOLAN DIGITAL KREATIF')}) Tj`, '0 -16 Td', `/F1 11 Tf (${safe(title)}) Tj`, '0 -12 Td', `/F1 8 Tf (${safe(`Tanggal pembuatan laporan: ${printDate}`)}) Tj`, 'ET'];
      const drawRow = (cells: unknown[], header = false) => { const lines = cells.map(cell => wrap(cell)); const height = Math.max(...lines.map(x => x.length), 1) * 9 + 6; let x = 25; for (let i = 0; i < cells.length; i++) { const w = widths[i] || 55; commands.push(`${x} ${y - height} ${w} ${height} re S`); commands.push('BT', `/F1 ${header ? 6 : 5} Tf`, `${x + 2} ${y - 10} Td`); lines[i].forEach((line, li) => { if (li) commands.push('0 -8 Td'); commands.push(`(${line}) Tj`); }); commands.push('ET'); x += w; } y -= height; };
      drawRow(headers, true); chunk.forEach(row => drawRow(row));
      commands.push('BT', '/F1 8 Tf', `740 20 Td`, `(${safe(`Halaman ${Math.floor(start / pageRows) + 1}`)}) Tj`, 'ET'); pages.push(commands.join('\n'));
    }
    const objects: string[] = ['<< /Type /Catalog /Pages 2 0 R >>', ''];
    const pageIds: number[] = [];
    pages.forEach(content => { const pageId = objects.length + 1; const contentId = pageId + 1; pageIds.push(pageId); objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 ${pages.length * 2 + 3} 0 R >> >> /Contents ${contentId} 0 R >>`, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`); });
    const fontId = objects.length + 1;
    objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    objects[1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
    let pdf = '%PDF-1.4\n'; const offsets: number[] = [0];
    objects.forEach((object, index) => { offsets[index + 1] = pdf.length; pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
    const xref = pdf.length; pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach(offset => pdf += `${String(offset).padStart(10, '0')} 00000 n \n`);
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    this.download(new Blob([pdf], { type: 'application/pdf' }), filename);
  }

  printReport(title: string, printDate: string, headers: string[], rows: unknown[][]): void {
    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=800');
    if (!printWindow) return;
    const escape = (value: unknown) => this.escapeHtml(String(value ?? ''));
    printWindow.document.write(`<!doctype html><html><head><title>${escape(title)}</title><style>@page{size:landscape;margin:10mm}body{font-family:Arial,sans-serif;color:#172b3d;font-size:8px}.report-header{display:flex;align-items:center;gap:10px;border-bottom:2px solid #1675a8;padding-bottom:8px;margin-bottom:10px}.report-header img{width:38px;height:38px;object-fit:contain}.report-header h1{margin:0;font-size:18px}.report-header p{margin:3px 0 0;color:#647b8e}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #9db3c2;padding:4px;text-align:left;vertical-align:top;overflow-wrap:anywhere;word-break:break-word}th{background:#d9edf8;color:#0d4564;font-size:7px}td{font-size:7px}tr:nth-child(even){background:#f7fbfd}thead{display:table-header-group}tfoot{display:table-footer-group}</style></head><body><header class="report-header"><img src="assets/icon_golan.png" alt="Logo Golan"><div><h1>${escape(title)}</h1><p>Golan Digital Kreatif · Tanggal pembuatan laporan: ${escape(printDate)}</p></div></header><table><thead><tr>${headers.map(header => `<th>${escape(header)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${escape(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table><script>window.onload=function(){window.print();}</script></body></html>`);
    printWindow.document.close();
  }

  print(): void {
    window.print();
  }

  private download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[character] || character));
  }

  private pdfText(value: string): string {
    return value.replace(/[^\x20-\x7E]/g, '?').replace(/[\\()]/g, character => `\\${character}`);
  }
}
