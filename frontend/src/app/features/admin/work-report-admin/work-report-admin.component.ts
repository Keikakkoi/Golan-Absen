import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedSidebarComponent } from '../../shared/shared-sidebar/shared-sidebar.component';
import { WorkReportService, WorkReport, WorkReportColumn } from '../../../core/services/work-report.service';
import { AlertService } from '../../../core/services/alert.service';
import { AuthService } from '../../../core/services/auth.service';
import Swal from 'sweetalert2';
import { UiSkeletonComponent } from '../../../shared/ui-skeleton/ui-skeleton.component';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';
import { ReportExportService } from '../../../core/services/report-export.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  hasReportContent as resolveReportContent,
  hasRequiredReportFields as resolveRequiredReportFields,
  reportStatus as resolveReportStatus,
  requiresReportTitle as resolveRequiresReportTitle
} from '../../../core/utils/report-completeness';
import { normalizeWorkReportContract, WORK_REPORT_NO_REPORT_LABEL } from '../../../core/utils/work-report-contract';
import { canonicalWorkReportTitle } from '../../../core/utils/work-report-title';
import { canonicalWorkReportExportRecord } from '../../../core/utils/work-report-export';

@Component({
  selector: 'app-work-report-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedSidebarComponent, UiSkeletonComponent, PaginationComponent],
  templateUrl: './work-report-admin.component.html',
  styleUrls: ['./work-report-admin.component.scss']
})
export class WorkReportAdminComponent implements OnInit, OnDestroy {
  readonly canonicalWorkReportTitle = canonicalWorkReportTitle;
  @ViewChild('paginationBar') paginationBar?: ElementRef<HTMLElement>;

  reports: WorkReport[] = [];
  allReports: WorkReport[] = [];
  columns: WorkReportColumn[] = [];
  isLoading = true;
  isExportOpen = false;
  pageSizeOptions = [10, 25, 50, 100];
  pageSize = 25;
  currentPage = 1;
  printAllReports = false;
  private readonly adminNoteDrafts = new Map<number, string>();
  private readonly adminNoteOriginals = new Map<number, string>();
  private readonly adminNoteSaving = new Set<number>();
  private readonly adminNoteReadOnly = new Set<number>();
  private readonly validationUpdating = new Set<number>();
  private disconnectRealtime?: () => void;
  private refreshHandle?: ReturnType<typeof setTimeout>;
  private destroyed = false;
  private notificationReportID: number | null = null;

  // Filters
  filterOptions = {
    search: '',
    startDate: '',
    endDate: '',
    division: '',
    project_id: '',
    role: '',
    position: '',
    team: '',
    user_id: '',
    status: '',
    sort_order: 'desc'
  };
  uniqueDivisions: string[] = [];
  uniqueRoles: string[] = [];
  readonly reporterRoles = ['Karyawan', 'MANAJER', 'MAGANG'];
  uniqueReporters: Array<{ id: string; name: string }> = [];
  uniqueTeams: string[] = [];
  projects: any[] = [];
  selectedReportDetail: WorkReport | null = null;

  private readonly reportStatusFilters = [WORK_REPORT_NO_REPORT_LABEL, 'Laporan belum lengkap', 'Sudah membuat laporan'];

  constructor(
    private workReportService: WorkReportService,
    private alertService: AlertService,
    private http: HttpClient,
    private authService: AuthService,
    private reportExport: ReportExportService,
    private notificationService: NotificationService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const reportID = Number(this.route.snapshot.queryParamMap.get('report_id'));
    this.notificationReportID = Number.isInteger(reportID) && reportID > 0 ? reportID : null;
    this.loadData();
    this.loadColumns();
    this.loadDivisionsAndRoles();
    this.disconnectRealtime = this.notificationService.connectRealtime(eventName => {
      if (['new_work_report', 'work_report_status_updated', 'notification_created'].includes(eventName)) {
        this.scheduleRealtimeRefresh();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    if (this.refreshHandle) clearTimeout(this.refreshHandle);
    this.refreshHandle = undefined;
    this.disconnectRealtime?.();
    this.disconnectRealtime = undefined;
  }

  private scheduleRealtimeRefresh(): void {
    if (this.destroyed || this.refreshHandle) return;
    this.refreshHandle = setTimeout(() => {
      this.refreshHandle = undefined;
      if (!this.destroyed) this.loadData();
    }, 250);
  }

  loadData() {
    this.isLoading = true;
    this.workReportService.getWorkReports(undefined, this.filterOptions.startDate, this.filterOptions.endDate, this.filterOptions.project_id).subscribe({
      next: (res) => {
        // Admin must never expose Draft data, even if an older backend
        // accidentally includes it in the response.
        this.allReports = (res || []).filter(report => !this.isDraft(report));
        this.buildReportFilterOptions();
        this.initializeAdminNotes(this.allReports);
        this.applyFilters(false);
        this.openNotificationReportIfReady();
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  private loadColumns() {
    this.workReportService.getColumns().subscribe({
      next: (res) => this.columns = res,
      error: () => this.columns = []
    });
  }

  getHeaders() {
    return new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
  }

  loadDivisionsAndRoles() {
    this.http.get<any[]>('http://localhost:8080/api/v1/admin/organization/divisions', { headers: this.getHeaders() }).subscribe({
      next: (data) => {
        this.uniqueDivisions = data.map(d => d.NamaDivisi).sort();
      },
      error: (err) => console.error('Failed to load divisions', err)
    });

    this.http.get<any[]>('http://localhost:8080/api/v1/admin/organization/positions', { headers: this.getHeaders() }).subscribe({
      next: (data) => {
        this.uniqueRoles = data.map(p => p.NamaJabatan).sort();
      },
      error: (err) => console.error('Failed to load roles', err)
    });

    this.http.get<any[]>('http://localhost:8080/api/v1/admin/organization/projects', { headers: this.getHeaders() }).subscribe({
      next: (data) => this.projects = data || [],
      error: (err) => console.error('Failed to load projects', err)
    });
  }

  private buildReportFilterOptions(): void {
    const reporters = new Map<string, string>();
    const teams = new Set<string>();
    this.allReports.forEach(report => {
      const id = this.reporterUserId(report);
      if (id) reporters.set(id, this.getEmployeeName(report));
      const team = this.reporterTeam(report);
      if (team !== '-') teams.add(team);
    });
    this.uniqueReporters = Array.from(reporters.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
    this.uniqueTeams = Array.from(teams).sort((a, b) => a.localeCompare(b));
  }

  applyFilters(resetPage = true) {
    // Keep the defensive guard here as well so Draft cannot enter filtering,
    // pagination, sorting, or any downstream export path.
    let temp = this.allReports.filter(report => !this.isDraft(report));

    // 1. Search (Name, Judul Tugas)
    if (this.filterOptions.search) {
      const q = this.filterOptions.search.toLowerCase();
      temp = temp.filter(r => 
        this.getEmployeeName(r).toLowerCase().includes(q) ||
        canonicalWorkReportTitle(r).toLowerCase().includes(q) ||
        (r.deskripsi_kegiatan && r.deskripsi_kegiatan.toLowerCase().includes(q))
      );
    }

    // 2. Date Range
    if (this.filterOptions.startDate) {
      const start = new Date(this.filterOptions.startDate);
      start.setHours(0,0,0,0);
      temp = temp.filter(r => {
        if (!r.tanggal) return false;
        const d = new Date(r.tanggal);
        d.setHours(0,0,0,0);
        return d.getTime() >= start.getTime();
      });
    }
    if (this.filterOptions.endDate) {
      const end = new Date(this.filterOptions.endDate);
      end.setHours(23,59,59,999);
      temp = temp.filter(r => {
        if (!r.tanggal) return false;
        const d = new Date(r.tanggal);
        return d.getTime() <= end.getTime();
      });
    }

    // 3. Division
    if (this.filterOptions.division) {
      temp = temp.filter(r => r.Employee?.Division?.NamaDivisi === this.filterOptions.division);
    }

    // 4. Pelapor role
    if (this.filterOptions.role) {
      temp = temp.filter(r => this.reporterRole(r) === this.filterOptions.role);
    }

    // 5. Team, position, and user
    if (this.filterOptions.team) {
      temp = temp.filter(r => this.reporterTeam(r) === this.filterOptions.team);
    }
    if (this.filterOptions.position) {
      temp = temp.filter(r => r.Employee?.Position?.NamaJabatan === this.filterOptions.position);
    }
    if (this.filterOptions.user_id) {
      temp = temp.filter(r => this.reporterUserId(r) === this.filterOptions.user_id);
    }

    // 6. Status Validasi
    if (this.filterOptions.status) {
      if (this.filterOptions.status === 'Submitted') {
        temp = temp.filter(r => this.reportFillingLabel(r) === this.filterOptions.status);
      } else if (this.filterOptions.status === 'Menunggu') {
        temp = temp.filter(r => this.normalizedValidationStatus(r) === 'pending' && this.canValidate(r));
      } else if (this.reportStatusFilters.includes(this.filterOptions.status)) {
        temp = temp.filter(r => this.reportStatusLabel(r) === this.filterOptions.status);
      } else {
        const requestedStatus = this.normalizedValidationStatusValue(this.filterOptions.status);
        temp = temp.filter(r => this.normalizedValidationStatus(r) === requestedStatus);
      }
    }

    if (this.filterOptions.sort_order === 'desc') {
      temp.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
    } else if (this.filterOptions.sort_order === 'asc') {
      temp.sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());
    } else if (this.filterOptions.sort_order === 'name_asc') {
      temp.sort((a, b) => this.getEmployeeName(a).localeCompare(this.getEmployeeName(b)));
    } else if (this.filterOptions.sort_order === 'name_desc') {
      temp.sort((a, b) => this.getEmployeeName(b).localeCompare(this.getEmployeeName(a)));
    }

    this.reports = temp;
    if (resetPage) {
      this.currentPage = 1;
    } else {
      this.ensureValidPage();
    }
  }

  resetFilters() {
    this.filterOptions = {
      search: '',
      startDate: '',
      endDate: '',
      division: '',
      project_id: '',
      role: '',
      position: '',
      team: '',
      user_id: '',
      status: '',
      sort_order: 'desc'
    };
    this.currentPage = 1;
    this.loadData();
  }

  onFilterChange() {
    this.applyFilters(true);
  }

  onProjectFilterChange() {
    this.currentPage = 1;
    this.loadData();
  }

  onPageSizeChange() {
    this.currentPage = 1;
    this.ensureValidPage();
  }

  goToPage(page: number | string) {
    if (typeof page !== 'number') return;
    this.changeCurrentPage(page);
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.changeCurrentPage(this.currentPage - 1);
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages()) {
      this.changeCurrentPage(this.currentPage + 1);
    }
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.getNonDraftReports().length / this.pageSize));
  }

  pageNumbers(): Array<number | string> {
    const total = this.totalPages();
    const current = this.currentPage;

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    if (current <= 3) {
      return [1, 2, 3, 4, '...', total];
    }

    if (current >= total - 2) {
      return [1, '...', total - 3, total - 2, total - 1, total];
    }

    const pages: Array<number | string> = [1];
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    if (start > 2) pages.push('...');
    for (let page = start; page <= end; page++) {
      pages.push(page);
    }
    if (end < total - 1) pages.push('...');
    pages.push(total);

    return pages;
  }

  get paginationStartIndex(): number {
    return this.getNonDraftReports().length === 0 ? 0 : (this.currentPage - 1) * this.pageSize;
  }

  get paginationEndIndex(): number {
    return Math.min(this.paginationStartIndex + this.pageSize, this.getNonDraftReports().length);
  }

  get displayedReports(): WorkReport[] {
    const visibleReports = this.getNonDraftReports();
    if (this.printAllReports) {
      return visibleReports;
    }
    return visibleReports.slice(this.paginationStartIndex, this.paginationEndIndex);
  }

  private ensureValidPage() {
    if (this.currentPage > this.totalPages()) {
      this.currentPage = this.totalPages();
    }
  }

  private changeCurrentPage(page: number) {
    const target = Math.min(Math.max(page, 1), this.totalPages());
    if (target === this.currentPage) return;

    this.blurActiveControl();
    this.currentPage = target;
    this.keepPaginationVisible();
  }

  private blurActiveControl() {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
  }

  private keepPaginationVisible() {
    if (typeof window === 'undefined') return;

    const scrollToPagination = () => {
      this.paginationBar?.nativeElement.scrollIntoView({
        behavior: 'auto',
        block: 'center',
        inline: 'nearest'
      });
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToPagination);
    });
    window.setTimeout(scrollToPagination, 80);
  }

  private getNonDraftReports(): WorkReport[] {
    return this.reports.filter(report => !this.isDraft(report));
  }

  // HR Validation
  async updateValidation(report: WorkReport, event: any): Promise<void> {
    if (this.isNoReport(report) || this.isDraft(report) || !this.canValidate(report)) return;
    const select = event.target as HTMLSelectElement;
    const previousValue = this.validationSelection(report);
    const newVal = select.value;
    const id = Number(report.ID || 0);
    if (!newVal || !id || this.validationUpdating.has(id)) return;

    let rejectionReason = '';
    if (newVal === 'Tidak Sesuai') {
      const reason = await this.alertService.textarea('Alasan Penolakan', 'Tuliskan alasan penolakan laporan ini.', 'Lanjutkan Penolakan', 'Alasan Penolakan');
      if (reason === null) {
        select.value = previousValue;
        return;
      }
      rejectionReason = reason;
    }
    
    this.validationUpdating.add(id);
    this.workReportService.updateWorkReport(id, {
      status_sesuai: newVal,
      rejection_reason: rejectionReason,
      admin_notes: this.adminNote(report)
    }).subscribe({
      next: (res) => {
        report.status_sesuai = res.status_sesuai;
        report.StatusSesuai = res.StatusSesuai || res.status_sesuai;
        if (res.status_logbook !== undefined) report.status_logbook = res.status_logbook;
        if (res.StatusLogbook !== undefined) report.StatusLogbook = res.StatusLogbook;
        report.rejection_reason = res.rejection_reason || rejectionReason;
        this.applyAdminNoteResponse(report, res);
        report.validasi_oleh_hr = true;
        report.admin_validation_status = res.admin_validation_status || (newVal === 'Sesuai' ? 'approved' : 'rejected');
        report.admin_validated_by = res.admin_validated_by;
        report.admin_validated_at = res.admin_validated_at;
        report.admin_rejection_reason = res.admin_rejection_reason || (newVal === 'Tidak Sesuai' ? rejectionReason : '');
        this.validationUpdating.delete(id);
        this.alertService.success('Status validasi berhasil diupdate');
      },
      error: (err) => {
        select.value = previousValue;
        this.validationUpdating.delete(id);
        const message = typeof err?.error?.error === 'string'
          ? err.error.error
          : 'Gagal mengupdate validasi';
        this.alertService.error(message);
      }
    });
  }

  isValidationUpdating(report: WorkReport): boolean {
    return this.validationUpdating.has(Number(report.ID || 0));
  }

  validationSelection(report: WorkReport): string {
    const status = this.normalizedValidationStatus(report);
    if (status === 'sesuai' || status === 'validasi laporan') return 'Sesuai';
    if (status === 'tidak sesuai' || status === 'tolak laporan') return 'Tidak Sesuai';
    return '';
  }

  canValidate(report: WorkReport): boolean {
    if (this.isNoReport(report) || this.isDraft(report)) return false;
    const contract = normalizeWorkReportContract(report);
    const managerReviewLabel = this.managerReviewLabel(report);
    const managerStatus = String(
      report.manager_review_status
      || report.ManagerReviewStatus
      || contract.manager_review_status
      || (managerReviewLabel === 'Menunggu Persetujuan Manajer' ? 'pending' : '')
      || (managerReviewLabel === 'Ditolak Manajer' ? 'rejected' : '')
    ).trim().toLowerCase();
    const validationStatus = this.normalizedValidationStatus(report);
    return managerStatus !== 'pending'
      && managerStatus !== 'rejected'
      && validationStatus !== 'sesuai'
      && validationStatus !== 'validasi laporan'
      && validationStatus !== 'tidak sesuai'
      && validationStatus !== 'tolak laporan'
      && contract.admin_validation_status !== 'approved'
      && contract.admin_validation_status !== 'rejected'
      && String(report.admin_validation_status || report.AdminValidationStatus || '').trim().toLowerCase() !== 'approved'
      && String(report.admin_validation_status || report.AdminValidationStatus || '').trim().toLowerCase() !== 'rejected';
  }

  private initializeAdminNotes(reports: WorkReport[]): void {
    reports.forEach(report => {
      const id = Number(report.ID || 0);
      if (!id || this.adminNoteDrafts.has(id)) return;
      const note = this.backendAdminNote(report);
      this.adminNoteDrafts.set(id, note);
      this.adminNoteOriginals.set(id, note);
      if (note) this.adminNoteReadOnly.add(id);
    });
  }

  private backendAdminNote(report: WorkReport): string {
    return String(report.admin_notes || report.AdminNotes || '').trim();
  }

  managerNote(report: WorkReport): string {
    return String(report.manager_review_notes || report.ManagerReviewNotes || report.review_notes || report.ReviewNotes || '').trim();
  }

  adminNote(report: WorkReport): string {
    const id = Number(report.ID || 0);
    return id && this.adminNoteDrafts.has(id)
      ? this.adminNoteDrafts.get(id) || ''
      : this.backendAdminNote(report);
  }

  managerAdminNote(report: WorkReport): string {
    const notes: string[] = [];
    const managerNote = this.managerNote(report);
    const adminNote = this.adminNote(report);
    if (managerNote) notes.push(`Catatan Manager: ${managerNote}`);
    if (adminNote) notes.push(`Catatan Admin: ${adminNote}`);
    return notes.length ? notes.join('\n') : '-';
  }

  canEditAdminNote(report: WorkReport): boolean {
    const id = Number(report.ID || 0);
    return this.canValidate(report) && !this.adminNoteReadOnly.has(id);
  }

  adminNoteDirty(report: WorkReport): boolean {
    const id = Number(report.ID || 0);
    if (!id) return false;
    return this.adminNote(report).trim() !== (this.adminNoteOriginals.get(id) || '').trim();
  }

  isAdminNoteSaving(report: WorkReport): boolean {
    return this.adminNoteSaving.has(Number(report.ID || 0));
  }

  onAdminNoteChange(report: WorkReport, value: string): void {
    const id = Number(report.ID || 0);
    if (id) this.adminNoteDrafts.set(id, value ?? '');
  }

  saveAdminNote(report: WorkReport): void {
    const id = Number(report.ID || 0);
    if (!id || !this.canEditAdminNote(report) || !this.adminNoteDirty(report) || this.adminNoteSaving.has(id)) return;

    this.adminNoteSaving.add(id);
    this.workReportService.updateWorkReport(id, { admin_notes: this.adminNote(report) }).subscribe({
      next: response => {
        this.applyAdminNoteResponse(report, response);
        this.adminNoteSaving.delete(id);
        this.alertService.success('Catatan Admin berhasil disimpan');
      },
      error: () => {
        this.adminNoteSaving.delete(id);
        this.alertService.error('Gagal menyimpan Catatan Admin');
      }
    });
  }

  private applyAdminNoteResponse(report: WorkReport, response: WorkReport): void {
    const id = Number(report.ID || 0);
    const responseNote = this.backendAdminNote(response);
    report.admin_notes = responseNote;
    report.AdminNotes = responseNote;
    if (response.admin_note_by !== undefined) report.admin_note_by = response.admin_note_by;
    if (response.admin_note_at !== undefined) report.admin_note_at = response.admin_note_at;
    if (id) {
      this.adminNoteDrafts.set(id, responseNote);
      this.adminNoteOriginals.set(id, responseNote);
      this.adminNoteReadOnly.add(id);
    }
  }

  toggleExportDropdown() {
    this.isExportOpen = !this.isExportOpen;
  }

  exportExcel() {
    this.isExportOpen = false;
    const reports = this.getNonDraftReports();
    if (reports.length === 0) return;

    // Find custom fields headers
    let customHeaders: string[] = [];
    if (this.columns && this.columns.length > 0) {
      customHeaders = this.columns.map(c => c.nama_kolom);
    } else if (reports[0].custom_fields) {
      try {
        const parsed = JSON.parse(reports[0].custom_fields);
        customHeaders = Object.keys(parsed);
      } catch(e) {}
    }

    let html = `
      <html xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head>
        <meta charset="utf-8">
        <style>
          table { border-collapse: collapse; font-family: Arial, sans-serif; }
          th, td { border: 1px solid #000000; padding: 6px; text-align: center; vertical-align: middle; }
          .bg-yellow { background-color: #FFFF00; font-weight: bold; }
          .bg-teal { background-color: #C6E0B4; font-weight: bold; } /* light green/teal from image */
           .validation-status { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 20px; font-weight: 600; line-height: 1.4; }
           .validation-status::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
           .validation-status-pending { background: #FFF4D6; color: #B7791F; }
           .validation-status-approved { background: #E6F8EF; color: #087443; }
           .validation-status-rejected { background: #FDEBEC; color: #C53030; }
           .validation-status-none { background: #F1F5F9; color: #64748B; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              <th class="bg-yellow">No</th>
              <th class="bg-teal">Hari/Tanggal</th>
              <th class="bg-yellow">Nama</th>
              <th class="bg-yellow">Divisi</th>
              <th class="bg-yellow">Jabatan</th>
              <th class="bg-yellow">Judul Tugas</th>
              <th class="bg-yellow">Deskripsi Kegiatan</th>
              <th class="bg-yellow">Realisasi Kegiatan. ( Capaian Target. % )</th>
              <th class="bg-yellow">Kendala (Jika Ada)</th>
              <th class="bg-yellow">Rencana Minggu Depan</th>
              <th class="bg-yellow">Link Artikel</th>
              <th class="bg-yellow">Catatan Tambahan</th>
              <th class="bg-yellow">Status Pengisian</th>
              <th class="bg-yellow">Status Laporan</th>
              <th class="bg-yellow">Status Waktu</th>
              <th class="bg-yellow">Bukti Pengisian</th>
              <th class="bg-yellow">Status Validasi</th>
              <th class="bg-yellow">Catatan Manager/Admin</th>
              <th class="bg-yellow">Alasan Penolakan</th>
              <th class="bg-yellow">Aksi & Validasi</th>`;
              
    customHeaders.forEach(ch => {
      html += `<th class="bg-yellow">${ch}</th>`;
    });

    html += `</tr>
          </thead>
          <tbody>
    `;
    
    reports.forEach((r, index) => {
      const dateObj = new Date(r.tanggal);
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const dateString = `${days[dateObj.getDay()]}, ${dateObj.getDate()} ${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
      const dept = r.Employee?.Division?.NamaDivisi || '-';
      const jabatan = r.Employee?.Position?.NamaJabatan || '-';
      const userName = this.getEmployeeName(r);
      const statusReport = this.reportStatusLabel(r);
      const statusTime = this.statusTimeLabel(r);
      const statusValidation = this.exportValidationLabel(r);
      
      html += `
        <tr>
          <td>${index + 1}</td>
          <td>${dateString}</td>
          <td>${userName}</td>
          <td>${dept}</td>
          <td>${jabatan}</td>
          <td style="text-align: left;">${canonicalWorkReportTitle(r).replace(/</g, '&lt;')}</td>
          <td style="text-align: left;">${(r.deskripsi_kegiatan || '').replace(/</g, '&lt;')}</td>
          <td>${r.realisasi_kegiatan || ''}</td>
          <td style="text-align: left;">${(r.kendala || '').replace(/</g, '&lt;')}</td>
          <td style="text-align: left;">${(r.rencana_minggu_depan || '').replace(/</g, '&lt;')}</td>
          <td>${r.link_artikel ? `<a href="${r.link_artikel}">${r.link_artikel}</a>` : '-'}</td>
          <td style="text-align: left;">${(r.catatan_tambahan || '').replace(/</g, '&lt;')}</td>
          <td>${this.reportFillingLabel(r)}</td>
          <td>${statusReport}</td>
          <td>${statusTime}</td>
          <td>${this.evidenceExportLabel(r)}</td>
          <td><span class="validation-status ${this.validationStatusClass(r)}">${statusValidation}</span></td>
          <td style="white-space: pre-wrap; text-align: left;">${this.managerAdminNote(r).replace(/</g, '&lt;')}</td>
          <td style="white-space: pre-wrap; text-align: left;">${this.rejectionReason(r).replace(/</g, '&lt;')}</td>
          <td><span class="validation-status ${this.validationStatusClass(r)}">${statusValidation}</span></td>`;
          
      let customData: any = {};
      try { customData = JSON.parse(r.custom_fields || '{}'); } catch(e) {}
      
      if (this.columns && this.columns.length > 0) {
        this.columns.forEach(col => {
          html += `<td>${customData[col.ID] || ''}</td>`;
        });
      } else {
        customHeaders.forEach(ch => {
          html += `<td>${customData[ch] || ''}</td>`;
        });
      }
      
      html += `</tr>`;
    });
    
    html += `
          </tbody>
        </table>
      </body>
      </html>
    `;
    
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Rekap_Laporan_Kerja_${new Date().getTime()}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  exportCSV() {
    this.isExportOpen = false;
    const reports = this.getNonDraftReports();
    if (reports.length === 0) return;
    
    // Create CSV content manually
    let csvContent = "data:text/csv;charset=utf-8,";
    // Headers
    const headers = ["No", "Tanggal", "Nama Karyawan", "Divisi", "Jabatan", "Judul Tugas", "Deskripsi", "Realisasi", "Kendala", "Rencana", "Status Pengisian", "Status Laporan", "Bukti Pengisian", "Status Waktu", "Status Validasi", "Catatan Manager/Admin", "Alasan Penolakan"];
    const customHeaders = this.columns.map(c => `"${c.nama_kolom.replace(/"/g, '""')}"`);
    csvContent += headers.concat(customHeaders).join(",") + "\n";
    
    reports.forEach((r, i) => {
      const row = [
        i + 1,
        new Date(r.tanggal).toISOString().split('T')[0],
        `"${(r.Employee?.User?.Nama || '').replace(/"/g, '""')}"`,
        `"${(r.Employee?.Division?.NamaDivisi || '').replace(/"/g, '""')}"`,
        `"${(r.Employee?.Position?.NamaJabatan || '').replace(/"/g, '""')}"`,
        `"${canonicalWorkReportTitle(r).replace(/"/g, '""')}"`,
        `"${(r.deskripsi_kegiatan || '').replace(/"/g, '""')}"`,
        `"${(r.realisasi_kegiatan || '').replace(/"/g, '""')}"`,
        `"${(r.kendala || '').replace(/"/g, '""')}"`,
        `"${(r.rencana_minggu_depan || '').replace(/"/g, '""')}"`,
        `"${this.reportFillingLabel(r).replace(/"/g, '""')}"`,
        `"${this.reportStatusLabel(r).replace(/"/g, '""')}"`,
        `"${this.evidenceExportLabel(r).replace(/"/g, '""')}"`,
        `"${this.statusTimeLabel(r).replace(/"/g, '""')}"`,
        `"${this.exportValidationLabel(r).replace(/"/g, '""')}"`,
        `"${this.managerAdminNote(r).replace(/"/g, '""')}"`,
        `"${this.rejectionReason(r).replace(/"/g, '""')}"`
      ];

      // Custom fields
      let customData: any = {};
      try {
        if (r.custom_fields) customData = JSON.parse(r.custom_fields);
      } catch (e) {}

      this.columns.forEach(col => {
        const val = customData[col.ID] || '-';
        row.push(`"${String(val).replace(/"/g, '""')}"`);
      });

      csvContent += row.join(",") + "\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Laporan_Kerja_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  exportJSON() {
    this.isExportOpen = false;
    const reports = this.getNonDraftReports();
    if (reports.length === 0) return;
    const data = reports.map(report => canonicalWorkReportExportRecord(report, {
      judul_tugas: canonicalWorkReportTitle(report),
      status_pengisian: this.reportFillingLabel(report),
      status_validasi: this.exportValidationLabel(report),
      bukti_pengisian: this.evidenceExportLabel(report),
      status_waktu: this.statusTimeLabel(report),
      catatan_manager_admin: this.managerAdminNote(report),
      alasan_penolakan: this.rejectionReason(report)
    }));
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "rekap_laporan_kerja.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }

  exportPDF() {
    this.isExportOpen = false;
    const report = this.buildPrintableReport();
    void this.reportExport.downloadPdf(`laporan-kerja-${this.exportDate()}.pdf`, 'Laporan Kerja Karyawan', this.exportDate(), report.headers, report.rows);
  }

  printReport() {
    this.isExportOpen = false;
    const report = this.buildPrintableReport();
    this.reportExport.printReport('Laporan Kerja Karyawan', this.exportDate(), report.headers, report.rows);
  }

  private buildPrintableReport(): { headers: string[]; rows: unknown[][] } {
    const headers = ['No', 'Hari/Tanggal', 'Nama', 'Divisi', 'Jabatan', 'Judul Tugas', 'Deskripsi Kegiatan', 'Realisasi Kegiatan', 'Kendala', 'Rencana Minggu Depan', 'Link Artikel', 'Catatan Tambahan', 'Status Pengisian', 'Status Laporan', 'Bukti Pengisian', 'Status Waktu', 'Status Validasi', 'Catatan Manager/Admin', 'Alasan Penolakan'];
    const rows = this.getNonDraftReports().map((r, index) => {
      const customData: Record<string, unknown> = {};
      try { Object.assign(customData, JSON.parse(r.custom_fields || '{}')); } catch { /* laporan tetap dapat diekspor meski custom field rusak */ }
      const customValues = this.columns.map(column => customData[column.ID] ?? '-');
      return [index + 1, this.formatReportDate(r.tanggal), this.getEmployeeName(r), r.Employee?.Division?.NamaDivisi || '-', r.Employee?.Position?.NamaJabatan || '-', canonicalWorkReportTitle(r) || '-', r.deskripsi_kegiatan || '-', r.realisasi_kegiatan || '-', r.kendala || '-', r.rencana_minggu_depan || '-', r.link_artikel || '-', r.catatan_tambahan || '-', this.reportFillingLabel(r), this.reportStatusLabel(r), this.evidenceExportLabel(r), this.statusTimeLabel(r), this.exportValidationLabel(r), this.managerAdminNote(r), this.rejectionReason(r), ...customValues];
    });
    return { headers: headers.concat(this.columns.map(column => column.nama_kolom)), rows };
  }

  private formatReportDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(date);
  }

  private exportDate(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  }

  getEmployeeName(report: WorkReport): string {
    return report.Employee?.User?.Nama || 'Unknown';
  }

  reporterUserId(report: WorkReport): string {
    return String(report.Employee?.User?.ID || report.Employee?.UserID || report.EmployeeID || '');
  }

  reporterRole(report: WorkReport): string {
    return String(report.Employee?.User?.Role || 'Karyawan');
  }

  reporterTeam(report: WorkReport): string {
    const team = String(report.Employee?.User?.TeamID || '').trim();
    return team || '-';
  }

  viewReportDetail(report: WorkReport): void {
    this.selectedReportDetail = report;
  }

  closeReportDetail(): void {
    this.selectedReportDetail = null;
    if (this.notificationReportID !== null) {
      this.notificationReportID = null;
      void this.router.navigate([], { queryParams: { report_id: null }, queryParamsHandling: 'merge', replaceUrl: true });
    }
  }

  private openNotificationReportIfReady(): void {
    if (this.notificationReportID === null) return;
    const report = this.allReports.find(item => Number(item.ID) === this.notificationReportID);
    if (report) this.selectedReportDetail = report;
  }

  reportStatus(report: WorkReport): 'draft' | 'no_report' | 'incomplete' | 'complete' {
    return resolveReportStatus(report);
  }

  reportStatusLabel(report: WorkReport): string {
    switch (this.reportStatus(report)) {
      case 'draft': return '';
      case 'no_report': return WORK_REPORT_NO_REPORT_LABEL;
      case 'incomplete': return 'Laporan belum lengkap';
      default: return 'Sudah membuat laporan';
    }
  }

  reportStatusClass(report: WorkReport): string {
    switch (this.reportStatus(report)) {
      case 'draft': return 'status-warning';
      case 'no_report': return 'status-neutral';
      case 'incomplete': return 'status-warning';
      default: return 'status-hadir';
    }
  }

  reportFillingStatus(report: WorkReport): 'draft' | 'submitted' | 'not_filled' {
    const contract = normalizeWorkReportContract(report);
    if (contract.status === 'no_report' || contract.filling_status === 'no_report') return 'not_filled';
    return contract.filling_status === 'draft' ? 'draft' : 'submitted';
  }

  reportFillingLabel(report: WorkReport): string {
    switch (this.reportFillingStatus(report)) {
      case 'draft': return '';
      case 'not_filled': return WORK_REPORT_NO_REPORT_LABEL;
      default: return 'Submitted';
    }
  }

  reportFillingClass(report: WorkReport): string {
    return this.reportFillingStatus(report) === 'draft'
      ? 'status-warning'
      : this.reportFillingStatus(report) === 'not_filled' ? 'status-neutral' : 'status-success';
  }

  isIncompleteReport(report: WorkReport): boolean {
    return this.reportStatus(report) === 'incomplete';
  }

  hasCompleteReport(report: WorkReport): boolean {
    return this.reportStatus(report) === 'complete';
  }

  validationLabel(report: WorkReport): string {
    const status = this.normalizedValidationStatus(report);
    const contract = normalizeWorkReportContract(report);
    if (contract.status === 'no_report' || contract.status === 'draft' || status === 'tidak perlu validasi') return 'Tidak perlu validasi';
    if (contract.manager_review_status === 'pending') return 'Menunggu Persetujuan Manajer';
    if (contract.manager_review_status === 'rejected') return 'Ditolak Manajer';
    if (contract.manager_review_status === 'not_required' && contract.admin_validation_status === 'pending') return 'Menunggu Validasi HRD/Admin';
    if (contract.manager_review_status === 'approved' && contract.admin_validation_status === 'pending') return 'Menunggu Validasi HRD/Admin';
    if (contract.admin_validation_status === 'approved') return 'Tervalidasi HRD/Admin';
    if (contract.admin_validation_status === 'rejected') return 'Ditolak HRD/Admin';
    if (contract.status === 'approved') return 'Validasi laporan';
    if (contract.status === 'rejected') return 'Tolak laporan';
    if (status === 'sesuai' || status === 'validasi laporan') return 'Validasi laporan';
    if (status === 'tidak sesuai' || status === 'tolak laporan') return 'Tolak laporan';
    return 'Menunggu validasi';
  }

  managerReviewLabel(report: WorkReport): string {
    if (this.isNoReport(report) || this.isDraft(report)) return 'Tidak perlu review';
    const explicit = String(report.manager_review_status || report.ManagerReviewStatus || '').trim().toLowerCase();
    const legacy = String((report as any).status_logbook || (report as any).StatusLogbook || '').trim().toLowerCase();
    const status = explicit || (legacy === 'submitted' ? 'pending' : legacy === 'approved' || legacy === 'rejected' ? legacy : 'not_required');
    if (status === 'pending') return 'Menunggu Persetujuan Manajer';
    if (status === 'approved') return 'Disetujui Manajer';
    if (status === 'rejected') return 'Ditolak Manajer';
    return 'Tidak Perlu Review Manajer';
  }

  private exportValidationLabel(report: WorkReport): string {
    return this.isNoReport(report) ? WORK_REPORT_NO_REPORT_LABEL : this.validationLabel(report);
  }

  validationStatusClass(report: WorkReport): string {
    const status = this.normalizedValidationStatus(report);
    const managerStatus = String(report.manager_review_status || report.ManagerReviewStatus || '').trim().toLowerCase();
    if (managerStatus === 'rejected') return 'validation-status-rejected';
    if (this.isNoReport(report) || this.isDraft(report) || status === 'tidak perlu validasi') {
      return 'validation-status-none';
    }
    if (status === 'sesuai' || status === 'validasi laporan') return 'validation-status-approved';
    if (status === 'tidak sesuai' || status === 'tolak laporan') return 'validation-status-rejected';
    return 'validation-status-pending';
  }

  private normalizedValidationStatus(report: WorkReport): string {
    const explicit = String(report?.admin_validation_status || report?.AdminValidationStatus || '').trim().toLowerCase();
    if (explicit === 'approved') return 'sesuai';
    if (explicit === 'rejected') return 'tidak sesuai';
    if (explicit === 'not_required') return 'tidak perlu validasi';
    if (explicit) return explicit;
    const legacyStatus = String((report as any)?.status_logbook || (report as any)?.StatusLogbook || '').trim().toLowerCase();
    if (legacyStatus === 'approved') return 'sesuai';
    if (legacyStatus === 'rejected') return 'tidak sesuai';
    const raw = this.normalizedValidationStatusValue(report?.status_sesuai || '');
    if (raw) return raw;
    const contract = normalizeWorkReportContract(report);
    if (contract.admin_validation_status === 'approved') return 'sesuai';
    if (contract.admin_validation_status === 'rejected') return 'tidak sesuai';
    if (contract.admin_validation_status === 'pending') return 'pending';
    return '';
  }

  private normalizedValidationStatusValue(value: string): string {
    const status = String(value || '').trim().toLowerCase();
    return status === 'minta perbaikan' || status === 'minta_perbaikan' ? 'tidak sesuai' : status;
  }

  rejectionReason(report: WorkReport): string {
    const row = report as WorkReport & {
      status_logbook?: string;
      StatusLogbook?: string;
      RejectionReason?: string;
      RejectionSource?: string;
      manager_rejection_reason?: string;
      ManagerRejectionReason?: string;
      admin_rejection_reason?: string;
      AdminRejectionReason?: string;
    };
    const validationStatus = String(report.status_sesuai || '').trim().toLowerCase();
    // Read-only fallback for historical legacy_logbook rows.
    const legacyStatus = String(row.status_logbook || row.StatusLogbook || '').trim().toLowerCase();
    const rejectionSource = String(report.rejection_source || row.RejectionSource || '').trim().toLowerCase();
    const rejectionReason = String(report.rejection_reason || row.RejectionReason || '').trim();
    const managerReason = String(row.manager_rejection_reason || row.ManagerRejectionReason || '').trim();
    const adminReason = String(row.admin_rejection_reason || row.AdminRejectionReason || '').trim();
    const reasons: string[] = [];

    if (managerReason) reasons.push(`Alasan Manager: ${managerReason}`);
    if (adminReason) reasons.push(`Alasan Admin: ${adminReason}`);
    if (reasons.length) return reasons.join('\n');
    if (!rejectionReason) return '-';

    if (rejectionSource === 'manager' || (legacyStatus === 'rejected' && validationStatus !== 'tidak sesuai')) {
      return `Alasan Manager: ${rejectionReason}`;
    }
    if (rejectionSource === 'admin' || rejectionSource === 'hrd' || validationStatus === 'tidak sesuai' || validationStatus === 'rejected') {
      return `Alasan Admin: ${rejectionReason}`;
    }
    if (legacyStatus === 'rejected') return `Alasan Manager: ${rejectionReason}`;
    return '-';
  }

  isNoReport(report: WorkReport): boolean {
    return this.reportStatus(report) === 'no_report';
  }

  hasReportContent(report: WorkReport): boolean {
    return resolveReportContent(report);
  }

  hasEvidence(report: WorkReport): boolean {
    return Array.isArray(report?.attachments) && report.attachments.length > 0;
  }

  evidenceLabel(report: WorkReport): string {
    return this.isNoReport(report) ? WORK_REPORT_NO_REPORT_LABEL : '-';
  }

  private evidenceExportLabel(report: WorkReport): string {
    if (this.isNoReport(report)) return WORK_REPORT_NO_REPORT_LABEL;
    return this.hasEvidence(report) ? String(report.attachments?.length || 0) + ' screenshot' : '-';
  }

  private isLateSubmission(report: WorkReport): boolean {
    return report?.is_late_submission === true
      || String(report?.is_late_submission ?? '').trim().toLowerCase() === 'true'
      || String(report?.is_late_submission ?? '').trim() === '1';
  }

  shouldShowLateStatus(report: WorkReport): boolean {
    return this.isLateSubmission(report) && !this.isNoReport(report) && this.hasReportContent(report);
  }

  statusTimeLabel(report: WorkReport): string {
    if (this.isNoReport(report)) return '-';
    return this.shouldShowLateStatus(report) ? 'Terlambat' : 'Tepat waktu';
  }

  isDraft(report: WorkReport): boolean {
    return normalizeWorkReportContract(report).filling_status === 'draft';
  }

  private hasRequiredReportFields(report: WorkReport): boolean {
    return resolveRequiredReportFields(report);
  }

  requiresReportTitle(report: WorkReport): boolean {
    return resolveRequiresReportTitle(report);
  }
}
