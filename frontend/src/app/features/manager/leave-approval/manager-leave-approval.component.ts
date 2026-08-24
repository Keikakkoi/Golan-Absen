import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { SharedSidebarComponent } from '../../shared/shared-sidebar/shared-sidebar.component';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';
import { AlertService } from '../../../core/services/alert.service';

@Component({ selector: 'app-manager-leave-approval', standalone: true, imports: [CommonModule, FormsModule, DatePipe, SharedSidebarComponent, PaginationComponent], templateUrl: './manager-leave-approval.component.html', styleUrls: ['./manager-leave-approval.component.scss'] })
export class ManagerLeaveApprovalComponent implements OnInit {
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

  constructor(private http: HttpClient, private auth: AuthService, private alert: AlertService) {}

  ngOnInit(): void { this.load(); }

  load(resetPage = true): void {
    this.isLoading = true;
    this.error = '';
    if (resetPage) this.currentPage = 1;

    let params = new HttpParams();
    if (this.search.trim()) params = params.set('search', this.search.trim());
    if (this.status) params = params.set('status', this.status);
    this.http.get<any[]>('http://localhost:8080/api/v1/manager/leaves', { params, headers: this.headers() }).subscribe({
      next: data => {
        this.requests = Array.isArray(data) ? data : [];
        this.ensureValidPage();
        this.isLoading = false;
      },
      error: e => {
        this.requests = [];
        this.isLoading = false;
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
    this.http.put(`http://localhost:8080/api/v1/manager/leaves/${id}/approve`, { status: nextStatus, notes: this.notes[id] || '', rejection_reason: rejectionReason }, { headers: this.headers() }).subscribe({
      next: () => this.load(false),
      error: e => this.error = e.error?.error || 'Gagal memproses pengajuan'
    });
  }

  canDecide(request: any): boolean { return request?.Status === 'pending_manager_approval' || request?.Status === 'Pending'; }
  statusLabel(status: string): string {
    return ({pending_manager_approval: 'Menunggu Persetujuan Manajer', manager_approved: 'Disetujui Manajer', manager_rejected: 'Ditolak Manajer', pending_hrd_approval: 'Menunggu Persetujuan HRD', hrd_approved: 'Disetujui HRD', hrd_rejected: 'Ditolak HRD', Pending: 'Menunggu Persetujuan Manajer', Approved: 'Disetujui', Rejected: 'Ditolak'} as any)[status] || status || '-';
  }

  employeeName(request: any): string { return request?.Employee?.User?.Nama || request?.Employee?.User?.nama || '-'; }
  leaveType(request: any): string { return request?.JenisIzin || request?.jenis_izin || '-'; }
  reason(request: any): string { return request?.Alasan || request?.alasan || '-'; }
  rejectionReason(request: any): string { return request?.RejectionReason || request?.rejection_reason || '-'; }

  private ensureValidPage(): void {
    if (this.currentPage > this.totalPages()) this.currentPage = this.totalPages();
  }

  private keepPaginationVisible(): void {
    if (typeof window === 'undefined') return;
    requestAnimationFrame(() => this.paginationBar?.nativeElement.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' }));
  }

  private headers(): HttpHeaders { return new HttpHeaders().set('Authorization', `Bearer ${this.auth.getToken()}`); }
}
