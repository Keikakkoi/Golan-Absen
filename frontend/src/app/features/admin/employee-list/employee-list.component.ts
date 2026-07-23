import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { FormsModule } from '@angular/forms';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, FormsModule, AdminSidebarComponent],
  templateUrl: './employee-list.component.html',
  styleUrls: ['./employee-list.component.scss']
})
export class EmployeeListComponent implements OnInit {
  employees: any[] = [];
  isLoading = true;
  errorMessage = '';
  
  isModalOpen = false;
  isEditMode = false;
  isSaving = false;
  selectedImportFile: File | null = null;
  
  // Detail Modal
  isDetailOpen = false;
  selectedDetail: any = null;

  formData: any = {
    ID: null,
    NIK: '',
    UserID: null,
    DepartmentID: null,
    PositionID: null,
    WorkTypeID: null,
    ScheduleID: null,
    HomeLatitude: null,
    HomeLongitude: null,
      HomeGoogleMapsURL: '',
    SisaCuti: 12,
    User: {
      ID: null,
      Nama: '',
      Email: '',
      Password: '',
      Role: 'Karyawan'
    }
  };

  private baseUrl = 'http://localhost:8080/api/v1/admin/employees';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private alert: AlertService
  ) {}

  ngOnInit(): void {
    this.loadEmployees();
  }

  loadEmployees(): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.http.get<any[]>(this.baseUrl, { headers: this.getHeaders() })
      .subscribe({
        next: (data) => {
          this.employees = data;
          this.isLoading = false;
        },
        error: (err) => {
          this.errorMessage = 'Gagal memuat data karyawan: ' + (err.error?.error || 'Unknown error');
          this.isLoading = false;
        }
      });
  }

  async importEmployees(): Promise<void> {
    if (!this.selectedImportFile) {
      this.alert.info('File belum dipilih', 'Pilih file CSV terlebih dahulu.');
      return;
    }
    if (!await this.alert.confirm('Import data karyawan?', 'Data dari file CSV akan ditambahkan ke sistem.')) return;
    const body = new FormData();
    body.append('file', this.selectedImportFile);
    this.http.post<any>(`${this.baseUrl}/import`, body, { headers: this.getHeaders() })
      .subscribe({
        next: (res) => {
          this.alert.success('Import selesai', `Berhasil: ${res.imported}. Gagal: ${(res.errors || []).length}`);
          this.selectedImportFile = null;
          this.loadEmployees();
        },
        error: (err) => {
          this.alert.error('Import gagal', err.error?.error || 'Unknown error');
        }
      });
  }

  onImportFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedImportFile = input.files?.[0] || null;
  }

  openAddModal(): void {
    this.isEditMode = false;
    this.resetForm();
    this.isModalOpen = true;
  }

  openEditModal(emp: any): void {
    this.isEditMode = true;
    this.formData = {
      id: emp.ID,
      nama: emp.Nama,
      email: emp.Email,
      password: '',
      role: emp.Role || 'Karyawan',
      status: emp.Status || 'aktif',
      nik: emp.Employee?.NIK,
      department_id: emp.Employee?.DepartmentID,
      position_id: emp.Employee?.PositionID,
      tanggal_bergabung: emp.Employee?.TanggalBergabung ? emp.Employee.TanggalBergabung.split('T')[0] : '',
      home_latitude: emp.Employee?.HomeLatitude,
      home_longitude: emp.Employee?.HomeLongitude,
      home_google_maps_url: emp.Employee?.HomeLocation?.GoogleMapsURL || ''
    };
    this.isModalOpen = true;
  }

  openDetailModal(emp: any): void {
    this.selectedDetail = emp;
    this.isDetailOpen = true;
  }

  closeDetailModal(): void {
    this.isDetailOpen = false;
    this.selectedDetail = null;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  async saveEmployee(): Promise<void> {
    const action = this.isEditMode ? 'mengubah data karyawan ini' : 'menyimpan karyawan baru';
    if (!await this.alert.confirm('Konfirmasi perubahan', `Apakah Anda yakin ingin ${action}?`)) return;
    this.isSaving = true;
    const headers = this.getHeaders();
    
    if (this.isEditMode) {
      this.http.put<any>(`${this.baseUrl}/${this.formData.id}`, this.formData, { headers })
        .subscribe({
          next: () => {
            this.isSaving = false;
            this.closeModal();
            this.loadEmployees();
            this.alert.success('Data karyawan diperbarui');
          },
          error: (err) => {
            this.alert.error('Gagal memperbarui data', err.error?.error || 'Unknown error');
            this.isSaving = false;
          }
        });
    } else {
      this.http.post<any>(this.baseUrl, this.formData, { headers })
        .subscribe({
          next: () => {
            this.isSaving = false;
            this.closeModal();
            this.loadEmployees();
            this.alert.success('Karyawan berhasil disimpan');
          },
          error: (err) => {
            this.alert.error('Gagal menyimpan karyawan', err.error?.error || 'Unknown error');
            this.isSaving = false;
          }
        });
    }
  }

  async deleteEmployee(id: number): Promise<void> {
    if (!await this.alert.confirm('Hapus data karyawan?', 'Data karyawan yang dihapus tidak dapat dipulihkan.', 'Ya, hapus')) return;

    const headers = this.getHeaders();
    this.http.delete<any>(`${this.baseUrl}/${id}`, { headers })
      .subscribe({
        next: () => {
          this.loadEmployees();
          this.alert.success('Data karyawan dihapus');
        },
        error: (err) => {
          this.alert.error('Gagal menghapus data', err.error?.error || 'Unknown error');
        }
      });
  }

  private resetForm(): void {
    this.formData = {
      id: null,
      nama: '',
      email: '',
      password: '',
      role: 'Karyawan',
      status: 'aktif',
      nik: '',
      department_id: 1,
      position_id: 1,
      tanggal_bergabung: '',
      home_latitude: 0,
      home_longitude: 0,
      home_google_maps_url: ''
    };
  }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  logout(): void {
    this.authService.logout();
  }
}
