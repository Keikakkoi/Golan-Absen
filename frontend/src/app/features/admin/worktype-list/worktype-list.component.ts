import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { FormsModule } from '@angular/forms';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';

@Component({
  selector: 'app-worktype-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, AdminSidebarComponent],
  templateUrl: './worktype-list.component.html',
  styleUrls: ['./worktype-list.component.scss']
})
export class WorktypeListComponent implements OnInit {
  @Input() embedded = false;

  workTypes: any[] = [];
  isLoading = true;
  errorMessage = '';

  isModalOpen = false;
  isEditMode = false;
  isSaving = false;

  formData: any = {
    id: null,
    Nama: '',
    RadiusYangBerlaku: 'kantor'
  };

  private baseUrl = 'http://localhost:8080/api/v1/admin/worktypes';
  private publicUrl = 'http://localhost:8080/api/v1/worktypes';

  constructor(private http: HttpClient, private authService: AuthService, private alert: AlertService) {}

  ngOnInit(): void {
    this.loadWorkTypes();
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
  }

  loadWorkTypes(): void {
    this.isLoading = true;
    this.http.get<any[]>(this.baseUrl, { headers: this.getHeaders() }).subscribe({
      next: (data) => {
        this.workTypes = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Gagal memuat tipe kerja: ' + (err.error?.error || 'Unknown error');
        this.isLoading = false;
      }
    });
  }

  openAddModal(): void {
    this.isEditMode = false;
    this.formData = { id: null, Nama: '', RadiusYangBerlaku: 'kantor' };
    this.isModalOpen = true;
  }

  openEditModal(wt: any): void {
    this.isEditMode = true;
    this.formData = {
      id: wt.ID,
      Nama: wt.Nama,
      RadiusYangBerlaku: this.validationMode(wt)
    };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  async saveWorkType(): Promise<void> {
    if (!this.formData.Nama?.trim()) {
      await this.alert.error('Data belum lengkap', 'Nama tipe kerja wajib diisi.');
      return;
    }
    if (!this.formData.RadiusYangBerlaku) {
      await this.alert.error('Data belum lengkap', 'Mode validasi lokasi wajib dipilih.');
      return;
    }
    const action = this.isEditMode ? 'mengubah tipe kerja ini' : 'menyimpan tipe kerja baru';
    if (!await this.alert.confirm('Konfirmasi perubahan', `Apakah Anda yakin ingin ${action}?`)) return;
    this.isSaving = true;
    const body = {
      Nama: this.formData.Nama.trim(),
      RadiusYangBerlaku: this.formData.RadiusYangBerlaku
    };

    const req = this.isEditMode 
      ? this.http.put(`${this.baseUrl}/${this.formData.id}`, body, { headers: this.getHeaders() })
      : this.http.post(this.baseUrl, body, { headers: this.getHeaders() });

    req.subscribe({
      next: () => {
        this.isSaving = false;
        this.closeModal();
        this.loadWorkTypes();
        this.alert.success(this.isEditMode ? 'Tipe kerja diperbarui' : 'Tipe kerja disimpan');
      },
      error: (err) => {
        this.alert.error('Gagal menyimpan tipe kerja', err.error?.error || 'Gagal menyimpan');
        this.isSaving = false;
      }
    });
  }

  validationMode(workType: any): string {
    const configured = String(workType?.RadiusYangBerlaku || '').trim().toLowerCase();
    if (configured === 'rumah' || configured === 'tanpa_validasi') return configured;
    if (workType?.IsHomeBase) return 'rumah';
    if (configured === 'kantor' || String(workType?.Nama || '').trim().toUpperCase() === 'WFO') return 'kantor';
    return 'tanpa_validasi';
  }

  validationLabel(workType: any): string {
    switch (this.validationMode(workType)) {
      case 'kantor': return 'Kantor';
      case 'rumah': return 'Rumah';
      default: return 'Tidak ada';
    }
  }

  async deleteWorkType(id: number): Promise<void> {
    if (await this.alert.confirm('Hapus tipe kerja?', 'Tipe kerja ini akan dihapus dari sistem.', 'Ya, hapus')) {
      this.http.delete(`${this.baseUrl}/${id}`, { headers: this.getHeaders() }).subscribe({
        next: () => { this.loadWorkTypes(); this.alert.success('Tipe kerja dihapus'); },
        error: (err) => this.alert.error('Gagal menghapus tipe kerja', err.error?.error || 'Gagal menghapus')
      });
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
