import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { FormsModule } from '@angular/forms';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';
import { ReportExportService } from '../../../core/services/report-export.service';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';
import { FilePreviewComponent } from '../../../shared/file-preview/file-preview.component';
import { validateProfilePhoto } from '../../../shared/profile-photo-validation';

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, FormsModule, AdminSidebarComponent, PaginationComponent, FilePreviewComponent],
  templateUrl: './employee-list.component.html',
  styleUrls: ['./employee-list.component.scss']
})
export class EmployeeListComponent implements OnInit {
  employees: any[] = [];
  filteredEmployees: any[] = [];
  pageSizeOptions = [10, 25, 50, 100];
  pageSize = 25;
  currentPage = 1;
  
  filters = {
    search: '',
    division_id: '',
    position_id: '',
    project_id: '',
    sort_order: 'name_asc'
  };
  isLoading = true;
  errorMessage = '';
  
  isModalOpen = false;
  isEditMode = false;
  isSaving = false;
  selectedImportFile: File | null = null;
  selectedPhotoFile: File | null = null;
  photoError = '';
  isPhotoValidationPending = false;
  isExportMenuOpen = false;
  
  divisions: any[] = [];
  positions: any[] = [];
  managers: any[] = [];
  projects: any[] = [];
  
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

  getShiftLabel(employee: any): string {
    return employee?.Employee?.ShiftName || employee?.Employee?.shift_name || employee?.Employee?.ShiftKerja || 'Reguler';
  }
  getShiftClass(employee: any): string {
    return this.getShiftLabel(employee).toLowerCase().replace(/\s+/g, '-');
  }

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private alert: AlertService,
    private reportExport: ReportExportService
  ) {}

  @HostListener('document:click', ['$event'])
  closeExportMenuOnOutsideClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.employee-export')) this.isExportMenuOpen = false;
  }

  toggleExportMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.isExportMenuOpen = !this.isExportMenuOpen;
  }

  exportEmployees(format: 'csv' | 'xls' | 'json' | 'pdf' | 'print'): void {
    this.isExportMenuOpen = false;
    if (!this.filteredEmployees.length) {
      void this.alert.info('Tidak ada data karyawan untuk diekspor');
      return;
    }

    const report = this.buildEmployeeReport();
    const date = this.getExportDate();
    if (format === 'csv') this.reportExport.downloadCsv(`data-karyawan-${date}.csv`, report.headers, report.rows);
    if (format === 'xls') this.reportExport.downloadExcel(`data-karyawan-${date}.xlsx`, report.headers, report.rows);
    if (format === 'json') this.reportExport.downloadJson(`data-karyawan-${date}.json`, report.data);
    if (format === 'pdf') this.reportExport.downloadPdf(`laporan-karyawan-${date}.pdf`, 'Laporan Data Karyawan', date, report.headers, report.rows);
    if (format === 'print') this.reportExport.printReport('Laporan Data Karyawan', date, report.headers, report.rows);
  }

  private buildEmployeeReport(): { headers: string[]; rows: string[][]; data: Record<string, string>[] } {
    const headers = ['NIK/NIP', 'Nama lengkap', 'Jenis kelamin', 'Tempat dan tanggal lahir', 'Nomor telepon', 'Email', 'Alamat', 'Jabatan', 'Departemen', 'Status karyawan', 'Tanggal masuk', 'Shift kerja', 'Lokasi Rumah', 'Tanggal dibuat'];
    const value = (emp: any, ...keys: string[]): string => {
      for (const key of keys) {
        const parts = key.split('.'); let current = emp;
        for (const part of parts) current = current?.[part];
        if (current !== undefined && current !== null && current !== '') return String(current);
      }
      return '-';
    };
    const date = (raw: any): string => {
      if (!raw || String(raw).startsWith('0001-01-01')) return '-';
      const parsed = new Date(raw); return Number.isNaN(parsed.getTime()) ? '-' : new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(parsed);
    };
    const rows = this.filteredEmployees.map((emp) => [
      value(emp, 'Employee.NIK', 'NIK'), value(emp, 'Nama', 'name'), value(emp, 'Employee.JenisKelamin', 'JenisKelamin', 'jenis_kelamin'),
      (() => { const place = value(emp, 'Employee.TempatLahir', 'tempat_lahir'); const birthDate = date(emp.Employee?.TanggalLahir); return place === '-' && birthDate === '-' ? '-' : `${place} / ${birthDate}`; })(),
      value(emp, 'Employee.NomorTelepon', 'NomorTelepon', 'nomor_telepon', 'phone'), value(emp, 'Email', 'email'), value(emp, 'Employee.Alamat', 'alamat', 'Alamat'),
      value(emp, 'Employee.Position.NamaJabatan', 'Jabatan'), value(emp, 'Employee.Division.NamaDivisi', 'Departemen'), this.statusLabel(value(emp, 'Status', 'status')),
      date(emp.Employee?.TanggalBergabung), value(emp, 'Employee.ShiftKerja', 'ShiftKerja', 'shift_kerja'), value(emp, 'Employee.HomeLocation.GoogleMapsURL', 'Employee.HomeLocation.google_maps_url'), date(emp.CreatedAt || emp.created_at)
    ]);
    const keys = ['nik_nip', 'nama_lengkap', 'jenis_kelamin', 'tempat_dan_tanggal_lahir', 'nomor_telepon', 'email', 'alamat', 'jabatan', 'departemen', 'status_karyawan', 'tanggal_masuk', 'shift_kerja', 'lokasi_rumah', 'tanggal_dibuat'];
    const data = rows.map(row => Object.fromEntries(keys.map((key, i) => [key, row[i]])));
    return { headers, rows, data };
  }

  private statusLabel(value: string): string { return value === 'aktif' ? 'Aktif' : value === 'nonaktif' ? 'Nonaktif' : (value || '-'); }

  private getExportDate(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  }

  ngOnInit(): void {
    this.loadEmployees();
    this.loadDivisions();
    this.loadPositions();
    this.loadManagers();
    this.loadProjects();
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

  loadManagers(): void {
    this.http.get<any[]>('http://localhost:8080/api/v1/organization/managers', { headers: this.getHeaders() })
      .subscribe({
        next: (data) => {
          this.managers = data || [];
          if (this.formData.role === 'MAGANG') this.syncInternManagerName();
        },
        error: (err) => console.error('Gagal memuat manajer:', err)
      });
  }

  loadProjects(): void {
    this.http.get<any[]>('http://localhost:8080/api/v1/organization/projects', { headers: this.getHeaders() })
      .subscribe({
        next: (data) => this.projects = data || [],
        error: (err) => console.error('Gagal memuat project:', err)
      });
  }

  onRoleChange(): void {
    if (this.formData.role === 'MAGANG') {
      this.syncInternManagerName();
    }
  }

  onManagerChange(): void {
    if (this.formData.role === 'MAGANG') {
      this.syncInternManagerName();
    }
  }

  private syncInternManagerName(): void {
    const managerID = Number(this.formData.manager_id);
    const manager = managerID > 0 ? this.managers.find(item => Number(item.ID) === managerID) : null;
    this.formData.mentor_name = manager?.Nama || '';
  }

  loadEmployees(): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.http.get<any[]>(this.baseUrl, { headers: this.getHeaders() })
      .subscribe({
        next: (data) => {
          this.employees = Array.isArray(data) ? data : [];
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

    if (this.filters.project_id) {
      result = result.filter(emp => emp.ProjectID == this.filters.project_id);
    }

    this.sortEmployees(result);

    this.filteredEmployees = result;
    this.currentPage = 1;
  }

  private sortEmployees(employees: any[]): void {
    const order = this.filters.sort_order;
    const descending = order.endsWith('_desc');

    employees.sort((a, b) => {
      let comparison = 0;

      if (order === 'name_asc' || order === 'name_desc') {
        comparison = String(a.Nama || '').localeCompare(String(b.Nama || ''), 'id');
      } else if (order === 'employee_id_asc' || order === 'employee_id_desc') {
        comparison = Number(a.ID || 0) - Number(b.ID || 0);
      } else if (order === 'join_date_asc' || order === 'join_date_desc') {
        comparison = this.dateValue(a.Employee?.TanggalBergabung) - this.dateValue(b.Employee?.TanggalBergabung);
      }

      return descending ? -comparison : comparison;
    });
  }

  private dateValue(value: string | null | undefined): number {
    if (!value || String(value).startsWith('0001-01-01')) return Number.MAX_SAFE_INTEGER;
    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
  }

  get paginationStartIndex(): number {
    return this.filteredEmployees.length === 0 ? 0 : (this.currentPage - 1) * this.pageSize;
  }

  get paginationEndIndex(): number {
    return Math.min(this.paginationStartIndex + this.pageSize, this.filteredEmployees.length);
  }

  get displayedEmployees(): any[] {
    return this.filteredEmployees.slice(this.paginationStartIndex, this.paginationEndIndex);
  }

  goToPage(page: number): void {
    const totalPages = Math.max(1, Math.ceil(this.filteredEmployees.length / this.pageSize));
    this.currentPage = Math.min(Math.max(page, 1), totalPages);
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
  }

  private async uploadEmployeesCsv(file: File): Promise<void> {
    if (!await this.alert.confirm('Unggah data karyawan?', 'Data dari file CSV akan ditambahkan ke sistem.')) return;
    const body = new FormData();
    body.append('file', file);
    this.http.post<any>(`${this.baseUrl}/import`, body, { headers: this.getHeaders() })
      .subscribe({
        next: (res) => {
          this.alert.success('Unggah selesai', `Berhasil: ${res.imported}. Gagal: ${(res.errors || []).length}`);
          this.selectedImportFile = null;
          this.loadEmployees();
        },
        error: (err) => {
          this.alert.error('Unggah gagal', err.error?.error || 'Unknown error');
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

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement; const file = input.files?.[0]; if (!file) return;
    void validateProfilePhoto(file).then(error => {
      if (error) {
        this.photoError = error;
        this.formData.foto_profil_url = '';
        this.selectedPhotoFile = null;
        input.value = '';
        return;
      }
      const reader = new FileReader(); reader.onload = () => this.formData.foto_profil_url = String(reader.result); reader.readAsDataURL(file);
    });
  }

  async onPhotoFilesChange(files: File[]): Promise<void> {
    const file = files[0];
    this.photoError = '';
    if (!file) { this.selectedPhotoFile = null; this.formData.foto_profil_url = ''; return; }
    this.isPhotoValidationPending = true;
    try {
      const validationError = await validateProfilePhoto(file);
      if (validationError) {
        this.selectedPhotoFile = null;
        this.formData.foto_profil_url = '';
        this.photoError = validationError;
        return;
      }
      this.selectedPhotoFile = file;
      const reader = new FileReader();
      reader.onload = () => this.formData.foto_profil_url = String(reader.result);
      reader.readAsDataURL(file);
    } finally {
      this.isPhotoValidationPending = false;
    }
  }

  onImportFilesChange(files: File[]): void {
    const file = files[0] || null;
    this.selectedImportFile = file;
    if (file) void this.uploadEmployeesCsv(file);
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
      jenis_kelamin: emp.Employee?.JenisKelamin || '', tempat_lahir: emp.Employee?.TempatLahir || '', tanggal_lahir: emp.Employee?.TanggalLahir ? emp.Employee.TanggalLahir.split('T')[0] : '', nomor_telepon: emp.Employee?.NomorTelepon || '', alamat: emp.Employee?.Alamat || '', foto_profil_url: emp.Employee?.FotoProfilURL || '', shift_kerja: emp.Employee?.ShiftKerja || '',
      division_id: emp.Employee?.DivisionID || 0,
      position_id: emp.Employee?.PositionID || 0,
      tanggal_bergabung: emp.Employee?.TanggalBergabung ? emp.Employee.TanggalBergabung.split('T')[0] : '',
      home_latitude: emp.Employee?.HomeLatitude,
      home_longitude: emp.Employee?.HomeLongitude,
      home_google_maps_url: emp.Employee?.HomeLocation?.GoogleMapsURL || '',
      manager_id: emp.ManagerID || null,
      project_id: emp.ProjectID || null,
      team_id: emp.TeamID || '',
      internship_start_date: emp.InternshipStartDate ? emp.InternshipStartDate.split('T')[0] : '',
      internship_end_date: emp.InternshipEndDate ? emp.InternshipEndDate.split('T')[0] : '',
      mentor_name: emp.MentorName || '',
      institution_name: emp.InstitutionName || ''
    };
    this.selectedPhotoFile = null;
    this.photoError = '';
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
    if (this.isPhotoValidationPending) {
      await this.alert.error('Validasi pas foto belum selesai', 'Tunggu sampai pemeriksaan dimensi foto selesai sebelum menyimpan.');
      return;
    }
    if (this.photoError) {
      await this.alert.error('Pas foto tidak valid', 'Pas foto harus memiliki ukuran 3x4. Pilih foto yang sesuai sebelum menyimpan.');
      return;
    }
    if (!this.formData.division_id || this.formData.division_id === 0) {
      await this.alert.error('Divisi belum dipilih', 'Silakan pilih divisi karyawan terlebih dahulu.');
      return;
    }
    if (!this.formData.position_id || this.formData.position_id === 0) {
      await this.alert.error('Jabatan belum dipilih', 'Silakan pilih jabatan karyawan terlebih dahulu.');
      return;
    }
    if (!String(this.formData.home_google_maps_url || '').trim()) {
      await this.alert.error('Link Google Maps belum diisi', 'Link Google Maps rumah wajib diisi untuk keperluan absensi WFH.');
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
    if (this.formData.nomor_telepon && !/^\+?[0-9][0-9 .-]{7,19}$/.test(String(this.formData.nomor_telepon))) { await this.alert.error('Nomor telepon tidak valid', 'Gunakan format nomor telepon yang sesuai.'); return; }

    const action = this.isEditMode ? 'mengubah data karyawan ini' : 'menyimpan karyawan baru';

    // Cek duplikat Email di frontend
    const emailInput = String(this.formData.email || '').trim().toLowerCase();
    const isEmailDuplicate = this.employees.some(emp => 
      emp.Email?.toLowerCase() === emailInput && emp.ID !== this.formData.id
    );
    if (isEmailDuplicate) {
      await this.alert.error('Gagal menyimpan', `Email '${this.formData.email}' sudah memiliki akun. Silakan gunakan email lain.`);
      return;
    }

    // Cek duplikat NIK di frontend
    const isNikDuplicate = this.employees.some(emp => 
      emp.Employee?.NIK === nik && emp.ID !== this.formData.id
    );
    if (isNikDuplicate) {
      await this.alert.error('Gagal menyimpan', `NIK '${nik}' sudah memiliki akun. Pastikan NIK benar.`);
      return;
    }

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
    this.selectedPhotoFile = null;
    this.photoError = '';
    this.isPhotoValidationPending = false;
    this.formData = {
      id: null,
      nama: '',
      email: '',
      password: '',
      role: 'Karyawan',
      status: 'aktif',
      nik: '',
      jenis_kelamin: '', tempat_lahir: '', tanggal_lahir: '', nomor_telepon: '', alamat: '', foto_profil_url: '', shift_kerja: '',
      division_id: 0,
      position_id: 0,
      tanggal_bergabung: '',
      home_latitude: 0,
      home_longitude: 0,
      home_google_maps_url: '',
      manager_id: null,
      project_id: null,
      team_id: '',
      internship_start_date: '',
      internship_end_date: '',
      mentor_name: '',
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
