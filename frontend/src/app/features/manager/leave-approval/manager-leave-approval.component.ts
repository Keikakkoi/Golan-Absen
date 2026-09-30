import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams, HttpContext } from '@angular/common/http';
import { finalize } from 'rxjs';
import { SKIP_PAGE_LOADING } from '../../../core/interceptors/page-loading-context';
import { AuthService } from '../../../core/services/auth.service';
import { SharedSidebarComponent } from '../../shared/shared-sidebar/shared-sidebar.component';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';
import { AlertService } from '../../../core/services/alert.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({ selector: 'app-manager-leave-approval', standalone: true, imports: [CommonModule, FormsModule, DatePipe, SharedSidebarComponent, PaginationComponent], templateUrl: './manager-leave-approval.component.html', styleUrls: ['./manager-leave-approval.component.scss'] })
export class ManagerLeaveApprovalComponent implements OnInit, OnDestroy {
  @ViewChild('paginationBar') paginationBar?: ElementRef<HTMLElement>;

  requests: any[] = [];
  notes: Record<number, string> = {};
  search = '';
  status = '';
  error = '';
  isLoading = false;
  pageSizeOptions = [10, 25, 50, 100];
  pageSize = 25;
  currentPage = 1;
  processingRequests: Record<number, boolean> = {};
  private refreshTimer?: ReturnType<typeof setInterval>;
  private realtimeRefreshTimer?: ReturnType<typeof setTimeout>;
  private disconnectRealtime?: () => void;
  private requestInFlight = false;
  private refreshPending = false;
  private destroyed = false;

  constructor(private http: HttpClient, private auth: AuthService, private alert: AlertService, private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.load();
    this.refreshTimer = setInterval(() => this.load(false, true), 30_000);
    this.disconnectRealtime = this.notificationService.connectRealtime(eventName => {
      if (['leave_request_created', 'leave_status_updated', 'leave_note_updated'].includes(eventName)) this.scheduleRealtimeRefresh();
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    if (this.realtimeRefreshTimer) clearTimeout(this.realtimeRefreshTimer);
    this.disconnectRealtime?.();
  }

  load(resetPage = true, background = false): void {
    if (this.destroyed) return;
    if (this.requestInFlight) {
      if (background) this.refreshPending = true;
      return;
    }
    if (!background) this.isLoading = true;
    this.error = '';
    if (resetPage) this.currentPage = 1;

    let params = new HttpParams();
    if (this.search.trim()) params = params.set('search', this.search.trim());
    if (this.status) params = params.set('status', this.status);
    const context = new HttpContext().set(SKIP_PAGE_LOADING, background);
    this.requestInFlight = true;
    this.http.get<any[]>('http://localhost:8080/api/v1/manager/leaves', { params, headers: this.headers(), context }).pipe(finalize(() => {
      this.requestInFlight = false;
      if (this.refreshPending && !this.destroyed) {
        this.refreshPending = false;
        this.scheduleRealtimeRefresh();
      }
    })).subscribe({
      next: data => {
        this.requests = Array.isArray(data) ? data : [];
        this.requests.forEach(request => {
          if (!Object.prototype.hasOwnProperty.call(this.notes, request.ID)) this.notes[request.ID] = request.manager_notes || request.ManagerNotes || '';
        });
        this.ensureValidPage();
        if (!background) this.isLoading = false;
      },
      error: e => {
        if (!background) this.isLoading = false;
        this.error = 'Gagal memuat pengajuan tim: ' + (e.error?.error || 'Unknown error');
      }
    });
  }

  get displayedRequests(): any[] {
    return this.requests.slice(this.paginationStartIndex, this.paginationEndIndex);
  }

  get paginationStartIndex(): number {
    return this.requests.length === 0 ? 0 : (this.currentPage - 1) * this.pageSize;
  }

  get paginationEndIndex(): number {
    return Math.min(this.paginationStartIndex + this.pageSize, this.requests.length);
  }

  pageChanged(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.currentPage) return;
    this.currentPage = page;
    this.keepPaginationVisible();
  }

  pageSizeChanged(size: number): void {
    this.pageSize = Number(size) || 25;
    this.currentPage = 1;
  }

  totalPages(): number { return Math.max(1, Math.ceil(this.requests.length / this.pageSize)); }

  async decide(id: number, nextStatus: 'Approved' | 'Rejected'): Promise<void> {
    let rejectionReason = '';
    if (nextStatus === 'Rejected') {
      const reason = await this.alert.textarea('Alasan Penolakan', 'Tuliskan alasan penolakan pengajuan ini.', 'Lanjutkan Penolakan', 'Alasan Penolakan');
      if (reason === null) return;
      rejectionReason = reason;
    } else if (!await this.alert.confirm('Konfirmasi pengajuan', 'Apakah Anda yakin ingin menyetujui pengajuan ini?', 'Ya, setujui')) return;
    if (this.processingRequests[id]) return;
    this.processingRequests[id] = true;
    this.http.put(`http://localhost:8080/api/v1/manager/leaves/${id}/approve`, { status: nextStatus, catatan: this.notes[id] || '', notes: this.notes[id] || '', rejection_reason: rejectionReason }, { headers: this.headers() }).subscribe({
      next: () => { this.alert.success(`Pengajuan berhasil di-${nextStatus === 'Approved' ? 'setujui' : 'tolak'}`); this.load(false, true); },
      complete: () => delete this.processingRequests[id],
      error: e => { delete this.processingRequests[id]; this.error = e.error?.error || 'Gagal memproses pengajuan'; }
    });
  }

  canDecide(request: any): boolean { return request?.Status === 'pending_manager_approval' || request?.Status === 'Pending'; }
  approverLabel(request: any): string {
    const approver = request?.AssignedApprover || request?.assigned_approver;
    return approver?.Nama || (request?.AssignedApproverRole === 'HRD' ? 'HRD' : 'Manajer utama');
  }
  statusLabel(status: string): string {
    return ({pending_manager_approval: 'Menunggu Persetujuan Manajer', manager_approved: 'Disetujui Manajer', manager_rejected: 'Ditolak Manajer', pending_hrd_approval: 'Menunggu Persetujuan HRD', hrd_approved: 'Disetujui HRD', hrd_rejected: 'Ditolak HRD', Pending: 'Menunggu Persetujuan Manajer', Approved: 'Disetujui', Rejected: 'Ditolak'} as any)[status] || status || '-';
  }

  saveNote(id: number): void {
    this.http.put(`http://localhost:8080/api/v1/manager/leaves/${id}/note`, { catatan: this.notes[id] || '' }, { headers: this.headers() }).subscribe({
      next: () => { this.alert.success('Catatan berhasil disimpan'); this.load(false, true); },
      error: e => this.error = e.error?.error || 'Gagal menyimpan catatan'
    });
  }

  isProcessing(id: number): boolean { return !!this.processingRequests[id]; }

  private scheduleRealtimeRefresh(): void {
    if (this.destroyed) return;
    if (this.realtimeRefreshTimer) clearTimeout(this.realtimeRefreshTimer);
    this.realtimeRefreshTimer = setTimeout(() => {
      this.realtimeRefreshTimer = undefined;
      this.load(false, true);
    }, 200);
  }

  employeeName(request: any): string { return request?.Employee?.User?.Nama || request?.Employee?.User?.nama || '-'; }
  leaveType(request: any): string { return request?.JenisIzin || request?.jenis_izin || '-'; }
  reason(request: any): string { return request?.Alasan || request?.alasan || '-'; }
  rejectionReason(request: any): string { return request?.RejectionReason || request?.rejection_reason || '-'; }
  adminNote(request: any): string { return request?.admin_notes || request?.AdminNotes || '-'; }
  note(request: any): string { return request?.manager_notes || request?.ManagerNotes || '-'; }
  displayAdminNote(request: any): string {
    const note = request?.admin_notes || request?.AdminNotes;
    return String(note || '').trim() ? `Catatan Admin: ${String(note).trim()}` : '-';
  }
  displayManagerNote(request: any): string {
    const note = request?.manager_notes || request?.ManagerNotes;
    return String(note || '').trim() ? `Catatan Manajer: ${String(note).trim()}` : '-';
  }

  private ensureValidPage(): void {
    if (this.currentPage > this.totalPages()) this.currentPage = this.totalPages();
  }

  private keepPaginationVisible(): void {
    if (typeof window === 'undefined') return;
    requestAnimationFrame(() => this.paginationBar?.nativeElement.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' }));
  }

  private headers(): HttpHeaders { return new HttpHeaders().set('Authorization', `Bearer ${this.auth.getToken()}`); }
}
