import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { SharedSidebarComponent } from '../../shared/shared-sidebar/shared-sidebar.component';
import { ReportExportService } from '../../../core/services/report-export.service';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';
@Component({ selector: 'app-team-attendance', standalone: true, imports: [CommonModule, FormsModule, SharedSidebarComponent, PaginationComponent], templateUrl: './team-attendance.component.html', styleUrls: ['./team-attendance.component.scss'] })
export class TeamAttendanceComponent implements OnInit {
  date = new Date().toISOString().slice(0, 10); search = ''; status = ''; rows: any[] = []; private serverPaginated = false;
  error = ''; isExportOpen = false; page = 1; pageSize = 25; pageSizeOptions = [10, 25, 50, 100]; totalItems = 0; isLoading = false;
  constructor(private http: HttpClient, private auth: AuthService, private reportExport: ReportExportService) {}
  ngOnInit(): void { this.load(); }
  load(page = 1): void {
    this.isLoading = true; this.page = page; this.error = '';
    let params = new HttpParams().set('date', this.date).set('page', page).set('limit', this.pageSize); if (this.search) params = params.set('search', this.search); if (this.status) params = params.set('status', this.status);
    this.http.get<any>('http://localhost:8080/api/v1/manager/team/attendance', { params, headers: this.headers() }).subscribe({ next: response => {
      this.serverPaginated = !Array.isArray(response) && Array.isArray(response?.data); this.rows = this.serverPaginated ? response.data : (response || []);
      this.totalItems = this.serverPaginated ? Number(response.total || this.rows.length) : this.rows.length; this.page = Number(response?.page || 1); this.isLoading = false;
    }, error: e => { this.error = 'Gagal memuat absensi tim: ' + (e.error?.error || 'Unknown error'); this.isLoading = false; } });
  }
  get displayedRows(): any[] { return this.serverPaginated ? this.rows : this.rows.slice((this.page - 1) * this.pageSize, this.page * this.pageSize); }
  pageChanged(page: number): void { if (this.serverPaginated) this.load(page); else this.page = page; }
  pageSizeChanged(size: number): void { this.pageSize = size; if (this.serverPaginated) this.load(1); else this.page = 1; }
  toggleExportDropdown(): void { this.isExportOpen = !this.isExportOpen; }
  exportCSV(): void { this.isExportOpen = false; this.reportExport.downloadCsv('absensi-tim.csv', ['Nama', 'Tanggal', 'Status', 'Masuk', 'Pulang'], this.rows.map(row => [row.nama, row.tanggal, row.status, row.jam_masuk, row.jam_pulang])); }
  exportExcel(): void { this.isExportOpen = false; this.reportExport.downloadExcel('absensi-tim.xls', ['Nama', 'Tanggal', 'Status', 'Masuk', 'Pulang'], this.rows.map(row => [row.nama, row.tanggal, row.status, row.jam_masuk, row.jam_pulang])); }
  exportJSON(): void { this.isExportOpen = false; this.reportExport.downloadJson('absensi-tim.json', this.rows); }
  exportPDF(): void { this.isExportOpen = false; this.reportExport.print(); }
  private headers(): HttpHeaders { return new HttpHeaders().set('Authorization', `Bearer ${this.auth.getToken()}`); }
}
