import { Component, OnInit } from '@angular/core';
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
  workTypes: any[] = [];
  isLoading = true;
  errorMessage = '';

  isModalOpen = false;
  isEditMode = false;
  isSaving = false;

  formData: any = {
    id: null,
    Nama: '',
    IsHomeBase: false
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
    this.formData = { id: null, Nama: '', IsHomeBase: false };
    this.isModalOpen = true;
  }

  openEditModal(wt: any): void {
    this.isEditMode = true;
    this.formData = { id: wt.ID, Nama: wt.Nama, IsHomeBase: wt.IsHomeBase };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  async saveWorkType(): Promise<void> {
    const action = this.isEditMode ? 'mengubah tipe kerja ini' : 'menyimpan tipe kerja baru';
    if (!await this.alert.confirm('Konfirmasi perubahan', `Apakah Anda yakin ingin ${action}?`)) return;
    this.isSaving = true;
    const body = {
      Nama: this.formData.Nama,
      IsHomeBase: this.formData.IsHomeBase
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
