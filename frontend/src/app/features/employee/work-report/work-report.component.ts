import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { WorkReportService, WorkReport, WorkReportColumn, ComplianceResult, WorkReportDeadline, PaginatedWorkReports } from '../../../core/services/work-report.service';
import { AlertService } from '../../../core/services/alert.service';
import { AuthService } from '../../../core/services/auth.service';
import Swal from 'sweetalert2';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';

import { CommonModule } from '@angular/common';
import { SharedSidebarComponent } from '../../shared/shared-sidebar/shared-sidebar.component';
import { UiSkeletonComponent } from '../../../shared/ui-skeleton/ui-skeleton.component';
import { FilePreviewComponent } from '../../../shared/file-preview/file-preview.component';
import { ReportExportService } from '../../../core/services/report-export.service';
import { dateOnly, isSameJakartaDate, jakartaDateString, monthRange, reportDayStatus } from './work-report-date.utils';
import { isValidRealisasiKegiatan, REALISASI_KEGIATAN_ERROR } from './work-report-validation';
import { requiresReportTitle as resolveRequiresReportTitle } from '../../../core/utils/report-completeness';
import { normalizeWorkReportContract, WORK_REPORT_NO_REPORT_LABEL } from '../../../core/utils/work-report-contract';
import { canonicalWorkReportTitle, canonicalWorkReportTitlePayload } from '../../../core/utils/work-report-title';
import { canonicalWorkReportExportRecord } from '../../../core/utils/work-report-export';
import { NotificationService } from '../../../core/services/notification.service';

type SavedScrollPosition = { left: number; top: number };

@Component({
  selector: 'app-work-report',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, SharedSidebarComponent, UiSkeletonComponent, PaginationComponent, FilePreviewComponent],
  templateUrl: './work-report.component.html',
  styleUrls: ['./work-report.component.scss']
})
export class WorkReportComponent implements OnDestroy, OnInit {
  readonly canonicalWorkReportTitle = canonicalWorkReportTitle;
  viewMode: 'list' | 'form' = 'list';
  isExportOpen = false;
  editingReportId: number | null = null;
  reports: WorkReport[] = [];
  private allReports: WorkReport[] = [];
  private serverPaginated = false;
  complianceData: ComplianceResult[] = [];
  columns: WorkReportColumn[] = [];
  reportForm!: FormGroup;
  selectedDate: string = '';
  isSubmitting = false;
  savingAction: 'draft' | 'submitted' | null = null;
  isLoading = true;
  isRefreshing = false;
  refreshError = '';
  refreshSuccess = '';
  userDivisi: string = '';
  selectedScreenshots: File[] = [];
  existingScreenshots: any[] = [];
  failedAttachmentURLs: Record<string, boolean> = {};
  selectedReportDetail: WorkReport | null = null;
  removedScreenshotIds: number[] = [];
  deadlineInfo: WorkReportDeadline | null = null;
  deadlineError = '';
  currentPage = 1;
  pageSize = 25;
  totalReports = 0;
  pageSizeOptions = [10, 25, 50, 100];
  selectedMonth = jakartaDateString().slice(0, 7);
  availableMonths: Array<{ value: string; label: string }> = [];
  complianceError = '';
  readonly monthLabelFormatter = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
  private disconnectRealtime?: () => void;

  constructor(
    private fb: FormBuilder,
    private workReportService: WorkReportService,
    private alertService: AlertService,
    public authService: AuthService,
    private reportExport: ReportExportService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.userDivisi = localStorage.getItem('divisi') || 'Belum Ditentukan';
    this.buildAvailableMonths();
    this.initForm();
    this.loadInitialData();
    this.disconnectRealtime = this.notificationService.connectRealtime(eventName => {
      if (eventName === 'work_report_status_updated' || eventName === 'logbook_status_updated') {
        this.loadInitialData(true);
      }
    });
  }

  ngOnDestroy(): void {
    this.disconnectRealtime?.();
    this.disconnectRealtime = undefined;
  }

  private buildAvailableMonths(): void {
    const [year, month] = jakartaDateString().split('-').map(Number);
    this.availableMonths = Array.from({ length: 25 }, (_, index) => {
      const date = new Date(Date.UTC(year, month - 1 - index, 1, 12));
      const value = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
      return { value, label: this.monthLabelFormatter.format(date) };
    });
  }

  initForm() {
    this.reportForm = this.fb.group({
      tanggal: ['', Validators.required],
      judul_tugas: ['', Validators.required],
      deskripsi_kegiatan: ['', Validators.required],
      realisasi_kegiatan: ['', [Validators.required, Validators.pattern(/^(?:100|[1-9]?\d)%$/)]],
      kendala: [''],
      rencana_minggu_depan: [''],
      link_artikel: [''],
      catatan_tambahan: [''],
      customFieldsForm: this.fb.group({})
    });
  }

  loadInitialData(isRefresh = false, preserveScrollPosition?: SavedScrollPosition) {
    if (isRefresh && (this.isRefreshing || this.isLoading)) return;

    this.refreshError = '';
    this.refreshSuccess = '';
    this.isLoading = !isRefresh;
    this.isRefreshing = isRefresh;

    forkJoin({
      columns: this.workReportService.getColumns(isRefresh),
      reports: this.workReportService.getWorkReports(undefined, monthRange(this.selectedMonth).start, monthRange(this.selectedMonth).end, undefined, isRefresh, this.currentPage, this.pageSize)
    }).pipe(
      finalize(() => {
        this.isLoading = false;
        this.isRefreshing = false;
        if (preserveScrollPosition) this.restoreScrollPosition(preserveScrollPosition);
      })
    ).subscribe({
      next: ({ columns, reports }) => {
        this.columns = columns;
        this.buildCustomFieldsForm();
        const response = reports as WorkReport[] | PaginatedWorkReports;
        if (Array.isArray(response)) {
          // Backward-compatible fallback for an older API process that still
          // returns the complete array instead of the pagination envelope.
          this.allReports = response;
          this.reports = response.slice((this.currentPage - 1) * this.pageSize, this.currentPage * this.pageSize);
          this.totalReports = response.length;
          this.serverPaginated = false;
        } else {
          this.allReports = [];
          this.reports = (response.data || []).slice(0, this.pageSize);
          this.totalReports = Number(response.total || 0);
          this.currentPage = Number(response.page || this.currentPage);
          this.serverPaginated = true;
        }
        this.loadCompliance(isRefresh);
        if (isRefresh) {
          this.refreshSuccess = 'Data laporan berhasil diperbarui.';
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: this.refreshSuccess,
            showConfirmButton: false,
            timer: 2500,
            timerProgressBar: true
          });
        }
      },
      error: (err) => {
        this.refreshError = err?.error?.error || 'Gagal memperbarui data laporan. Periksa koneksi lalu coba lagi.';
      }
    });
  }

  refreshReports(): void {
    this.loadInitialData(true);
  }

  pageChanged(page: number): void {
    if (page === this.currentPage) return;
    this.currentPage = page;
    this.loadInitialData();
  }

  pageSizeChanged(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.loadInitialData();
  }

  loadCompliance(forceRefresh = false) {
    const range = monthRange(this.selectedMonth);
    this.complianceError = '';

    this.workReportService.getCompliance(range.start, range.end, undefined, forceRefresh).subscribe({
      next: (res) => {
        // The API contract is boolean. Normalize defensively so a legacy
        // cached response containing "false" cannot be treated as truthy.
        this.complianceData = res.map(item => ({
          ...item,
          has_report: item.has_report === true || (item.has_report as unknown) === 1 || (item.has_report as unknown) === 'true'
        }));
        this.isLoading = false;
      },
      error: (err) => {
        this.complianceData = [];
        this.complianceError = err?.error?.error || 'Gagal memuat status pelaporan.';
        this.isLoading = false;
      }
    });
  }

  onMonthChange(): void {
    if (!this.availableMonths.some(month => month.value === this.selectedMonth)) {
      this.selectedMonth = this.availableMonths[0]?.value || jakartaDateString().slice(0, 7);
    }
    this.currentPage = 1;
    this.loadInitialData();
  }

  get selectedMonthLabel(): string {
    const [year, month] = this.selectedMonth.split('-').map(Number);
    return this.monthLabelFormatter.format(new Date(Date.UTC(year, month - 1, 1, 12)));
  }

  getDayStatus(c: ComplianceResult, today = jakartaDateString()): 'reported' | 'no_report' | 'future' | 'draft' | 'needs-review' {
    // A future date is always neutral. The API marks every empty calendar
    // cell as `no_report`, so checking the date first prevents future days
    // from being rendered red.
    const dayStatus = reportDayStatus(c.tanggal, c.has_report, today);
    if (dayStatus === 'future') return 'future';
    if (dayStatus === 'reported') return 'reported';
    if (c.status === 'no_report' || c.status === 'missing' || c.has_report === false) return 'no_report';
    if (c.status === 'draft') return 'draft';
    if (c.status === 'needs_improvement') return 'needs-review';
    return dayStatus === 'missing' ? 'no_report' : dayStatus;
  }

  getDayNumber(date: string): string {
    return date.slice(8, 10);
  }

  isSelectedMonthCurrent(): boolean {
    return this.selectedMonth === jakartaDateString().slice(0, 7);
  }

  buildCustomFieldsForm() {
    const customGroup = this.reportForm.get('customFieldsForm') as FormGroup;
    Object.keys(customGroup.controls).forEach(name => customGroup.removeControl(name));
    this.columns.forEach(col => {
      customGroup.addControl(col.nama_kolom, this.fb.control('', col.wajib_diisi ? Validators.required : null));
    });
  }

  getOptions(opsiStr: string): string[] {
    try {
      return JSON.parse(opsiStr) || [];
    } catch {
      return [];
    }
  }

  openForm(date?: string) {
    this.viewMode = 'form';
    this.selectedReportDetail = null;
    this.editingReportId = null;
    this.reportForm.reset();
    this.clearScreenshots();
    this.existingScreenshots = [];
    this.removedScreenshotIds = [];
    const workDate = date || jakartaDateString();
    this.reportForm.patchValue({ tanggal: workDate });
    this.loadDeadline(workDate);
  }

  onReportDateChange(date: string): void { this.loadDeadline(date); }

  private loadDeadline(date: string): void {
    this.deadlineInfo = null; this.deadlineError = '';
    if (!date) return;
    this.workReportService.getDeadline(date).subscribe({
      next: info => this.deadlineInfo = info,
      error: err => this.deadlineError = err?.error?.error || 'Informasi batas waktu tidak tersedia.'
    });
  }

  toggleExportDropdown() {
    this.isExportOpen = !this.isExportOpen;
  }

  cancelForm() {
    this.viewMode = 'list';
    this.isExportOpen = false;
    this.editingReportId = null;
  }

  canModifyReport(report: WorkReport): boolean {
    const contract = normalizeWorkReportContract(report);
    if (contract.status === 'no_report') return false;
    // A legacy MAGANG Draft is recoverable through the canonical endpoint.
    // Submitted/approved/rejected legacy history remains view-only.
    if (contract.report_kind === 'legacy_logbook') return contract.status === 'draft';
    if (contract.status === 'rejected' && !isSameJakartaDate(report.tanggal)) return false;
    return contract.status !== 'approved';
  }

  canReviseReport(report: WorkReport): boolean {
    const contract = normalizeWorkReportContract(report);
    return contract.report_kind === 'work_report'
      && contract.status === 'rejected'
      && isSameJakartaDate(report.tanggal);
  }

  reportFillingStatus(report: WorkReport): 'late' | 'draft' | 'submitted' | 'no_report' {
    const contract = normalizeWorkReportContract(report);
    if (contract.status === 'no_report') return 'no_report';
    if (contract.submission_timing === 'late') return 'late';
    return contract.filling_status;
  }

  reportFillingLabel(report: WorkReport): string {
    switch (this.reportFillingStatus(report)) {
      case 'late': return 'Terlambat';
      case 'draft': return 'Draft';
      case 'no_report': return WORK_REPORT_NO_REPORT_LABEL;
      default: return 'Submitted';
    }
  }

  reportFillingClass(report: WorkReport): string {
    const status = this.reportFillingStatus(report);
    return status === 'draft' || status === 'late'
      ? 'status-warning'
      : status === 'no_report' ? 'status-neutral' : 'status-success';
  }

  validationStatus(report: WorkReport): 'approved' | 'rejected' | 'pending' | 'draft' | 'no_report' {
    const contract = normalizeWorkReportContract(report);
    if (contract.status === 'no_report') return 'no_report';
    if (contract.status === 'approved') return 'approved';
    if (contract.status === 'rejected') return 'rejected';
    if (contract.status === 'draft') return 'draft';
    return 'pending';
  }

  validationStatusLabel(report: WorkReport): string {
    const managerStatus = String(report.manager_review_status || report.ManagerReviewStatus || '').trim().toLowerCase();
    const adminStatus = String(report.admin_validation_status || report.AdminValidationStatus || '').trim().toLowerCase();
    if (managerStatus || adminStatus) {
      const contract = normalizeWorkReportContract(report);
      if (contract.status === 'no_report') return WORK_REPORT_NO_REPORT_LABEL;
      if (contract.filling_status === 'draft') return 'Draft';
      if (managerStatus === 'pending') return 'Menunggu Persetujuan Manajer';
      if (managerStatus === 'rejected') return 'Ditolak Manajer';
      if (adminStatus === 'rejected') return 'Ditolak HRD/Admin';
      if (adminStatus === 'approved') return 'Tervalidasi HRD/Admin';
      if (managerStatus === 'approved' && adminStatus === 'pending') return 'Disetujui Manajer / Menunggu Validasi HRD';
    }
    switch (this.validationStatus(report)) {
      case 'approved': return 'Disetujui';
      case 'rejected': return 'Ditolak';
      case 'draft': return 'Draft';
      case 'no_report': return WORK_REPORT_NO_REPORT_LABEL;
      default: return 'Menunggu Review';
    }
  }

  validationStatusClass(report: WorkReport): string {
    switch (this.validationStatus(report)) {
      case 'approved': return 'status-hadir';
      case 'rejected': return 'status-alpha';
      case 'draft': return 'status-warning';
      case 'no_report': return 'status-neutral';
      default: return 'status-pending';
    }
  }

  viewReportDetail(report: WorkReport): void {
    this.selectedReportDetail = report;
    this.failedAttachmentURLs = {};
  }

  closeReportDetail(): void {
    this.selectedReportDetail = null;
    this.failedAttachmentURLs = {};
  }

  onAttachmentError(url: string): void {
    this.failedAttachmentURLs[url] = true;
  }

  requiresReportTitle(): boolean {
    return resolveRequiresReportTitle(this.userDivisi);
  }

  editReport(r: WorkReport) {
    if (!this.canModifyReport(r)) return;
    this.viewMode = 'form';
    this.isExportOpen = false;
    this.editingReportId = r.ID || null;
    this.clearScreenshots();
    this.existingScreenshots = [...(r.attachments || [])];
    this.removedScreenshotIds = [];
    
    // Parse custom fields if any
    let customFields = {};
    if (r.custom_fields) {
      try {
        customFields = JSON.parse(r.custom_fields);
      } catch (e) {}
    }
    
    this.reportForm.patchValue({
      tanggal: dateOnly(r.tanggal),
      judul_tugas: canonicalWorkReportTitle(r),
      deskripsi_kegiatan: r.deskripsi_kegiatan,
      realisasi_kegiatan: r.realisasi_kegiatan,
      kendala: r.kendala,
      rencana_minggu_depan: r.rencana_minggu_depan,
      link_artikel: r.link_artikel,
      catatan_tambahan: r.catatan_tambahan,
      customFieldsForm: customFields
    });
    this.loadDeadline(this.reportForm.value.tanggal);
    
    // editingReportId makes the same canonical save path update this report.
  }

  onScreenshotFilesChange(files: File[]): void {
    this.selectedScreenshots = files;
  }

  removeExistingScreenshot(index: number): void {
    const screenshot = this.existingScreenshots[index];
    const id = Number(screenshot?.id || screenshot?.ID);
    if (id) this.removedScreenshotIds = [...this.removedScreenshotIds, id];
    this.existingScreenshots = this.existingScreenshots.filter((_, i) => i !== index);
  }

  clearScreenshots(): void {
    this.selectedScreenshots = [];
    this.existingScreenshots = [];
    this.removedScreenshotIds = [];
  }

  async deleteReport(report: WorkReport, event?: Event): Promise<void> {
    event?.preventDefault();
    event?.stopPropagation();
    if (!this.canModifyReport(report) || !report.ID) return;
    const id = report.ID;
    const scrollPosition = this.captureScrollPosition();
    this.isExportOpen = false;
    if (!await this.alertService.confirm('Hapus Laporan?', 'Data yang dihapus tidak dapat dikembalikan!', 'Ya, Hapus!')) {
      this.restoreScrollPosition(scrollPosition);
      return;
    }

    this.workReportService.deleteWorkReport(id).subscribe({
      next: async () => {
        this.reports = this.reports.filter(report => report.ID !== id);
        this.allReports = this.allReports.filter(report => report.ID !== id);
        this.totalReports = Math.max(0, this.totalReports - 1);
        await this.alertService.success('Terhapus!', 'Laporan berhasil dihapus.');
        this.loadInitialData(false, scrollPosition);
      },
      error: async (err) => {
        const message = typeof err?.error?.error === 'string'
          ? err.error.error
          : typeof err?.error?.message === 'string'
            ? err.error.message
            : 'Laporan gagal dihapus.';
        await this.alertService.error('Gagal', message);
        this.restoreScrollPosition(scrollPosition);
      }
    });
  }

  private captureScrollPosition(): SavedScrollPosition {
    return { left: window.scrollX, top: window.scrollY };
  }

  private restoreScrollPosition(position: SavedScrollPosition): void {
    const restore = () => window.scrollTo(position.left, position.top);
    restore();
    requestAnimationFrame(() => {
      restore();
      requestAnimationFrame(restore);
    });
    window.setTimeout(restore, 80);
  }

  saveDraft(): void {
    if (this.isSubmitting) return;
    const date = String(this.reportForm.get('tanggal')?.value || '').trim();
    if (!date) {
      this.reportForm.get('tanggal')?.markAsTouched();
      Swal.fire({ icon: 'error', title: 'Tanggal wajib diisi', text: 'Pilih tanggal laporan terlebih dahulu.', confirmButtonColor: '#2F80ED' });
      return;
    }
    const realization = String(this.reportForm.get('realisasi_kegiatan')?.value || '').trim();
    if (realization && !isValidRealisasiKegiatan(realization)) {
      this.reportForm.get('realisasi_kegiatan')?.markAsTouched();
      Swal.fire({ icon: 'error', title: 'Input tidak valid', text: REALISASI_KEGIATAN_ERROR, confirmButtonColor: '#2F80ED' });
      return;
    }
    this.processSave('draft');
  }

  submitReport() {
    if (this.isSubmitting) return;
    if (!String(this.reportForm.get('judul_tugas')?.value || '').trim()) {
      this.reportForm.get('judul_tugas')?.markAsTouched();
      Swal.fire({
        icon: 'error',
        title: 'Judul Tugas wajib diisi',
        text: 'Isi Judul Tugas sebelum mengirim laporan kerja.',
        confirmButtonColor: '#2F80ED'
      });
      return;
    }
    if (this.reportForm.invalid) {
      this.reportForm.markAllAsTouched();
      Swal.fire({
        icon: 'error',
        title: 'Formulir Belum Lengkap',
        text: this.reportForm.get('realisasi_kegiatan')?.invalid
          ? REALISASI_KEGIATAN_ERROR
          : 'Harap lengkapi semua field yang diwajibkan',
        confirmButtonColor: '#2F80ED'
      });
      return;
    }

    Swal.fire({
      title: 'Kirim Laporan Kerja?',
      text: "Apakah Anda yakin data yang diisi sudah benar?",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2F80ED',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Ya, Kirim!',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        this.processSave('submitted');
      }
    });
  }

  private processSave(targetStatus: 'draft' | 'submitted') {
    this.isSubmitting = true;
    this.savingAction = targetStatus;
    const formValue = this.reportForm.value;
    if (targetStatus === 'submitted' && !isValidRealisasiKegiatan(formValue.realisasi_kegiatan)) {
      this.reportForm.get('realisasi_kegiatan')?.markAsTouched();
      this.isSubmitting = false;
      this.savingAction = null;
      Swal.fire({ icon: 'error', title: 'Input tidak valid', text: REALISASI_KEGIATAN_ERROR, confirmButtonColor: '#2F80ED' });
      return;
    }
    
    const payload = new FormData();
    payload.append('tanggal', formValue.tanggal || '');
    payload.append('judul_tugas', canonicalWorkReportTitlePayload(formValue.judul_tugas).judul_tugas);
    payload.append('deskripsi_kegiatan', formValue.deskripsi_kegiatan || '');
    payload.append('realisasi_kegiatan', formValue.realisasi_kegiatan || '');
    payload.append('kendala', formValue.kendala || '');
    payload.append('rencana_minggu_depan', formValue.rencana_minggu_depan || '');
    payload.append('link_artikel', formValue.link_artikel || '');
    payload.append('catatan_tambahan', formValue.catatan_tambahan || '');
    payload.append('custom_fields', JSON.stringify(formValue.customFieldsForm || {}));
    payload.append('status_laporan', targetStatus);
    this.selectedScreenshots.forEach(file => payload.append('screenshots', file, file.name));
    if (this.removedScreenshotIds.length) payload.append('delete_attachment_ids', JSON.stringify(this.removedScreenshotIds));

    const request = this.editingReportId 
      ? this.workReportService.updateWorkReport(this.editingReportId, payload)
      : this.workReportService.createWorkReport(payload);

    request.subscribe({
      next: () => {
        this.isSubmitting = false;
        this.savingAction = null;
        Swal.fire({
          icon: 'success',
          title: 'Berhasil!',
          text: targetStatus === 'draft'
            ? (this.editingReportId ? 'Draft laporan kerja berhasil diperbarui' : 'Laporan kerja berhasil disimpan sebagai draft')
            : (this.editingReportId ? 'Laporan kerja berhasil dikirim ulang' : 'Laporan kerja berhasil dikirim'),
          confirmButtonColor: '#2F80ED'
        }).then(() => {
          this.viewMode = 'list';
          this.editingReportId = null;
          this.loadInitialData();
        });
      },
      error: (err) => {
        this.isSubmitting = false;
        this.savingAction = null;
        const reason = this.getErrorReason(err, 'Terjadi kesalahan saat menyimpan laporan kerja.');
        Swal.fire({
          icon: 'error',
          title: targetStatus === 'draft' ? 'Gagal menyimpan draft' : (this.editingReportId ? 'Gagal mengirim laporan kerja' : 'Gagal menambahkan laporan kerja'),
          text: reason,
          confirmButtonColor: '#2F80ED'
        });
      }
    });
  }

  private getErrorReason(error: any, fallback: string): string {
    return typeof error?.error?.error === 'string'
      ? error.error.error
      : typeof error?.error?.message === 'string'
        ? error.error.message
        : typeof error?.message === 'string' && error.message !== 'Unknown Error'
          ? error.message
          : fallback;
  }

  exportExcel() {
    if (!this.reports || this.reports.length === 0) return;
    this.withExportReports(reports => {
      if (reports.length === 0) return;
      const userName = localStorage.getItem('name') || 'Employee';
      const headers = this.exportHeaders();
      const rows = this.exportRows(reports);
      const escapeHtml = (value: unknown): string => String(value ?? '-').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      let html = `
      <html xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head>
        <meta charset="utf-8">
        <style>
          table { border-collapse: collapse; font-family: Arial, sans-serif; }
          th, td { border: 1px solid #000000; padding: 6px; text-align: left; vertical-align: top; white-space: pre-wrap; overflow-wrap: anywhere; }
          .bg-yellow { background-color: #FFFF00; font-weight: bold; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>${headers.map(header => `<th class="bg-yellow">${escapeHtml(header)}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${rows.map(row => `<tr>${row.map(value => `<td>${escapeHtml(value)}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </body>
      </html>
      `;

      const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Laporan_Kerja_${userName.replace(/\s+/g, '_')}_${new Date().getTime()}.xls`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }
    
  exportCSV() {
    this.isExportOpen = false;
    if (!this.reports || this.reports.length === 0) return;
    this.withExportReports(reports => {
      if (reports.length === 0) return;
      const userName = localStorage.getItem('name')?.replace(/\s+/g, '_') || 'Employee';
      const csvEscape = (value: unknown): string => `"${String(value ?? '').replace(/"/g, '""')}"`;
      const csvContent = [this.exportHeaders(), ...this.exportRows(reports)]
        .map(row => row.map(csvEscape).join(','))
        .join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', `data:text/csv;charset=utf-8,${encodedUri}`);
      link.setAttribute('download', `Laporan_Kerja_${userName}_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  exportJSON() {
    this.isExportOpen = false;
    if (!this.reports || this.reports.length === 0) return;
    this.withExportReports(reports => {
      if (reports.length === 0) return;
      const data = reports.map(report => canonicalWorkReportExportRecord(report, {
        judul_tugas: canonicalWorkReportTitle(report),
        status_pengisian: this.reportFillingLabel(report),
        status_validasi: this.validationStatusLabel(report),
        catatan_review_alasan_penolakan: this.reviewOrRejectionNote(report)
      }));
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "laporan_kerja.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    });
  }

  exportPDF() {
    this.isExportOpen = false;
    if (!this.reports || this.reports.length === 0) return;
    this.withExportReports(reports => {
      if (reports.length === 0) return;
      const report = this.buildPrintableReport(reports);
      void this.reportExport.downloadPdf(`laporan-kerja-harian-${this.reportDate()}.pdf`, 'Laporan Kerja Harian', this.reportDate(), report.headers, report.rows);
    });
  }

  printReport() {
    this.isExportOpen = false;
    if (!this.reports || this.reports.length === 0) return;
    this.withExportReports(reports => {
      if (reports.length === 0) return;
      const report = this.buildPrintableReport(reports);
      this.reportExport.printReport('Laporan Kerja Harian', this.reportDate(), report.headers, report.rows);
    });
  }

  private buildPrintableReport(reports = this.reports): { headers: string[]; rows: unknown[][] } {
    return { headers: this.exportHeaders(), rows: this.exportRows(reports) };
  }

  private exportHeaders(): string[] {
    return ['No', 'Hari/Tanggal', 'Divisi', 'Judul Tugas', 'Deskripsi Kegiatan', 'Realisasi Kegiatan (Capaian Target, %)', 'Kendala (Jika Ada)', 'Rencana Minggu Depan', 'Link Artikel', 'Screenshot/Bukti Pengisian', 'Status Pengisian', 'Catatan Tambahan', 'Status Validasi', 'Catatan Review/Alasan Penolakan', ...this.columns.map(column => column.nama_kolom)];
  }

  private exportRows(reports = this.reports): unknown[][] {
    return reports.map((report, index) => [
      index + 1,
      this.formatReportDate(report.tanggal),
      this.userDivisi || '-',
      canonicalWorkReportTitle(report) || '-',
      report.deskripsi_kegiatan || '-',
      report.realisasi_kegiatan || '-',
      report.kendala || '-',
      report.rencana_minggu_depan || '-',
      report.link_artikel || '-',
      (report.attachments || []).map(image => image.file_url).filter(Boolean).join(' | ') || '-',
      this.reportFillingLabel(report),
      report.catatan_tambahan || '-',
      this.validationStatusLabel(report),
      this.reviewOrRejectionNote(report),
      ...this.columns.map(column => this.customFieldValue(report, column))
    ]);
  }

  private withExportReports(done: (reports: WorkReport[]) => void): void {
    if (!this.serverPaginated) {
      done(this.allReports.length ? this.allReports : this.reports);
      return;
    }
    const range = monthRange(this.selectedMonth);
    this.workReportService.getWorkReports(undefined, range.start, range.end).subscribe({
      next: response => {
        const payload = response as WorkReport[] | PaginatedWorkReports;
        const reports: WorkReport[] = Array.isArray(payload) ? payload : (payload.data || []);
        const seen = new Set<string>();
        done(reports.filter(report => {
          const id = report.ID;
          if (id === undefined || id === null) return true;
          const key = String(id);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }));
      },
      error: () => done(this.reports)
    });
  }

  private reportDate(): string { return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date()); }
  rejectionReason(report: WorkReport): string {
    const isRejected = normalizeWorkReportContract(report).status === 'rejected';
    const reason = String(report.rejection_reason || report.RejectionReason || '').trim();
    return isRejected && reason ? reason : '-';
  }
  reviewOrRejectionNote(report: WorkReport): string {
    const managerNotes = String(report.manager_review_notes || report.ManagerReviewNotes || report.review_notes || report.ReviewNotes || '').trim();
    const adminNotes = String(report.admin_notes || report.AdminNotes || '').trim();
    const managerReason = String(report.manager_rejection_reason || report.ManagerRejectionReason || '').trim();
    const adminReason = String(report.admin_rejection_reason || report.AdminRejectionReason || '').trim();
    const rejectionReason = this.rejectionReason(report);
    const notes: string[] = [];
    if (managerNotes) notes.push(`Catatan Manager: ${managerNotes}`);
    if (adminNotes) notes.push(`Catatan HRD/Admin: ${adminNotes}`);
    if (managerReason) notes.push(`Alasan Manager: ${managerReason}`);
    if (adminReason) notes.push(`Alasan HRD/Admin: ${adminReason}`);
    if (rejectionReason !== '-') notes.push(`Alasan Penolakan: ${rejectionReason}`);
    return notes.join('\n') || '-';
  }
  customFieldValue(report: WorkReport, column: WorkReportColumn): string {
    let fields: Record<string, unknown> = {};
    try { fields = JSON.parse(report.custom_fields || '{}'); } catch { fields = {}; }
    return String(fields[column.nama_kolom] ?? fields[column.ID] ?? '-');
  }
  formatReportDate(value: string): string {
    const [year, month, day] = dateOnly(value).split('-').map(Number);
    return Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)
      ? value || '-'
      : new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(year, month - 1, day));
  }
}
