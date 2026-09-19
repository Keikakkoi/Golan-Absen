import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { SharedSidebarComponent } from '../../shared/shared-sidebar/shared-sidebar.component';
import { ReportExportService } from '../../../core/services/report-export.service';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';
import { FilePreviewComponent } from '../../../shared/file-preview/file-preview.component';
import { AlertService } from '../../../core/services/alert.service';
import Swal from 'sweetalert2';

@Component({ selector: 'app-intern-logbook', standalone: true, imports: [CommonModule, FormsModule, DatePipe, SharedSidebarComponent, PaginationComponent, FilePreviewComponent], templateUrl: './intern-logbook.component.html', styleUrls: ['./intern-logbook.component.scss'] })
export class InternLogbookComponent implements OnInit {
  @ViewChild('editLogbookForm') editLogbookForm?: ElementRef<HTMLElement>;
  private editScrollTimer: ReturnType<typeof setTimeout> | null = null;

  logbooks: any[] = []; message = ''; error = ''; saving = false;
  page = 1; pageSize = 25; pageSizeOptions = [10, 25, 50, 100]; isLoading = false;
  editingId: number | null = null; start = ''; end = ''; statusFilter = ''; isExportOpen = false;
  statusFilterOpen = false; statusFilterDropUp = false;
  selectedLogbookDetail: any = null;
  deadlineInfo: any = null; deadlineError = '';
  form = { tanggal: new Date().toISOString().slice(0, 10), tugas: '', deskripsi_kegiatan: '', kendala: '', status: 'draft' };
  selectedScreenshots: File[] = [];
  existingScreenshots: any[] = [];
  removedScreenshotIds: number[] = [];
  constructor(private http: HttpClient, private auth: AuthService, private reportExport: ReportExportService, private alert: AlertService) {}
  ngOnInit(): void { this.load(); this.loadDeadline(); }
  loadDeadline(): void { this.deadlineInfo = null; this.deadlineError = ''; if (!this.form.tanggal) return; this.http.get<any>('http://localhost:8080/api/v1/work-reports/deadline', { params: new HttpParams().set('date', this.form.tanggal), headers: this.headers() }).subscribe({ next: data => this.deadlineInfo = data, error: e => this.deadlineError = e.error?.error || 'Informasi batas waktu tidak tersedia.' }); }
  load(resetPage = true): void { this.isLoading = true; let params = new HttpParams(); if (this.start) params = params.set('start_date', this.start); if (this.end) params = params.set('end_date', this.end); if (this.statusFilter) params = params.set('status', this.statusFilter); this.http.get<any>('http://localhost:8080/api/v1/internship/logbooks', { params, headers: this.headers() }).subscribe({ next: response => { this.logbooks = Array.isArray(response) ? response : (response.data || []); this.page = resetPage ? 1 : Math.min(this.page, Math.max(1, Math.ceil(this.logbooks.length / this.pageSize))); this.isLoading = false; }, error: e => { this.error = 'Gagal memuat logbook: ' + (e.error?.error || 'Unknown error'); this.isLoading = false; } }); }
  get displayedLogbooks(): any[] { return this.logbooks.slice((this.page - 1) * this.pageSize, this.page * this.pageSize); }
  get dateAlreadyLogged(): boolean {
    if (this.editingId) return false;
    return this.logbooks.some(item => String(item.tanggal || item.Tanggal || '').slice(0, 10) === this.form.tanggal);
  }
  logbookStatus(item: any): string { return String(item?.status_logbook || item?.StatusLogbook || 'draft').trim().toLowerCase(); }
  canEdit(item: any): boolean { return this.logbookStatus(item) === 'draft'; }
  canDelete(item: any): boolean {
    const status = this.logbookStatus(item);
    return status === 'draft' || status === 'rejected';
  }
  logbookStatusClass(item: any): string {
    return `status-${this.logbookStatus(item) === 'approved' ? 'success' : this.logbookStatus(item) === 'rejected' ? 'danger' : this.logbookStatus(item) === 'submitted' ? 'warning' : 'pending'}`;
  }
  pageChanged(page: number): void { this.page = page; }
  pageSizeChanged(size: number): void { this.pageSize = size; this.page = 1; }
  toggleStatusFilter(event: MouseEvent): void {
    event.stopPropagation();
    this.statusFilterOpen = !this.statusFilterOpen;
    if (this.statusFilterOpen) {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      this.statusFilterDropUp = window.innerHeight - rect.bottom < 190 && rect.top > window.innerHeight - rect.bottom;
    } else this.statusFilterDropUp = false;
  }
  selectStatusFilter(value: string, event: MouseEvent): void { event.stopPropagation(); this.statusFilter = value; this.statusFilterOpen = false; this.statusFilterDropUp = false; }
  statusFilterLabel(): string { return this.statusFilter ? this.statusFilter.charAt(0).toUpperCase() + this.statusFilter.slice(1) : 'Semua status'; }
  @HostListener('document:click') closeStatusFilter(): void { this.statusFilterOpen = false; this.statusFilterDropUp = false; }
  save(targetStatus?: string): void {
    if (this.dateAlreadyLogged) {
      this.showSaveError('Logbook untuk tanggal tersebut sudah dibuat. Jika statusnya masih Draft, silakan gunakan tombol Edit pada riwayat logbook.');
      return;
    }
    if (!this.form.tanggal || !this.form.deskripsi_kegiatan.trim()) {
      this.showSaveError('Tanggal dan deskripsi kegiatan wajib diisi.');
      return;
    }
    if (targetStatus === 'submitted') {
      const scrollPosition = { left: window.scrollX, top: window.scrollY };
      Swal.fire({
        title: 'Kirim logbook sekarang?',
        text: 'Setelah dikirim, logbook akan masuk untuk ditinjau dan tidak dapat diubah.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Ya, Kirim',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#2F80ED',
        cancelButtonColor: '#6c757d',
        position: 'center',
        heightAuto: false,
        scrollbarPadding: false,
        focusConfirm: false,
        focusCancel: false,
        didOpen: () => window.scrollTo(scrollPosition)
      }).then(result => {
        if (result.isConfirmed) this.executeSave(targetStatus);
        window.scrollTo(scrollPosition);
      });
      return;
    }
    this.executeSave(targetStatus);
  }

  private executeSave(targetStatus?: string): void {
    if (targetStatus) {
      this.form.status = targetStatus;
    }
    this.saving = true;
    this.error = '';
    const fd = new FormData();
    Object.entries(this.form).forEach(([key, value]) => fd.append(key, value));
    fd.append('status_logbook', this.form.status);
    this.selectedScreenshots.forEach(file => fd.append('screenshots', file, file.name));
    if (this.removedScreenshotIds.length) fd.append('delete_attachment_ids', JSON.stringify(this.removedScreenshotIds));
    const request = this.editingId ? this.http.put(`http://localhost:8080/api/v1/internship/logbooks/${this.editingId}`, fd, { headers: this.headers() }) : this.http.post('http://localhost:8080/api/v1/internship/logbooks', fd, { headers: this.headers() });
    request.subscribe({
      next: () => {
        this.message = this.editingId ? 'Logbook diperbarui.' : (this.form.status === 'submitted' ? 'Logbook berhasil dikirim.' : 'Logbook tersimpan sebagai draft.');
        this.saving = false;
        this.cancelEdit();
        this.load();
      },
      error: e => {
        this.showSaveError(this.getErrorReason(e, 'Gagal menyimpan logbook.'));
        this.saving = false;
      }
    });
  }
  private showSaveError(reason: string): void {
    this.error = '';
    void Swal.fire({
      icon: 'error',
      title: this.editingId ? 'Gagal mengedit logbook' : 'Gagal menambahkan logbook',
      text: reason,
      confirmButtonText: 'Tutup',
      confirmButtonColor: '#2F80ED'
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
  onScreenshotFilesChange(files: File[]): void { this.selectedScreenshots = files; }
  removeExistingScreenshot(index: number): void {
    const screenshot = this.existingScreenshots[index];
    const id = Number(screenshot?.id || screenshot?.ID);
    if (id) this.removedScreenshotIds = [...this.removedScreenshotIds, id];
    this.existingScreenshots = this.existingScreenshots.filter((_, i) => i !== index);
  }
  edit(item: any): void {
    if (!this.canEdit(item)) return;

    this.editingId = item.id || item.ID;
    this.existingScreenshots = [...(item.attachments || item.Attachments || [])];
    this.removedScreenshotIds = [];
    this.form = {
      tanggal: String(item.tanggal || item.Tanggal || '').slice(0, 10),
      tugas: item.tugas || item.Tugas || '',
      deskripsi_kegiatan: item.deskripsi_kegiatan || item.DeskripsiKegiatan || '',
      kendala: item.kendala || item.Kendala || '',
      status: 'draft'
    };
    this.loadDeadline();
    this.scrollToEditForm();
  }
  private scrollToEditForm(): void {
    // Wait for the heading/state to be rendered before measuring the target.
    if (this.editScrollTimer) clearTimeout(this.editScrollTimer);
    this.editScrollTimer = setTimeout(() => {
      this.editScrollTimer = null;
      this.editLogbookForm?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
    }, 0);
  }
  cancelEdit(): void { if (this.editScrollTimer) { clearTimeout(this.editScrollTimer); this.editScrollTimer = null; } this.editingId = null; this.form = { tanggal: new Date().toISOString().slice(0, 10), tugas: '', deskripsi_kegiatan: '', kendala: '', status: 'draft' }; this.selectedScreenshots = []; this.existingScreenshots = []; this.removedScreenshotIds = []; this.loadDeadline(); }
  viewDetail(item: any): void { this.selectedLogbookDetail = item; }
  closeDetail(): void { this.selectedLogbookDetail = null; }
  async deleteLogbook(item: any): Promise<void> {
    const id = item.id || item.ID;
    if (!this.canDelete(item)) return;
    if (!await this.alert.confirm('Hapus logbook?', 'Apakah Anda yakin ingin menghapus logbook ini?', 'Ya, hapus')) return;
    this.http.delete(`http://localhost:8080/api/v1/internship/logbooks/${id}`, { headers: this.headers() }).subscribe({
      next: async () => { this.message = ''; this.error = ''; await this.alert.success('Logbook berhasil dihapus', 'Draft logbook telah dihapus.'); this.load(false); },
      error: e => { this.error = e.error?.error || 'Gagal menghapus logbook'; }
    });
  }
  toggleExportDropdown(): void { this.isExportOpen = !this.isExportOpen; }
  exportCSV(): void { this.isExportOpen = false; this.reportExport.downloadCsv('logbook-harian.csv', ['Tanggal', 'Tugas', 'Kegiatan', 'Status'], this.logbooks.map(item => [item.tanggal || item.Tanggal, item.tugas || item.Tugas, item.deskripsi_kegiatan || item.DeskripsiKegiatan, item.status_logbook || item.StatusLogbook])); }
  exportExcel(): void { this.isExportOpen = false; this.reportExport.downloadExcel('logbook-harian.xls', ['Tanggal', 'Tugas', 'Kegiatan', 'Status'], this.logbooks.map(item => [item.tanggal || item.Tanggal, item.tugas || item.Tugas, item.deskripsi_kegiatan || item.DeskripsiKegiatan, item.status_logbook || item.StatusLogbook])); }
  exportJSON(): void { this.isExportOpen = false; this.reportExport.downloadJson('logbook-harian.json', this.logbooks); }
  exportPDF(): void { this.isExportOpen = false; this.reportExport.downloadPdf('logbook-harian.pdf', 'Riwayat Logbook Harian', this.reportDate(), this.exportHeaders(), this.exportRows()); }
  printReport(): void { this.isExportOpen = false; this.reportExport.printReport('Riwayat Logbook Harian', this.reportDate(), this.exportHeaders(), this.exportRows()); }
  private exportHeaders(): string[] { return ['Tanggal', 'Tugas', 'Kegiatan', 'Screenshot', 'Status', 'Catatan Manajer']; }
  private exportRows(): unknown[][] {
    return this.logbooks.map(item => [
      this.formatDate(item.tanggal || item.Tanggal || item.CreatedAt),
      item.tugas || item.Tugas || '-',
      item.deskripsi_kegiatan || item.DeskripsiKegiatan || item.kegiatan || item.Kegiatan || '-',
      this.attachmentLabel(item),
      item.status_logbook || item.StatusLogbook || 'draft',
      item.review_notes || item.ReviewNotes || '-'
    ]);
  }
  private attachmentLabel(item: any): string { const attachments = item.attachments || item.Attachments || []; return Array.isArray(attachments) && attachments.length ? `${attachments.length} screenshot` : '-'; }
  private formatDate(value: string | Date): string { const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value || '-') : new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date); }
  private reportDate(): string { return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date()); }
  private headers(): HttpHeaders { return new HttpHeaders().set('Authorization', `Bearer ${this.auth.getToken()}`); }
}
