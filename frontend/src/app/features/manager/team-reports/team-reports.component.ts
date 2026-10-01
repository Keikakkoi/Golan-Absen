import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { SharedSidebarComponent } from '../../shared/shared-sidebar/shared-sidebar.component';
import { ReportExportService } from '../../../core/services/report-export.service';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';
import { AlertService } from '../../../core/services/alert.service';
import { hasReportContent } from '../../../core/utils/report-completeness';

@Component({
  selector: 'app-team-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, SharedSidebarComponent, PaginationComponent],
  templateUrl: './team-reports.component.html',
  styleUrls: ['./team-reports.component.scss']
})
export class TeamReportsComponent implements OnInit {
  start = '';
  end = '';
  search = '';
  reports: any[] = [];
  columns: any[] = [];
  private allReports: any[] = [];
  private serverPaginated = false;
  error = '';
  success = '';
  isLoading = false;
  isRefreshing = false;
  page = 1;
  pageSize = 25;
  totalItems = 0;
  pageSizeOptions = [10, 25, 50, 100];
  isExportOpen = false;
  notes: { [id: number]: string } = {};
  private reviewingIds = new Set<number>();
  private confirmingIds = new Set<number>();
  private requestSequence = 0;

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private reportExport: ReportExportService,
    private alert: AlertService
  ) {}

  ngOnInit(): void {
    this.loadColumns();
    this.load();
  }

  private loadColumns(): void {
    this.http.get<any[]>('http://localhost:8080/api/v1/work-reports/columns', { headers: this.headers() }).subscribe({
      next: columns => this.columns = (columns || []).filter(column => column.aktif !== false),
      error: () => this.columns = []
    });
  }

  load(isRefresh = false): void {
    if (isRefresh && (this.isRefreshing || this.isLoading)) return;

    if (this.start && this.end && this.start > this.end) {
      this.error = 'Rentang tanggal tidak valid: Dari Tanggal harus sama dengan atau sebelum Sampai Tanggal.';
      this.isLoading = false;
      this.isRefreshing = false;
      return;
    }

    this.isLoading = !isRefresh;
    this.isRefreshing = isRefresh;
    this.error = '';
    this.success = '';
    let params = new HttpParams();
    if (this.start) params = params.set('start_date', this.start);
    if (this.end) params = params.set('end_date', this.end);
    if (this.search) params = params.set('search', this.search);
    params = params.set('page', this.page).set('limit', this.pageSize);
    // Prevent an intermediary/browser cache from returning the old report list.
    params = params.set('_refresh', Date.now().toString());

    const requestId = ++this.requestSequence;
    this.http.get<any>('http://localhost:8080/api/v1/manager/team/reports', { params, headers: this.headers() }).subscribe({
      next: response => {
        if (requestId !== this.requestSequence) return;
        const paginated = !Array.isArray(response) && Array.isArray(response?.data);
        if (paginated) {
          const visibleReports = (response.data || []).filter((row: any) => !this.isDraft(row));
          const hiddenDrafts = (response.data || []).length - visibleReports.length;
          this.reports = visibleReports.slice(0, this.pageSize);
          this.allReports = [];
          this.totalItems = hiddenDrafts > 0
            ? Math.max(0, visibleReports.length)
            : Number(response.total || 0);
          this.serverPaginated = true;
        } else {
          this.allReports = (response || []).filter((row: any) => !this.isDraft(row));
          this.reports = this.allReports.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
          this.totalItems = this.allReports.length;
          this.serverPaginated = false;
        }
        this.page = paginated ? Number(response.page || this.page) : Math.min(this.page, this.totalPages());
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
        if (requestId !== this.requestSequence) return;
        this.error = isRefresh
          ? 'Gagal memperbarui data laporan: ' + (e.error?.error || 'Periksa koneksi lalu coba lagi.')
          : 'Gagal memuat laporan tim: ' + (e.error?.error || 'Unknown error');
        this.isLoading = false;
        this.isRefreshing = false;
      }
    });
  }

  refreshReports(): void {
    this.start = '';
    this.end = '';
    this.search = '';
    this.page = 1;
    this.load(true);
  }

  applyFilters(): void {
    if (this.start && this.end && this.start > this.end) {
      this.error = 'Rentang tanggal tidak valid: Dari Tanggal harus sama dengan atau sebelum Sampai Tanggal.';
      this.success = '';
      return;
    }
    this.page = 1;
    this.load();
  }

  get pagedReports(): any[] {
    return this.serverPaginated
      ? this.reports
      : this.allReports.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  changePage(delta: number): void {
    const next = this.page + delta;
    if (next >= 1 && next <= this.totalPages()) this.page = next;
  }

  pageChanged(page: number): void {
    if (page === this.page) return;
    this.page = page;
    this.load();
  }

  pageSizeChanged(size: number): void {
    this.pageSize = size;
    this.page = 1;
    this.load();
  }

  async reviewLogbook(id: number, status: 'approved' | 'rejected'): Promise<void> {
    if (!id || this.reviewingIds.has(id) || this.confirmingIds.has(id)) return;
    const found = this.findReport(id);
    if (found && this.logbookStatus(found) !== 'submitted') {
      this.error = 'Review hanya dapat dilakukan pada laporan berstatus Submitted.';
      return;
    }
    this.error = '';
    this.success = '';
    const noteText = this.reviewNote(found || { id });
    let rejectionReason = '';
    this.confirmingIds.add(id);

    let confirmed = false;
    try {
      if (status === 'rejected') {
        const reason = await this.alert.textarea('Alasan Penolakan', 'Tuliskan alasan penolakan laporan ini.', 'Lanjutkan Penolakan', 'Alasan Penolakan');
        if (reason === null) return;
        rejectionReason = reason;
        confirmed = true;
      } else {
        confirmed = await this.alert.confirm('Setujui logbook?', 'Apakah Anda yakin ingin menyetujui logbook ini?', 'Ya, setujui');
      }
    } catch {
      this.error = 'Gagal menampilkan konfirmasi review logbook.';
    } finally {
      this.confirmingIds.delete(id);
    }
    if (!confirmed) {
      return;
    }

    this.reviewingIds.add(id);

    this.http.put(`http://localhost:8080/api/v1/manager/team/logbooks/${id}/review`, { status, notes: noteText, review_notes: noteText, rejection_reason: rejectionReason }, { headers: this.headers() }).subscribe({
      next: (res: any) => {
        const latestStatus = this.normalizeStatus(res?.status_logbook || res?.status || status);
        if (found) {
          found.status_logbook = latestStatus;
          found.StatusLogbook = latestStatus;
          found.review_notes = res?.review_notes ?? noteText;
          found.ReviewNotes = res?.review_notes ?? noteText;
          found.rejection_reason = res?.rejection_reason ?? rejectionReason;
          found.RejectionReason = res?.rejection_reason ?? rejectionReason;
          found.reviewed_by = res?.reviewed_by ?? found.reviewed_by;
          found.reviewed_at = res?.reviewed_at ?? found.reviewed_at;
        }
        delete this.notes[id];
        this.success = latestStatus === 'approved' ? 'Logbook berhasil disetujui (Approved)' : 'Logbook berhasil ditolak (Rejected)';
        this.reviewingIds.delete(id);
        void this.alert.success(
          latestStatus === 'approved' ? 'Logbook berhasil disetujui' : 'Logbook berhasil ditolak',
          'Status logbook sudah diperbarui.'
        );
        setTimeout(() => this.success = '', 4000);
      },
      error: e => {
        this.reviewingIds.delete(id);
        this.error = 'Gagal memperbarui review logbook: ' + (e.error?.error || 'Unknown error');
        void this.alert.error('Review logbook gagal', this.error);
      }
    });
  }

  logbookStatus(row: any): string {
    return this.normalizeStatus(row?.status_logbook || row?.StatusLogbook);
  }

  logbookStatusClass(row: any): string {
    const status = this.logbookStatus(row);
    return status === 'approved'
      ? 'status-success'
      : status === 'submitted'
        ? 'status-warning status-submitted'
        : status === 'rejected'
          ? 'status-danger'
          : 'status-pending';
  }

  canReview(row: any): boolean {
    const id = row?.id || row?.ID;
    return this.isInternshipLogbook(row) && this.logbookStatus(row) === 'submitted' && !this.reviewingIds.has(id);
  }

  isProcessing(id: number): boolean {
    return this.reviewingIds.has(id) || this.confirmingIds.has(id);
  }

  isReviewed(row: any): boolean {
    const status = this.logbookStatus(row);
    return status === 'approved' || status === 'rejected';
  }

  reviewNote(row: any): string {
    const id = row?.id || row?.ID;
    const draftNote = id ? this.notes[id] : undefined;
    return String(draftNote !== undefined ? draftNote : (row?.review_notes || row?.ReviewNotes || '')).trim();
  }

  isInternshipLogbook(row: any): boolean {
    const role = String(row?.Employee?.User?.Role || row?.Employee?.User?.role || '').toUpperCase();
    if (role) return role === 'MAGANG';
    // Preserve the legacy response shape used by older cached/team payloads.
    // New regular reports always carry status_laporan, so this fallback cannot
    // route them into the logbook review UI.
    return !row?.status_laporan && !row?.StatusLaporan && !!(row?.status_logbook || row?.StatusLogbook);
  }

  statusLabel(row: any): string {
    return this.isInternshipLogbook(row) ? (this.logbookStatus(row) || '-') : (row?.status_sesuai || row?.StatusSesuai || 'Menunggu');
  }

  rejectionReason(row: any): string {
    return row?.rejection_reason || row?.RejectionReason || '-';
  }

  fillingStatus(row: any): string {
    if (this.isInternshipLogbook(row)) {
      const status = this.logbookStatus(row);
      return status ? status.charAt(0).toUpperCase() + status.slice(1) : '-';
    }
    return String(row?.status_laporan || row?.StatusLaporan || '').trim().toLowerCase() === 'draft' ? 'Draft' : 'Submitted';
  }

  fillingStatusClass(row: any): string {
    return this.fillingStatus(row).toLowerCase() === 'draft' ? 'status-warning' : 'status-success';
  }

  statusTimeLabel(row: any): string {
    if (!hasReportContent(row)) return '-';
    return row?.is_late_submission ? 'Terlambat' : 'Tepat waktu';
  }

  customFieldValue(row: any, key: string): string {
    const raw = row?.custom_fields || row?.CustomFields;
    if (!raw) return '-';
    try {
      const fields = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return fields?.[key] ?? '-';
    } catch { return '-'; }
  }

  private findReport(id: number): any {
    return this.reports.find(row => (row.id || row.ID) === id)
      || this.allReports.find(row => (row.id || row.ID) === id);
  }

  private normalizeStatus(status: any): string {
    return String(status || '').trim().toLowerCase();
  }

  private isDraft(row: any): boolean {
    return this.normalizeStatus(row?.status_laporan || row?.StatusLaporan) === 'draft'
      || this.normalizeStatus(row?.status_logbook || row?.StatusLogbook) === 'draft';
  }

  toggleExportDropdown(): void {
    this.isExportOpen = !this.isExportOpen;
  }

  exportCSV(): void {
    this.isExportOpen = false;
    this.exportWithFilteredReports(rows => this.reportExport.downloadCsv('laporan-tim.csv', this.exportHeaders(), rows));
  }

  exportExcel(): void {
    this.isExportOpen = false;
    this.exportWithFilteredReports(rows => this.reportExport.downloadExcel('laporan-tim.xls', this.exportHeaders(), rows));
  }

  exportJSON(): void {
    this.isExportOpen = false;
    this.loadAllFilteredReports(rows => this.reportExport.downloadJson('laporan-tim.json', rows.map(row => ({
      ...row,
      status_waktu: this.statusTimeLabel(row),
      catatan_review: this.reviewNote(row)
    }))));
  }

  exportPDF(): void {
    this.isExportOpen = false;
    this.exportWithFilteredReports(rows => this.reportExport.downloadPdf('laporan-tim.pdf', 'Laporan Tim', this.dateRangeLabel(), this.exportHeaders(), rows));
  }

  printReport(): void {
    this.isExportOpen = false;
    this.exportWithFilteredReports(rows => this.reportExport.printReport('Laporan Tim', this.dateRangeLabel(), this.exportHeaders(), rows));
  }

  private exportHeaders(): string[] {
    return ['Tanggal', 'Anggota', 'Divisi', 'Jabatan', 'Tugas', 'Judul', 'Deskripsi Kegiatan', 'Realisasi Kegiatan', 'Kendala', 'Rencana Minggu Depan', 'Link Artikel', 'Catatan Tambahan', 'Screenshot/Bukti Pengisian', 'Status Validasi/Logbook', 'Status Pengisian', 'Status Waktu', 'Catatan Review', 'Alasan Penolakan', ...this.columns.map(column => column.nama_kolom)];
  }

  private exportRows(reports: any[]): unknown[][] {
    return reports.map(row => [
      this.formatDate(row.tanggal || row.Tanggal),
      row.Employee?.User?.Nama || '-',
      row.Employee?.Division?.NamaDivisi || '-',
      row.Employee?.Position?.NamaJabatan || '-',
      row.tugas || row.Tugas || '-',
      row.judul || row.Judul || '-',
      row.deskripsi_kegiatan || row.DeskripsiKegiatan || '-',
      row.realisasi_kegiatan || row.RealisasiKegiatan || '-',
      row.kendala || row.Kendala || '-',
      row.rencana_minggu_depan || row.RencanaMingguDepan || '-',
      row.link_artikel || row.LinkArtikel || '-',
      row.catatan_tambahan || row.CatatanTambahan || '-',
      (row.attachments || []).map((image: any) => image.file_url || image.FileURL).filter(Boolean).join(' | ') || '-',
      this.statusLabel(row),
      this.fillingStatus(row),
      this.statusTimeLabel(row),
      this.reviewNote(row) || '-',
      this.rejectionReason(row),
      ...this.columns.map(column => this.customFieldValue(row, column.nama_kolom))
    ]);
  }

  private loadAllFilteredReports(done: (reports: any[]) => void): void {
    let params = new HttpParams();
    if (this.start) params = params.set('start_date', this.start);
    if (this.end) params = params.set('end_date', this.end);
    if (this.search) params = params.set('search', this.search);
    this.http.get<any>('http://localhost:8080/api/v1/manager/team/reports', { params, headers: this.headers() }).subscribe({
      next: response => done(Array.isArray(response) ? response : (response?.data || [])),
      error: e => this.error = 'Gagal menyiapkan data unduhan: ' + (e.error?.error || 'Periksa koneksi lalu coba lagi.')
    });
  }

  private exportWithFilteredReports(done: (rows: unknown[][]) => void): void {
    this.loadAllFilteredReports(reports => done(this.exportRows(reports)));
  }

  private dateRangeLabel(): string {
    return `${this.formatDate(this.start) || 'Semua tanggal'} - ${this.formatDate(this.end) || 'Semua tanggal'}`;
  }

  private formatDate(value: any): string {
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value || '');
  }

  private headers(): HttpHeaders {
    return new HttpHeaders().set('Authorization', `Bearer ${this.auth.getToken()}`);
  }
}
