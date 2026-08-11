import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { RouterLink } from '@angular/router';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';

@Component({
  selector: 'app-leave-approval',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule, RouterLink, AdminSidebarComponent],
  templateUrl: './leave-approval.component.html',
  styleUrls: ['./leave-approval.component.scss']
})
export class LeaveApprovalComponent implements OnInit, OnDestroy {
  leaveRequests: any[] = [];
  isLoading = true;
  errorMessage = '';
  selectedRequest: any = null;
  selectedType = '';
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

  loadLeaveRequests(): void {
    this.isLoading = true;
    const headers = this.getHeaders();
    const params = this.selectedType ? { params: { jenis_izin: this.selectedType }, headers } : { headers };
    this.http.get<any[]>(this.baseUrl, params).subscribe({
      next: (data) => {
        this.leaveRequests = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Gagal memuat data pengajuan';
        this.isLoading = false;
      }
    });
  }

  async updateStatus(id: number, status: string): Promise<void> {
    if (!await this.alert.confirm('Konfirmasi pengajuan', `Apakah Anda yakin ingin melakukan ${status} pengajuan ini?`, 'Ya, proses')) return;

    const headers = this.getHeaders();
    this.http.put<any>(`${this.baseUrl}/${id}/approve`, { status }, { headers }).subscribe({
      next: (res) => {
        this.alert.success(`Pengajuan berhasil di-${status.toLowerCase()}`);
        this.loadLeaveRequests(); // Reload
      },
      error: (err) => {
        this.alert.error('Gagal memperbarui status', err.error?.error || 'Unknown error');
      }
    });
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

  async updateStatusFromModal(id: number, status: string): Promise<void> {
    await this.updateStatus(id, status);
    if (this.selectedRequest && this.selectedRequest.ID === id) {
      this.closeDetail();
    }
  }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  logout(): void {
    this.authService.logout();
  }
}
