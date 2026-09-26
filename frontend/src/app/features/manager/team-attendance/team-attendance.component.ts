import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import { AuthService } from '../../../core/services/auth.service';
import { SharedSidebarComponent } from '../../shared/shared-sidebar/shared-sidebar.component';
import { ReportExportService } from '../../../core/services/report-export.service';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';
@Component({ selector: 'app-team-attendance', standalone: true, imports: [CommonModule, FormsModule, OverlayModule, SharedSidebarComponent, PaginationComponent], templateUrl: './team-attendance.component.html', styleUrls: ['./team-attendance.component.scss'] })
export class TeamAttendanceComponent implements OnInit {
  startDate = new Date().toISOString().slice(0, 10); endDate = this.startDate; search = ''; status = ''; rows: any[] = []; private serverPaginated = false; private requestSequence = 0;
  error = ''; isExportOpen = false; page = 1; pageSize = 25; pageSizeOptions = [10, 25, 50, 100]; totalItems = 0; isLoading = false;
  readonly exportDropdownPositions: ConnectedPosition[] = [
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 5 },
    { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -5 }
  ];
  constructor(private http: HttpClient, private auth: AuthService, private reportExport: ReportExportService, private route: ActivatedRoute, private router: Router) {}
  ngOnInit(): void {
    const query = this.route.snapshot.queryParamMap;
    this.startDate = query.get('start_date') || this.startDate;
    this.endDate = query.get('end_date') || this.startDate;
    this.search = query.get('search') || '';
    this.status = query.get('status') || '';
    this.page = Number(query.get('page')) || 1;
    this.pageSize = Number(query.get('limit')) || this.pageSize;
    if (!this.pageSizeOptions.includes(this.pageSize)) this.pageSize = 25;
    this.load(this.page, false);
  }
  load(page = 1, updateUrl = true): void {
    this.error = this.validateDateRange();
    if (this.error) { this.rows = []; this.totalItems = 0; return; }
    this.isLoading = true; this.page = page;
    if (updateUrl) void this.router.navigate([], { relativeTo: this.route, queryParams: this.attendanceQueryParams(), replaceUrl: true });
    const requestId = ++this.requestSequence;
    let params = new HttpParams().set('start_date', this.startDate).set('end_date', this.endDate).set('page', page).set('limit', this.pageSize); if (this.search) params = params.set('search', this.search); if (this.status) params = params.set('status', this.status);
    this.http.get<any>('http://localhost:8080/api/v1/manager/team/attendance', { params, headers: this.headers() }).subscribe({ next: response => {
      if (requestId !== this.requestSequence) return;
      this.serverPaginated = !Array.isArray(response) && Array.isArray(response?.data); this.rows = this.serverPaginated ? response.data : (response || []);
      this.totalItems = this.serverPaginated ? Number(response.total || this.rows.length) : this.rows.length; this.page = Number(response?.page || 1); this.isLoading = false;
    }, error: e => { if (requestId !== this.requestSequence) return; this.error = 'Gagal memuat absensi tim: ' + (e.error?.error || 'Unknown error'); this.isLoading = false; } });
  }
  get displayedRows(): any[] { return this.serverPaginated ? this.rows : this.rows.slice((this.page - 1) * this.pageSize, this.page * this.pageSize); }
  pageChanged(page: number): void { this.load(page); }
  pageSizeChanged(size: number): void { this.pageSize = size; this.load(1); }
  statusLabel(status: string): string {
    const normalized = String(status || '').trim().toLowerCase();
    return normalized === 'tidak hadir' || normalized === 'alpha' || normalized === 'alfa' ? 'Alpha' : status;
  }
  statusClass(status: string): string {
    const normalized = String(status || '').trim().toLowerCase();
    if (normalized === 'hadir') return 'status-hadir';
    if (normalized === 'izin') return 'status-izin';
    if (normalized === 'tidak hadir' || normalized === 'alpha' || normalized === 'alfa') return 'status-alpha';
    if (normalized === 'terlambat') return 'status-terlambat';
    return 'status-pending';
  }
  toggleExportDropdown(): void { this.isExportOpen = !this.isExportOpen; }
  closeExportDropdown(): void { this.isExportOpen = false; }
  exportCSV(): void { this.isExportOpen = false; this.reportExport.downloadCsv('absensi-tim.csv', ['Nama', 'Tanggal', 'Status', 'Masuk', 'Pulang'], this.exportRows()); }
  exportExcel(): void { this.isExportOpen = false; this.reportExport.downloadExcel('absensi-tim.xls', ['Nama', 'Tanggal', 'Status', 'Masuk', 'Pulang'], this.exportRows()); }
  exportJSON(): void { this.isExportOpen = false; this.reportExport.downloadJson('absensi-tim.json', this.rows); }
  exportPDF(): void { this.isExportOpen = false; this.reportExport.downloadPdf('absensi-tim.pdf', 'Absensi Tim', this.dateRangeLabel(), ['Nama', 'Tanggal', 'Status', 'Masuk', 'Pulang'], this.exportRows()); }
  printReport(): void { this.isExportOpen = false; this.reportExport.printReport('Absensi Tim', this.dateRangeLabel(), ['Nama', 'Tanggal', 'Status', 'Masuk', 'Pulang'], this.exportRows()); }
  private exportRows(): unknown[][] { return this.rows.map(row => [row.nama, row.tanggal, row.status, row.jam_masuk, row.jam_pulang]); }
  private dateRangeLabel(): string { return `${this.formatDate(this.startDate)} - ${this.formatDate(this.endDate)}`; }
  private formatDate(value: string): string { const [year, month, day] = value.split('-'); return year && month && day ? `${day}/${month}/${year}` : value; }
  private validateDateRange(): string {
    if (this.startDate && this.endDate && this.endDate < this.startDate) return 'Sampai tanggal tidak boleh lebih kecil dari Dari tanggal.';
    return '';
  }
  private headers(): HttpHeaders { return new HttpHeaders().set('Authorization', `Bearer ${this.auth.getToken()}`); }
  private attendanceQueryParams(): Record<string, string | number> {
    const params: Record<string, string | number> = { page: this.page, limit: this.pageSize };
    if (this.startDate) params['start_date'] = this.startDate;
    if (this.endDate) params['end_date'] = this.endDate;
    if (this.search) params['search'] = this.search;
    if (this.status) params['status'] = this.status;
    return params;
  }
}
