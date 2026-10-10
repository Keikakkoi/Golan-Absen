import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';
import { ReportExportService } from '../../../core/services/report-export.service';

@Component({
  selector: 'app-admin-audit',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, AdminSidebarComponent, PaginationComponent],
  templateUrl: './admin-audit.component.html',
  styleUrls: ['./admin-audit.component.scss']
})
export class AdminAuditComponent implements OnInit {
  logs: any[] = [];
  isLoading = true;
  errorMessage = '';
  total = 0;
  page = 1;
  pageSize = 25;
  readonly pageSizeOptions = [10, 25, 50, 100];
  isExportOpen = false;
  filters = { q: '', action: 'Semua', table_name: 'Semua', start_date: '', end_date: '' };
  readonly actions = ['Semua', 'LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE'];
  readonly tables = ['Semua', 'User', 'Employee', 'Division', 'Position', 'AttendanceRecord', 'LeaveRequest', 'NotificationSetting', 'OfficeLocation', 'WorkSchedule', 'WorkType', 'Holiday', 'LeaveQuota', 'RolePermission', 'EmployeeHomeLocation'];
  private readonly baseUrl = 'http://localhost:8080/api/v1/admin/settings/audit-logs';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private reportExport: ReportExportService
  ) {}

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.isLoading = true;
    this.errorMessage = '';
    const token = this.authService.getToken();
    if (!token) {
      this.errorMessage = 'Sesi login tidak ditemukan.';
      this.isLoading = false;
      return;
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    let params = new HttpParams().set('page', this.page).set('limit', this.pageSize);
    Object.entries(this.filters).forEach(([key, value]) => {
      if (value) params = params.set(key, value);
    });
    this.http.get<any>(this.baseUrl, { headers, params }).subscribe({
      next: (data) => {
        this.logs = data?.data || [];
        this.total = Number(data?.total) || 0;
        this.page = this.total > 0 ? Math.min(this.page, this.totalPages()) : 1;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Gagal memuat audit log.';
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    this.page = 1;
    this.loadLogs();
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  pageChanged(page: number): void {
    if (page === this.page || page < 1 || page > this.totalPages()) return;
    this.page = page;
    this.loadLogs();
  }

  pageSizeChanged(pageSize: number): void {
    if (!this.pageSizeOptions.includes(pageSize) || pageSize === this.pageSize) return;
    this.pageSize = pageSize;
    this.page = 1;
    this.loadLogs();
  }

  toggleExportDropdown(): void {
    this.isExportOpen = !this.isExportOpen;
  }

  exportCSV(): void {
    const token = this.authService.getToken();
    if (!token) return;
    let params = new HttpParams();
    Object.entries(this.filters).forEach(([key, value]) => {
      if (value) params = params.set(key, value);
    });
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    this.http.get(`${this.baseUrl}/export`, { headers, params, responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'audit-log.csv';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      },
      error: () => this.errorMessage = 'Gagal mengekspor audit log.'
    });
  }

  exportExcel(): void {
    alert('Fitur Export Excel akan segera tersedia. Untuk sementara gunakan Export CSV.');
  }

  exportJSON(): void {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.logs));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", `audit-log.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }

  exportPDF(): void {
    if (this.logs.length === 0) return;
    const report = this.buildPrintableReport();
    void this.reportExport.downloadPdf(
      `audit-log-${this.reportDateForExport()}.pdf`,
      'Laporan Audit Log Sistem',
      this.reportDateLabel(),
      report.headers,
      report.rows
    );
  }

  printReport(): void {
    if (this.logs.length === 0) return;
    const report = this.buildPrintableReport();
    this.reportExport.printReport(
      'Laporan Audit Log Sistem',
      this.reportDateLabel(),
      report.headers,
      report.rows
    );
  }

  private buildPrintableReport(): { headers: string[]; rows: unknown[][] } {
    const headers = ['Waktu', 'Aktor (User)', 'Aksi', 'Tabel / ID', 'Detail Perubahan'];
    const rows = this.logs.map(log => [
      this.formatAuditDate(log.CreatedAt),
      `${log.User?.Nama || '-'}\n${log.User?.Email || '-'} · ${log.User?.Role || '-'}`,
      log.Action || '-',
      `${log.TableName || '-'} #${log.RecordID ?? '-'}`,
      log.ChangesDetail || '-'
    ]);
    return { headers, rows };
  }

  private formatAuditDate(value: string): string {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? '-'
      : new Intl.DateTimeFormat('id-ID', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZone: 'Asia/Jakarta'
        }).format(date);
  }

  private reportDateLabel(): string {
    if (this.filters.start_date && this.filters.end_date) {
      return `${this.filters.start_date} s/d ${this.filters.end_date}`;
    }
    if (this.filters.start_date) return `sejak ${this.filters.start_date}`;
    if (this.filters.end_date) return `sampai ${this.filters.end_date}`;
    return 'Semua tanggal';
  }

  private reportDateForExport(): string {
    return `${this.filters.start_date || 'semua'}-${this.filters.end_date || 'tanggal'}`;
  }

  logout(): void {
    this.authService.logout();
  }
}
