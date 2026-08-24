import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { RouterLink } from '@angular/router';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';

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
  selectedType = '';
  selectedStatus = '';
  private refreshTimer?: ReturnType<typeof setInterval>;
  private socket?: WebSocket;
  private destroyed = false;

  private baseUrl = 'http://localhost:8080/api/v1/admin/leave';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private alert: AlertService
  ) {}

  ngOnInit(): void {
    this.loadLeaveRequests();
    this.refreshTimer = setInterval(() => this.loadLeaveRequests(), 30_000);
    this.connectLiveUpdates();
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.destroyed = true;
    this.socket?.close();
  }

  private connectLiveUpdates(): void {
    this.socket = new WebSocket('ws://localhost:8080/ws/dashboard');
    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.event === 'leave_request_created' || message.event === 'leave_status_updated') this.loadLeaveRequests();
      } catch { /* Ignore malformed broadcast messages. */ }
    };
    this.socket.onclose = () => {
      if (!this.destroyed) setTimeout(() => this.connectLiveUpdates(), 3_000);
    };
  }

  loadLeaveRequests(resetPage = true): void {
    if (resetPage) this.currentPage = 1;
    this.isLoading = true;
    const headers = this.getHeaders();
    const requestParams: Record<string, string> = {};
    if (this.selectedType) requestParams['jenis_izin'] = this.selectedType;
    if (this.selectedStatus) requestParams['status'] = this.selectedStatus;
    const params = Object.keys(requestParams).length ? { params: requestParams, headers } : { headers };
    this.http.get<any[]>(this.baseUrl, params).subscribe({
      next: (data) => {
        // The API returns one row per leave_requests.id. Keep the UI stable
        // even if an older proxy/cache accidentally repeats a row.
        const unique = new Map<number, any>();
        (Array.isArray(data) ? data : []).forEach(request => {
          if (request?.ID != null && !unique.has(request.ID)) unique.set(request.ID, request);
        });
        this.leaveRequests = Array.from(unique.values());
        this.ensureValidPage();
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Gagal memuat data pengajuan';
        this.isLoading = false;
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
    let rejectionReason = '';
    if (status === 'Rejected') {
      const reason = await this.alert.textarea('Alasan Penolakan', 'Tuliskan alasan penolakan pengajuan ini.', 'Lanjutkan Penolakan', 'Alasan Penolakan');
      if (reason === null) return;
      rejectionReason = reason;
    } else if (!await this.alert.confirm('Konfirmasi pengajuan', `Apakah Anda yakin ingin melakukan ${status} pengajuan ini?`, 'Ya, proses')) return;

    const headers = this.getHeaders();
    this.http.put<any>(`${this.baseUrl}/${id}/approve`, { status, rejection_reason: rejectionReason }, { headers }).subscribe({
      next: (res) => {
        this.alert.success(`Pengajuan berhasil di-${status.toLowerCase()}`);
        this.loadLeaveRequests(false); // Reload while preserving the active page when possible
      },
      error: (err) => {
        this.alert.error('Gagal memperbarui status', err.error?.error || 'Unknown error');
      }
    });
  }

  isManagerRequest(request: any): boolean { return request?.Employee?.User?.Role === 'MANAJER' || request?.Employee?.User?.role === 'MANAJER'; }
  canDecide(request: any): boolean { return this.isManagerRequest(request) && request?.Status === 'pending_hrd_approval'; }
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
