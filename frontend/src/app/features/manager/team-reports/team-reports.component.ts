import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { SharedSidebarComponent } from '../../shared/shared-sidebar/shared-sidebar.component';
import { ReportExportService } from '../../../core/services/report-export.service';

@Component({
  selector: 'app-team-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, SharedSidebarComponent],
  templateUrl: './team-reports.component.html',
  styleUrls: ['./team-reports.component.scss']
})
export class TeamReportsComponent implements OnInit {
  start = '';
  end = '';
  search = '';
  reports: any[] = [];
  error = '';
  success = '';
  isLoading = false;
  isRefreshing = false;
  page = 1;
  readonly pageSize = 10;
  isExportOpen = false;
  notes: { [id: number]: string } = {};

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private reportExport: ReportExportService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(isRefresh = false): void {
    if (isRefresh && (this.isRefreshing || this.isLoading)) return;

    this.isLoading = !isRefresh;
    this.isRefreshing = isRefresh;
    this.error = '';
    this.success = '';
    let params = new HttpParams();
    if (this.start) params = params.set('start_date', this.start);
    if (this.end) params = params.set('end_date', this.end);
    if (this.search) params = params.set('search', this.search);
    // Prevent an intermediary/browser cache from returning the old report list.
    params = params.set('_refresh', Date.now().toString());

    this.http.get<any[]>('http://localhost:8080/api/v1/manager/team/reports', { params, headers: this.headers() }).subscribe({
      next: data => {
        this.reports = data || [];
        for (const row of this.reports) {
          const id = row.id || row.ID;
          if (id) {
            // Keep an in-progress note when the table is refreshed.
            if (this.notes[id] === undefined) {
              this.notes[id] = row.review_notes || row.ReviewNotes || '';
            }
          }
        }
        this.page = Math.min(this.page, this.totalPages());
        if (isRefresh) {
          this.success = 'Data laporan berhasil diperbarui.';
          window.setTimeout(() => this.success = '', 4000);
        }
        this.isLoading = false;
        this.isRefreshing = false;
      },
      error: e => {
        this.error = isRefresh
          ? 'Gagal memperbarui data laporan: ' + (e.error?.error || 'Periksa koneksi lalu coba lagi.')
          : 'Gagal memuat laporan tim: ' + (e.error?.error || 'Unknown error');
        this.isLoading = false;
        this.isRefreshing = false;
      }
    });
  }

  refreshReports(): void {
    this.load(true);
  }

  applyFilters(): void {
    this.page = 1;
    this.load();
  }

  get pagedReports(): any[] {
    const start = (this.page - 1) * this.pageSize;
    return this.reports.slice(start, start + this.pageSize);
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.reports.length / this.pageSize));
  }

  changePage(delta: number): void {
    const next = this.page + delta;
    if (next >= 1 && next <= this.totalPages()) this.page = next;
  }

  reviewLogbook(id: number, status: 'approved' | 'rejected'): void {
    if (!id) return;
    const found = this.reports.find(r => (r.id || r.ID) === id);
    if (found && (found.status_logbook || found.StatusLogbook) !== 'submitted') {
      this.error = 'Review hanya dapat dilakukan pada laporan berstatus Submitted.';
      return;
    }
    this.error = '';
    this.success = '';
    const noteText = this.notes[id] || '';

    this.http.put(`http://localhost:8080/api/v1/manager/team/logbooks/${id}/review`, { status, notes: noteText }, { headers: this.headers() }).subscribe({
      next: (res: any) => {
        this.success = status === 'approved' ? 'Logbook berhasil disetujui (Approved)' : 'Logbook berhasil ditolak (Rejected)';
        if (found) {
          found.status_logbook = status;
          found.StatusLogbook = status;
          found.review_notes = noteText;
          found.ReviewNotes = noteText;
        }
        setTimeout(() => this.success = '', 4000);
      },
      error: e => this.error = 'Gagal memperbarui review logbook: ' + (e.error?.error || 'Unknown error')
    });
  }

  toggleExportDropdown(): void {
    this.isExportOpen = !this.isExportOpen;
  }

  exportCSV(): void {
    this.isExportOpen = false;
    this.reportExport.downloadCsv(
      'laporan-tim.csv',
      ['Tanggal', 'Anggota', 'Role', 'Tugas', 'Kegiatan', 'Status', 'Catatan Review'],
      this.reports.map(row => [
        row.tanggal || row.Tanggal,
        row.Employee?.User?.Nama,
        row.Employee?.User?.Role || 'Karyawan',
        row.tugas || row.Tugas,
        row.deskripsi_kegiatan || row.DeskripsiKegiatan,
        row.status_logbook || row.StatusLogbook,
        this.notes[row.id || row.ID] || row.review_notes || row.ReviewNotes || ''
      ])
    );
  }

  exportExcel(): void {
    this.isExportOpen = false;
    this.reportExport.downloadExcel(
      'laporan-tim.xls',
      ['Tanggal', 'Anggota', 'Role', 'Tugas', 'Kegiatan', 'Status', 'Catatan Review'],
      this.reports.map(row => [
        row.tanggal || row.Tanggal,
        row.Employee?.User?.Nama,
        row.Employee?.User?.Role || 'Karyawan',
        row.tugas || row.Tugas,
        row.deskripsi_kegiatan || row.DeskripsiKegiatan,
        row.status_logbook || row.StatusLogbook,
        this.notes[row.id || row.ID] || row.review_notes || row.ReviewNotes || ''
      ])
    );
  }

  exportJSON(): void {
    this.isExportOpen = false;
    const dataWithNotes = this.reports.map(row => ({
      ...row,
      catatan_review: this.notes[row.id || row.ID] || row.review_notes || row.ReviewNotes || ''
    }));
    this.reportExport.downloadJson('laporan-tim.json', dataWithNotes);
  }

  exportPDF(): void {
    this.isExportOpen = false;
    this.reportExport.print();
  }

  private headers(): HttpHeaders {
    return new HttpHeaders().set('Authorization', `Bearer ${this.auth.getToken()}`);
  }
}
