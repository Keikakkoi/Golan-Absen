import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';

@Component({
  selector: 'app-admin-notification-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminSidebarComponent],
  templateUrl: './admin-notification-settings.component.html',
  styleUrls: ['./admin-notification-settings.component.scss']
})
export class AdminNotificationSettingsComponent implements OnInit {
  settings: any[] = [];
  isLoading = true;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  private baseUrl = 'http://localhost:8080/api/v1/admin/settings/notifications';

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.errorMessage = '';
    const headers = this.getHeaders();
    if (!this.authService.getToken()) {
      this.errorMessage = 'Sesi login tidak ditemukan.';
      this.isLoading = false;
      return;
    }
    this.http.get<any[]>(this.baseUrl, { headers }).subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.settings = data;
        } else {
          this.settings = [];
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load settings', err);
        this.errorMessage = err.error?.error || 'Gagal memuat pengaturan notifikasi.';
        this.isLoading = false;
      }
    });
  }

  saveSettings(): void {
    this.errorMessage = '';
    this.successMessage = '';
    if (this.settings.length === 0) {
      this.errorMessage = 'Tidak ada pengaturan yang dapat disimpan.';
      return;
    }
    this.isSaving = true;
    const headers = this.getHeaders();
    this.http.put<any[]>(this.baseUrl, this.settings, { headers }).subscribe({
      next: (data) => {
        this.settings = data;
        this.isSaving = false;
        this.successMessage = 'Pengaturan notifikasi berhasil disimpan.';
      },
      error: (err) => {
        console.error('Failed to save settings', err);
        this.errorMessage = err.error?.error || 'Gagal menyimpan pengaturan.';
        this.isSaving = false;
      }
    });
  }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }
}
