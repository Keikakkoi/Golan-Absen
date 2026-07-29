import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ReportExportService {
  downloadCsv(filename: string, headers: string[], rows: unknown[][]): void {
    const csv = [headers, ...rows]
      .map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    this.download(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }), filename);
  }

  downloadExcel(filename: string, headers: string[], rows: unknown[][]): void {
    const cell = (value: unknown) => `<td>${this.escapeHtml(String(value ?? ''))}</td>`;
    const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><table><thead><tr>${headers.map(cell).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell).join('')}</tr>`).join('')}</tbody></table></body></html>`;
    this.download(new Blob([html], { type: 'application/vnd.ms-excel' }), filename);
  }

  downloadJson(filename: string, data: unknown): void {
    this.download(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' }), filename);
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
}
