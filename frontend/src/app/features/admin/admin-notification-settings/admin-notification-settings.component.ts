import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';

interface NotificationSetting {
  TipeNotifikasi: string;
  Role: string;
  IsEmailEnabled: boolean;
  IsInAppEnabled: boolean;
}

interface NotificationRole {
  value: string;
  label: string;
  description: string;
  initials: string;
  icon: string;
}

@Component({
  selector: 'app-admin-notification-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AdminSidebarComponent],
  templateUrl: './admin-notification-settings.component.html',
  styleUrls: ['./admin-notification-settings.component.scss']
})
export class AdminNotificationSettingsComponent implements OnInit {
  settings: NotificationSetting[] = [];
  readonly roles: NotificationRole[] = [
    { value: 'HRD', label: 'HRD', description: 'Human Resources', initials: 'HR', icon: 'building' },
    { value: 'Karyawan', label: 'Karyawan', description: 'Pegawai', initials: 'K', icon: 'user' },
    { value: 'MAGANG', label: 'Magang', description: 'Peserta magang', initials: 'M', icon: 'graduation-cap' },
    { value: 'MANAJER', label: 'Manajer', description: 'Pemimpin tim', initials: 'MN', icon: 'users' }
  ];
  selectedRole = 'HRD';
  searchTerm = '';
  statusFilter: 'all' | 'active' | 'inactive' = 'all';
  private savedState = '';
  isLoading = true;
  isSaving = false;
  errorMessage = '';
  successMessage = '';
  isSending = false;
  broadcastError = '';
  broadcast = { judul: '', pesan: '', target_role: 'Karyawan' };

  private baseUrl = 'http://localhost:8080/api/v1/admin/settings/notifications';
  private broadcastUrl = 'http://localhost:8080/api/v1/admin/notifications/broadcast';

  constructor(private http: HttpClient, private authService: AuthService, private alert: AlertService) {}

  ngOnInit(): void {
    this.loadSettings();
  }

  get selectedRoleInfo(): NotificationRole {
    return this.roles.find(role => role.value === this.selectedRole) || this.roles[0];
  }

  get roleSettings(): NotificationSetting[] {
    return this.settings.filter(setting => setting.Role === this.selectedRole);
  }

  get visibleSettings(): NotificationSetting[] {
    const query = this.searchTerm.trim().toLowerCase();
    return this.roleSettings.filter(setting => {
      const matchesSearch = !query || `${setting.TipeNotifikasi} ${this.descriptionFor(setting.TipeNotifikasi)}`.toLowerCase().includes(query);
      const isActive = setting.IsEmailEnabled || setting.IsInAppEnabled;
      const matchesStatus = this.statusFilter === 'all' || (this.statusFilter === 'active' ? isActive : !isActive);
      return matchesSearch && matchesStatus;
    });
  }

  get activeCount(): number { return this.roleSettings.filter(setting => setting.IsEmailEnabled || setting.IsInAppEnabled).length; }
  get emailCount(): number { return this.roleSettings.filter(setting => setting.IsEmailEnabled).length; }
  get inAppCount(): number { return this.roleSettings.filter(setting => setting.IsInAppEnabled).length; }
  get hasUnsavedChanges(): boolean { return this.settingsState() !== this.savedState; }

  selectRole(role: string): void {
    this.selectedRole = role;
    this.searchTerm = '';
    this.statusFilter = 'all';
  }

  setAllChannels(enabled: boolean): void {
    this.roleSettings.forEach(setting => {
      setting.IsEmailEnabled = enabled;
      setting.IsInAppEnabled = enabled;
    });
  }

  descriptionFor(type: string): string {
    const descriptions: Record<string, string> = {
      'Info Admin': 'Informasi dan pengumuman penting dari admin.',
      'Kehadiran WFH': 'Pemberitahuan terkait kehadiran saat bekerja dari rumah.',
      'Keterlambatan': 'Pemberitahuan ketika terjadi keterlambatan kehadiran.',
      'Pengajuan Izin': 'Pengajuan izin yang membutuhkan perhatian HRD.',
      'Pengajuan Lokasi WFH': 'Permintaan perubahan atau pengajuan lokasi WFH.',
      'Jadwal Shift': 'Pembaruan jadwal shift dan jam kerja.',
      'Status Pengajuan': 'Pembaruan status pengajuan izin atau permintaan.',
      'Laporan Mingguan': 'Pengingat dan pembaruan laporan mingguan.',
      'Persetujuan Izin Tim': 'Permintaan persetujuan izin anggota tim.'
    };
    return descriptions[type] || 'Pemberitahuan aktivitas terbaru dalam sistem.';
  }

  async sendBroadcast(): Promise<void> {
    this.errorMessage = '';
    this.broadcastError = '';
    if (!this.broadcast.judul.trim() || !this.broadcast.pesan.trim()) {
      this.broadcastError = 'Judul dan pesan wajib diisi.';
      return;
    }
    if (!await this.alert.confirm('Kirim notifikasi?', 'Pesan akan muncul di dashboard penerima.')) return;
    this.isSending = true;
    this.http.post<any>(this.broadcastUrl, this.broadcast, { headers: this.getHeaders() }).subscribe({
      next: (result) => {
        this.isSending = false;
        this.broadcast = { judul: '', pesan: '', target_role: 'Karyawan' };
        this.alert.success(`Notifikasi terkirim ke ${result.recipient_count} penerima`);
      },
      error: (err) => {
        this.isSending = false;
        this.broadcastError = err.error?.error || `Gagal mengirim notifikasi (HTTP ${err.status || 'tidak diketahui'}).`;
        this.alert.error('Gagal mengirim notifikasi', this.broadcastError);
      }
    });
  }

  loadSettings(): void {
    this.errorMessage = '';
    const headers = this.getHeaders();
    if (!this.authService.getToken()) {
      this.errorMessage = 'Sesi login tidak ditemukan.';
      this.isLoading = false;
      return;
    }
    this.http.get<NotificationSetting[]>(this.baseUrl, { headers }).subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.settings = data;
        } else {
          this.settings = [];
        }
        this.savedState = this.settingsState();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load settings', err);
        this.errorMessage = err.error?.error || 'Gagal memuat pengaturan notifikasi.';
        this.isLoading = false;
      }
    });
  }

  async saveSettings(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';
    if (this.roleSettings.length === 0) {
      this.errorMessage = 'Tidak ada pengaturan yang dapat disimpan.';
      this.alert.info('Tidak ada perubahan', this.errorMessage);
      return;
    }
    if (!await this.alert.confirm('Simpan pengaturan notifikasi?', 'Perubahan pengaturan notifikasi akan diterapkan.')) return;
    this.isSaving = true;
    const headers = this.getHeaders();
    this.http.put<NotificationSetting[]>(this.baseUrl, this.roleSettings, { headers }).subscribe({
      next: (data) => {
        this.settings = data;
        this.savedState = this.settingsState();
        this.isSaving = false;
        this.successMessage = 'Pengaturan notifikasi berhasil disimpan.';
        this.alert.success('Pengaturan notifikasi disimpan');
      },
      error: (err) => {
        console.error('Failed to save settings', err);
        this.errorMessage = err.error?.error || 'Gagal menyimpan pengaturan.';
        this.isSaving = false;
        this.alert.error('Gagal menyimpan pengaturan', this.errorMessage);
      }
    });
  }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  private settingsState(): string {
    return JSON.stringify(this.settings.map(setting => ({
      role: setting.Role,
      type: setting.TipeNotifikasi,
      email: !!setting.IsEmailEnabled,
      inApp: !!setting.IsInAppEnabled
    })).sort((a, b) => `${a.role}-${a.type}`.localeCompare(`${b.role}-${b.type}`)));
  }
}
