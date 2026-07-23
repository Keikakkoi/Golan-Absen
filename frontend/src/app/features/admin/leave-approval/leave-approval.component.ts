import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { RouterLink } from '@angular/router';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';

@Component({
  selector: 'app-leave-approval',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink, AdminSidebarComponent],
  templateUrl: './leave-approval.component.html',
  styleUrls: ['./leave-approval.component.scss']
})
export class LeaveApprovalComponent implements OnInit, OnDestroy {
  leaveRequests: any[] = [];
  isLoading = true;
  errorMessage = '';
  selectedRequest: any = null;
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
    this.http.get<any[]>(this.baseUrl, { headers }).subscribe({
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

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  logout(): void {
    this.authService.logout();
  }
}
