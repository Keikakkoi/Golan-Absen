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
  filteredEmployees: any[] = [];
  
  filters = {
    search: '',
    division_id: '',
    position_id: '',
    sort_order: 'asc'
  };
  isLoading = true;
  errorMessage = '';
  
  isModalOpen = false;
  isEditMode = false;
  isSaving = false;
  selectedImportFile: File | null = null;
  
  divisions: any[] = [];
  positions: any[] = [];
  
  // Detail Modal
  isDetailOpen = false;
  selectedDetail: any = null;

  formData: any = {
    ID: null,
    NIK: '',
    UserID: null,
    DivisionID: null,
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
    this.loadDivisions();
    this.loadPositions();
  }

  loadDivisions(): void {
    this.http.get<any[]>('http://localhost:8080/api/v1/organization/divisions', { headers: this.getHeaders() })
      .subscribe({
        next: (data) => this.divisions = data,
        error: (err) => console.error('Gagal memuat divisi:', err)
      });
  }

  loadPositions(): void {
    this.http.get<any[]>('http://localhost:8080/api/v1/organization/positions', { headers: this.getHeaders() })
      .subscribe({
        next: (data) => this.positions = data,
        error: (err) => console.error('Gagal memuat jabatan:', err)
      });
  }

  loadEmployees(): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.http.get<any[]>(this.baseUrl, { headers: this.getHeaders() })
      .subscribe({
        next: (data) => {
          this.employees = data;
          this.applyFilters();
          this.isLoading = false;
        },
        error: (err) => {
          this.errorMessage = 'Gagal memuat data karyawan: ' + (err.error?.error || 'Unknown error');
          this.isLoading = false;
        }
      });
  }

  applyFilters(): void {
    let result = [...this.employees];

    if (this.filters.search) {
      const searchLower = this.filters.search.toLowerCase();
      result = result.filter(emp => 
        (emp.Nama && emp.Nama.toLowerCase().includes(searchLower)) ||
        (emp.Employee?.NIK && emp.Employee.NIK.toLowerCase().includes(searchLower))
      );
    }

    if (this.filters.division_id) {
      result = result.filter(emp => emp.Employee?.DivisionID == this.filters.division_id);
    }

    if (this.filters.position_id) {
      result = result.filter(emp => emp.Employee?.PositionID == this.filters.position_id);
    }

    if (this.filters.sort_order === 'asc') {
      result.sort((a, b) => (a.Nama || '').localeCompare(b.Nama || ''));
    } else {
      result.sort((a, b) => (b.Nama || '').localeCompare(a.Nama || ''));
    }

    this.filteredEmployees = result;
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

  onNikInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const nik = input.value.replace(/\D/g, '').slice(0, 16);
    input.value = nik;
    this.formData.nik = nik;
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
      division_id: emp.Employee?.DivisionID || 0,
      position_id: emp.Employee?.PositionID || 0,
      tanggal_bergabung: emp.Employee?.TanggalBergabung ? emp.Employee.TanggalBergabung.split('T')[0] : '',
      home_latitude: emp.Employee?.HomeLatitude,
      home_longitude: emp.Employee?.HomeLongitude,
      home_google_maps_url: emp.Employee?.HomeLocation?.GoogleMapsURL || '',
      manager_id: emp.ManagerID || null,
      team_id: emp.TeamID || '',
      internship_start_date: emp.InternshipStartDate ? emp.InternshipStartDate.split('T')[0] : '',
      internship_end_date: emp.InternshipEndDate ? emp.InternshipEndDate.split('T')[0] : '',
      mentor_name: emp.MentorName || '',
      mentor_contact: emp.MentorContact || '',
      institution_name: emp.InstitutionName || ''
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

  getEmployeeInitials(name: string | null | undefined): string {
    const words = String(name || 'Karyawan').trim().split(/\s+/).filter(Boolean);
    return words.slice(0, 2).map(word => word.charAt(0).toUpperCase()).join('') || 'K';
  }

  formatJoinDate(value: string | null | undefined): string {
    if (!value || String(value).startsWith('0001-01-01')) return 'Belum diatur';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Belum diatur';
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  async saveEmployee(): Promise<void> {
    if (!this.formData.division_id || this.formData.division_id === 0) {
      await this.alert.error('Divisi belum dipilih', 'Silakan pilih divisi karyawan terlebih dahulu.');
      return;
    }
    if (!this.formData.position_id || this.formData.position_id === 0) {
      await this.alert.error('Jabatan belum dipilih', 'Silakan pilih jabatan karyawan terlebih dahulu.');
      return;
    }

    const nik = String(this.formData.nik || '');
    if (nik.length < 16) {
      await this.alert.error('NIK belum lengkap', `NIK harus terdiri dari 16 digit angka. Saat ini baru ${nik.length} digit.`);
      return;
    }
    if (!/^\d{16}$/.test(nik)) {
      await this.alert.error('NIK tidak valid', 'NIK harus terdiri dari 16 digit angka.');
      return;
    }

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
      division_id: 0,
      position_id: 0,
      tanggal_bergabung: '',
      home_latitude: 0,
      home_longitude: 0,
      home_google_maps_url: '',
      manager_id: null,
      team_id: '',
      internship_start_date: '',
      internship_end_date: '',
      mentor_name: '',
      mentor_contact: '',
      institution_name: ''
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
