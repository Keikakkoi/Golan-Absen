import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { RouterLink } from '@angular/router';
import { SharedSidebarComponent } from '../../shared/shared-sidebar/shared-sidebar.component';

@Component({
  selector: 'app-leave-request',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, RouterLink, SharedSidebarComponent],
  templateUrl: './leave-request.component.html',
  styleUrls: ['./leave-request.component.scss']
})
export class LeaveRequestComponent implements OnInit, OnDestroy {
  leaveRequests: any[] = [];
  isLoading = true;
  isSubmitting = false;

  formData = {
    jenis_izin: 'Sakit',
    tanggal_mulai: '',
    tanggal_selesai: '',
    alasan: ''
  };
  selectedFile: File | null = null;
  errorMessage = '';
  successMessage = '';
  
  selectedLeave: any = null;
  private refreshTimer?: ReturnType<typeof setInterval>;
  private socket?: WebSocket;
  private destroyed = false;

  private baseUrl = 'http://localhost:8080/api/v1/leave';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private alert: AlertService
  ) {}

  openDetail(leave: any): void {
    this.selectedLeave = leave;
  }

  closeDetail(): void {
    this.selectedLeave = null;
  }

  ngOnInit(): void {
    this.loadMyLeaves();
    this.refreshTimer = setInterval(() => this.loadMyLeaves(), 30_000);
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
        if (message.event === 'leave_status_updated') this.loadMyLeaves();
      } catch { /* Ignore malformed broadcast messages. */ }
    };
    this.socket.onclose = () => {
      if (!this.destroyed) setTimeout(() => this.connectLiveUpdates(), 3_000);
    };
  }

  loadMyLeaves(): void {
    const headers = this.getHeaders();
    this.http.get<any[]>(this.baseUrl, { headers }).subscribe({
      next: (data) => {
        this.leaveRequests = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Gagal memuat data izin';
        this.isLoading = false;
      }
    });
  }

  onFileSelected(event: any): void {
    if (event.target.files.length > 0) {
      this.selectedFile = event.target.files[0];
    }
  }

  async submitRequest(): Promise<void> {
    if (!this.formData.tanggal_mulai || !this.formData.tanggal_selesai || !this.formData.alasan.trim()) {
      this.errorMessage = 'Jenis, tanggal, dan alasan pengajuan wajib diisi.';
      return;
    }
    if (this.formData.tanggal_selesai < this.formData.tanggal_mulai) {
      this.errorMessage = 'Tanggal selesai tidak boleh lebih awal dari tanggal mulai.';
      return;
    }

    if (!await this.alert.confirm('Kirim pengajuan izin?', 'Pengajuan akan dikirim ke HRD untuk diproses.')) return;

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const fd = new FormData();
    fd.append('jenis_izin', this.formData.jenis_izin);
    fd.append('tanggal_mulai', this.formData.tanggal_mulai);
    fd.append('tanggal_selesai', this.formData.tanggal_selesai);
    fd.append('alasan', this.formData.alasan);
    
    if (this.selectedFile) {
      fd.append('lampiran', this.selectedFile);
    }

    const headers = this.getHeaders();
    this.http.post<any>(this.baseUrl, fd, { headers }).subscribe({
      next: (res) => {
        this.successMessage = 'Pengajuan izin berhasil dikirim!';
        this.isSubmitting = false;
        this.resetForm();
        this.loadMyLeaves(); // Reload table
        this.alert.success('Pengajuan izin berhasil dikirim');
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Gagal mengirim pengajuan';
        this.isSubmitting = false;
        this.alert.error('Gagal mengirim pengajuan', this.errorMessage);
      }
    });
  }

  resetForm(): void {
    this.formData = {
      jenis_izin: 'Sakit',
      tanggal_mulai: '',
      tanggal_selesai: '',
      alasan: ''
    };
    this.selectedFile = null;
  }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }
}
