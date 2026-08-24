import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { RouterLink } from '@angular/router';
import { SharedSidebarComponent } from '../../shared/shared-sidebar/shared-sidebar.component';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';
import { FilePreviewComponent } from '../../../shared/file-preview/file-preview.component';

@Component({
  selector: 'app-leave-request',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, RouterLink, SharedSidebarComponent, PaginationComponent, FilePreviewComponent],
  templateUrl: './leave-request.component.html',
  styleUrls: ['./leave-request.component.scss']
})
export class LeaveRequestComponent implements OnInit, OnDestroy {
  isIntern = false;
  leaveTypes: string[] = ['Sakit', 'Lainnya'];
  canRequestCuti = false;
  minimumMasaKerjaCutiBulan = 3;
  tanggalCutiTersedia = '';
  leaveRequests: any[] = [];
  isLoading = true;
  isSubmitting = false;
  page = 1;
  pageSize = 25;
  get displayedLeaveRequests(): any[] { return this.leaveRequests.slice((this.page - 1) * this.pageSize, this.page * this.pageSize); }
  pageChanged(page: number): void { this.page = page; }
  pageSizeChanged(size: number): void { this.pageSize = size; this.page = 1; }

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

  statusLabel(status: string): string {
    return ({pending_manager_approval: 'Menunggu Persetujuan Manajer', manager_approved: 'Disetujui Manajer', manager_rejected: 'Ditolak Manajer', pending_hrd_approval: 'Menunggu Persetujuan HRD', hrd_approved: 'Disetujui HRD', hrd_rejected: 'Ditolak HRD', Pending: 'Menunggu Persetujuan Manajer', Approved: 'Disetujui', Rejected: 'Ditolak', Cancelled: 'Dibatalkan'} as any)[status] || status || '-';
  }

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
    this.isIntern = this.authService.getRole() === 'MAGANG';
    this.loadLeavePolicy();
    this.loadMyLeaves();
    this.refreshTimer = setInterval(() => this.loadMyLeaves(), 30_000);
    this.connectLiveUpdates();
  }

  private loadLeavePolicy(): void {
    this.http.get<any>(`${this.baseUrl}/policy`, { headers: this.getHeaders() }).subscribe({
      next: policy => {
        this.leaveTypes = policy.leave_types || ['Sakit', 'Lainnya'];
        this.canRequestCuti = !!policy.can_request_cuti;
        this.minimumMasaKerjaCutiBulan = policy.minimum_masa_kerja_cuti_bulan || 3;
        this.tanggalCutiTersedia = policy.tanggal_cuti_tersedia || '';
        if (!this.leaveTypes.includes(this.formData.jenis_izin)) this.formData.jenis_izin = this.leaveTypes[0] || 'Sakit';
      }
    });
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
        if (message.event === 'leave_status_updated') { this.loadMyLeaves(); this.loadLeavePolicy(); }
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
        this.page = 1;
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

  onAttachmentChange(files: File[]): void { this.selectedFile = files[0] || null; }

  private isValidAttachment(file: File): boolean {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    return allowedTypes.includes(file.type.toLowerCase()) && file.size <= 10 * 1024 * 1024;
  }

  async submitRequest(): Promise<void> {
    if (!this.formData.tanggal_mulai || !this.formData.tanggal_selesai || !this.formData.alasan.trim()) {
      this.errorMessage = 'Jenis, tanggal, dan alasan pengajuan wajib diisi.';
      return;
    }
    if (!this.selectedFile) {
      this.errorMessage = 'Lampiran dokumen wajib diunggah sebelum mengirim pengajuan.';
      return;
    }
    if (!this.isValidAttachment(this.selectedFile)) {
      this.errorMessage = 'Lampiran harus berupa JPG, PNG, WEBP, atau PDF dengan ukuran maksimal 10 MB.';
      return;
    }
    if (this.formData.tanggal_mulai < this.getJakartaDateString()) {
      this.errorMessage = 'Tanggal mulai tidak boleh kurang dari hari ini';
      return;
    }
    if (this.formData.tanggal_selesai < this.formData.tanggal_mulai) {
      this.errorMessage = 'Tanggal selesai tidak boleh lebih awal dari tanggal mulai.';
      return;
    }
    if (this.formData.tanggal_mulai.slice(0, 4) !== this.formData.tanggal_selesai.slice(0, 4)) {
      this.errorMessage = 'Periode pengajuan harus berada dalam tahun yang sama.';
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
        this.loadLeavePolicy();
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

  cancelRequest(request: any): void {
    if (request.Status !== 'Pending' && request.Status !== 'Approved') return;
    if (!confirm('Batalkan pengajuan ini? Kuota akan dikembalikan.')) return;
    this.http.delete<any>(`${this.baseUrl}/${request.ID}/cancel`, { headers: this.getHeaders() }).subscribe({
      next: () => { this.loadMyLeaves(); this.loadLeavePolicy(); },
      error: err => { this.alert.error('Gagal membatalkan pengajuan', err.error?.error || 'Gagal membatalkan pengajuan'); }
    });
  }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  private getJakartaDateString(): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values['year']}-${values['month']}-${values['day']}`;
  }
}
