import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
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

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit(): void {
    this.loadWorkTypes();
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
  }

  loadWorkTypes(): void {
    this.isLoading = true;
    this.http.get<any[]>(this.publicUrl, { headers: this.getHeaders() }).subscribe({
      next: (data) => {
        this.workTypes = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Gagal memuat tipe kerja';
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

  saveWorkType(): void {
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
      },
      error: (err) => {
        alert(err.error?.error || 'Gagal menyimpan');
        this.isSaving = false;
      }
    });
  }

  deleteWorkType(id: number): void {
    if (confirm('Yakin ingin menghapus tipe kerja ini?')) {
      this.http.delete(`${this.baseUrl}/${id}`, { headers: this.getHeaders() }).subscribe({
        next: () => this.loadWorkTypes(),
        error: (err) => alert(err.error?.error || 'Gagal menghapus')
      });
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
