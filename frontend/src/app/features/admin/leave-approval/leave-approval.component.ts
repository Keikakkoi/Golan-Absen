import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { HttpContext } from '@angular/common/http';
import { finalize } from 'rxjs';
import { SKIP_PAGE_LOADING } from '../../../core/interceptors/page-loading-context';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { ReportExportService } from '../../../core/services/report-export.service';
import { RouterLink } from '@angular/router';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-leave-approval',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule, RouterLink, AdminSidebarComponent, PaginationComponent],
  templateUrl: './leave-approval.component.html',
  styleUrls: ['./leave-approval.component.scss']
})
export class LeaveApprovalComponent implements OnInit, OnDestroy {
  leaveRequests: any[] = [];
  pageSize = 25;
  currentPage = 1;
  isLoading = true;
  errorMessage = '';
  selectedRequest: any = null;
  adminNotes: Record<number, string> = {};
  processingRequests: Record<number, boolean> = {};
  selectedType = '';
  selectedStatus = '';
  isExportOpen = false;
  private refreshTimer?: ReturnType<typeof setInterval>;
  private realtimeRefreshTimer?: ReturnType<typeof setTimeout>;
  private disconnectRealtime?: () => void;
  private requestInFlight = false;
  private refreshPending = false;
  private destroyed = false;

  private baseUrl = 'http://localhost:8080/api/v1/admin/leave';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private alert: AlertService,
    private reportExport: ReportExportService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadLeaveRequests();
    this.refreshTimer = setInterval(() => this.loadLeaveRequests(false, true), 30_000);
    this.disconnectRealtime = this.notificationService.connectRealtime(eventName => {
      if (['leave_request_created', 'leave_status_updated', 'leave_note_updated'].includes(eventName)) this.scheduleRealtimeRefresh();
    });
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.destroyed = true;
    if (this.realtimeRefreshTimer) clearTimeout(this.realtimeRefreshTimer);
    this.disconnectRealtime?.();
    this.disconnectRealtime = undefined;
  }

  loadLeaveRequests(resetPage = true, background = false): void {
    if (this.destroyed) return;
    if (this.requestInFlight) {
      if (background) this.refreshPending = true;
      return;
    }
    if (resetPage) this.currentPage = 1;
    if (!background) this.isLoading = true;
    this.errorMessage = '';
    this.requestInFlight = true;
    const headers = this.getHeaders();
    const requestParams: Record<string, string> = {};
    if (this.selectedType) requestParams['jenis_izin'] = this.selectedType;
    if (this.selectedStatus) requestParams['status'] = this.selectedStatus;
    const params = Object.keys(requestParams).length ? { params: requestParams, headers } : { headers };
    const context = new HttpContext().set(SKIP_PAGE_LOADING, background);
    this.http.get<any[]>(this.baseUrl, { ...params, context }).pipe(finalize(() => {
      this.requestInFlight = false;
      if (this.refreshPending && !this.destroyed) {
        this.refreshPending = false;
        this.scheduleRealtimeRefresh();
      }
    })).subscribe({
      next: (data) => {
        // The API returns one row per leave_requests.id. Keep the UI stable
        // even if an older proxy/cache accidentally repeats a row.
        const unique = new Map<number, any>();
        (Array.isArray(data) ? data : []).forEach(request => {
          if (request?.ID != null && !unique.has(request.ID)) unique.set(request.ID, request);
        });
        this.leaveRequests = Array.from(unique.values());
        this.leaveRequests.forEach(request => {
          const note = this.adminNote(request) === '-' ? '' : this.adminNote(request);
          if (!Object.prototype.hasOwnProperty.call(this.adminNotes, request.ID)) this.adminNotes[request.ID] = note;
        });
        if (this.selectedRequest) this.selectedRequest = this.leaveRequests.find(request => request.ID === this.selectedRequest.ID) || this.selectedRequest;
        this.ensureValidPage();
        if (!background) this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Gagal memuat data pengajuan';
        if (!background) this.isLoading = false;
      }
    });
  }

  get paginationStartIndex(): number {
    return this.leaveRequests.length === 0 ? 0 : (this.currentPage - 1) * this.pageSize;
  }

  get paginationEndIndex(): number {
    return Math.min(this.paginationStartIndex + this.pageSize, this.leaveRequests.length);
  }

  get displayedLeaveRequests(): any[] {
    return this.leaveRequests.slice(this.paginationStartIndex, this.paginationEndIndex);
  }

  goToPage(page: number): void {
    const totalPages = Math.max(1, Math.ceil(this.leaveRequests.length / this.pageSize));
    this.currentPage = Math.min(Math.max(page, 1), totalPages);
  }

  onPageSizeChange(size: number): void {
    this.pageSize = Number(size) || 25;
    this.currentPage = 1;
  }

  private ensureValidPage(): void {
    const totalPages = Math.max(1, Math.ceil(this.leaveRequests.length / this.pageSize));
    this.currentPage = Math.min(Math.max(this.currentPage, 1), totalPages);
  }

  async updateStatus(id: number, status: string): Promise<void> {
    if (this.processingRequests[id]) return;
    let rejectionReason = '';
    if (status === 'Rejected') {
      const reason = await this.alert.textarea('Alasan Penolakan', 'Tuliskan alasan penolakan pengajuan ini.', 'Lanjutkan Penolakan', 'Alasan Penolakan');
      if (reason === null) return;
      rejectionReason = reason;
    } else if (!await this.alert.confirm('Konfirmasi pengajuan', `Apakah Anda yakin ingin melakukan ${status} pengajuan ini?`, 'Ya, proses')) return;

    this.processingRequests[id] = true;
    const headers = this.getHeaders();
    this.http.put<any>(`${this.baseUrl}/${id}/approve`, {
      status,
      catatan: this.adminNotes[id] || '',
      notes: this.adminNotes[id] || '',
      rejection_reason: rejectionReason
    }, { headers }).subscribe({
      next: (res) => {
        this.alert.success(`Pengajuan berhasil di-${status.toLowerCase()}`);
        this.loadLeaveRequests(false, true); // Background refresh while preserving the active page.
      },
      error: (err) => {
        delete this.processingRequests[id];
        this.alert.error('Gagal memperbarui status', err.error?.error || 'Unknown error');
      },
      complete: () => {
        delete this.processingRequests[id];
      }
    });
  }

  private scheduleRealtimeRefresh(): void {
    if (this.destroyed) return;
    if (this.realtimeRefreshTimer) clearTimeout(this.realtimeRefreshTimer);
    this.realtimeRefreshTimer = setTimeout(() => {
      this.realtimeRefreshTimer = undefined;
      this.loadLeaveRequests(false, true);
    }, 200);
  }

  canAddAdminNote(request: any): boolean {
    return request?.Status === 'pending_hrd_approval';
  }

  isProcessing(id: number): boolean { return !!this.processingRequests[id]; }

  managerNote(request: any): string { return request?.ManagerNotes || request?.manager_notes || '-'; }
  adminNote(request: any): string {
    const adminNote = request?.AdminNotes || request?.admin_notes;
    const managerNote = request?.ManagerNotes || request?.manager_notes;
    // An explicit admin_notes value is authoritative, even when its text is
    // identical to the manager's note. Comparing the text would hide a real
    // admin note merely because both reviewers wrote the same sentence.
    if (adminNote) return adminNote;
    const legacyNote = request?.Notes || request?.notes || request?.catatan || request?.Catatan;
    // Older records used one shared field. Do not show the same manager note
    // a second time as an admin note.
    return legacyNote && legacyNote !== managerNote ? legacyNote : '-';
  }
  displayAdminNote(request: any): string {
    const note = this.adminNote(request);
    return note === '-' ? '-' : `Catatan Admin: ${note}`;
  }
  displayManagerNote(request: any): string {
    const note = this.managerNote(request);
    return note === '-' ? '-' : `Catatan Manajer: ${note}`;
  }

  rejectionSource(request: any): string {
    const status = request?.Status || '';
    return status === 'manager_rejected' ? 'Ditolak Manajer' : status === 'hrd_rejected' ? 'Ditolak Admin' : '';
  }

  isManagerRequest(request: any): boolean { return request?.Employee?.User?.Role === 'MANAJER' || request?.Employee?.User?.role === 'MANAJER'; }
  canDecide(request: any): boolean { return request?.Status === 'pending_hrd_approval'; }
  approverLabel(request: any): string {
    const approver = request?.AssignedApprover || request?.assigned_approver;
    return approver?.Nama || (request?.AssignedApproverRole === 'HRD' ? 'HRD' : request?.Status === 'pending_manager_approval' ? 'Manajer utama' : '—');
  }
  statusLabel(status: string): string {
    return ({
      pending_manager_approval: 'Menunggu Persetujuan Manajer',
      manager_approved: 'Disetujui Manajer',
      manager_rejected: 'Ditolak',
      pending_hrd_approval: 'Menunggu Persetujuan Admin',
      hrd_approved: 'Disetujui',
      hrd_rejected: 'Ditolak',
      Pending: 'Menunggu Persetujuan Manajer',
      Approved: 'Disetujui',
      Rejected: 'Ditolak',
      Cancelled: 'Dibatalkan'
    } as any)[status] || status || '-';
  }

  openDetail(request: any): void { this.selectedRequest = request; }
  closeDetail(): void { this.selectedRequest = null; }

  toggleExportDropdown(): void { this.isExportOpen = !this.isExportOpen; }
  private exportHeaders = ['Nama Karyawan', 'NIK', 'Approver', 'Jenis', 'Tanggal Mulai', 'Tanggal Selesai', 'Alasan', 'Catatan Admin', 'Catatan Manajer', 'Status'];
  private exportRows(): unknown[][] {
    return this.leaveRequests.map(req => [
      req.Employee?.User?.Nama || 'Nama Tidak Tersedia', req.Employee?.NIK || '-', this.approverLabel(req), req.JenisIzin || '-',
      req.TanggalMulai || '-', req.TanggalSelesai || '-', req.Alasan || '-', this.adminNote(req), this.managerNote(req), this.statusLabel(req.Status)
    ]);
  }
  exportCSV(): void { this.isExportOpen = false; this.reportExport.downloadCsv('laporan-approval-izin-cuti.csv', this.exportHeaders, this.exportRows()); }
  exportExcel(): void { this.isExportOpen = false; this.reportExport.downloadExcel('laporan-approval-izin-cuti.xls', this.exportHeaders, this.exportRows()); }
  exportJSON(): void { this.isExportOpen = false; this.reportExport.downloadJson('laporan-approval-izin-cuti.json', this.leaveRequests); }
  exportPDF(): void { this.isExportOpen = false; void this.reportExport.downloadPdf('laporan-approval-izin-cuti.pdf', 'Laporan Approval Izin & Cuti', this.exportDate(), this.exportHeaders, this.exportRows()); }
  printReport(): void { this.isExportOpen = false; this.reportExport.printReport('Laporan Approval Izin & Cuti', this.exportDate(), this.exportHeaders, this.exportRows()); }
  private exportDate(): string { return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeZone: 'Asia/Jakarta' }).format(new Date()); }

  getDurationDays(start: string | Date, end: string | Date): number {
    if (!start || !end) return 0;
    const d1 = new Date(start);
    const d2 = new Date(end);
    const timeDiff = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
  }

  getInitials(name?: string): string {
    if (!name) return 'K';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  isImageAttachment(url?: string): boolean {
    if (!url) return false;
    const cleanUrl = url.split('?')[0].toLowerCase();
    return cleanUrl.endsWith('.png') || cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg') || cleanUrl.endsWith('.webp') || cleanUrl.endsWith('.gif');
  }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  logout(): void {
    this.authService.logout();
  }
}
