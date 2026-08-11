import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';

@Component({
  selector: 'app-admin-management',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminSidebarComponent],
  templateUrl: './admin-management.component.html',
  styleUrls: ['./admin-management.component.scss']
})
export class AdminManagementComponent implements OnInit {
  section: string;
  isLoading = false;
  isSaving = false;
  errorMessage = '';

  employeeSearchTerm: string = '';
  scheduleSearch: string = '';
  scheduleStartDate: string = '';
  scheduleEndDate: string = '';

  schedules: any[] = [];
  readonly shiftOptions = ['Reguler', 'Shift Pagi', 'Shift Siang', 'Shift Malam'];
  shiftAssignment: any = { employee_id: '', shift: 'Reguler' };
  scheduleForm: any = this.emptySchedule();
  editingScheduleId: number | null = null;
  isGlobalSchedule = true;
  readonly workDays = [
    { id: '1', label: 'Sen' },
    { id: '2', label: 'Sel' },
    { id: '3', label: 'Rab' },
    { id: '4', label: 'Kam' },
    { id: '5', label: 'Jum' },
    { id: '6', label: 'Sab' },
    { id: '7', label: 'Min' }
  ];

  homeRows: any[] = [];
  selectedHome: any = null;
  homeForm: any = { latitude_rumah: null, longitude_rumah: null, radius_meter: 100, alamat_rumah: '', google_maps_url: '' };

  employees: any[] = [];
  quotas: any[] = [];
  quotaForm: any = { employee_id: '', tahun: new Date().getFullYear(), jenis_cuti: 'Cuti', sisa_kuota: 12 };

  private readonly api = 'http://localhost:8080/api/v1';

  constructor(private http: HttpClient, private auth: AuthService, private alert: AlertService, route: ActivatedRoute) {
    this.section = route.snapshot.data['section'] || 'schedules';
  }

  ngOnInit(): void { this.loadSection(); }

  loadSection(): void {
    this.isLoading = true;
    this.errorMessage = '';
    if (this.section === 'schedules') this.loadSchedules();
    if (this.section === 'home') this.loadHomeLocations();
    if (this.section === 'quotas') this.loadQuotas();
  }

  private headers(): HttpHeaders { return new HttpHeaders().set('Authorization', `Bearer ${this.auth.getToken()}`); }

  loadEmployees(): void {
    this.http.get<any[]>(`${this.api}/admin/employees`, { headers: this.headers() }).subscribe({ next: employees => { this.employees = employees || []; }, error: err => this.fail(err) });
  }

  get filteredEmployees(): any[] {
    if (!this.employeeSearchTerm) return this.employees;
    const term = this.employeeSearchTerm.toLowerCase();
    return this.employees.filter(emp => emp.Nama?.toLowerCase().includes(term) || emp.Employee?.NIK?.toLowerCase().includes(term));
  }

  loadSchedules(): void {
    if (this.employees.length === 0) {
      this.loadEmployees();
    }
    
    let params = new HttpParams();
    if (this.scheduleSearch) params = params.set('search', this.scheduleSearch);
    if (this.scheduleStartDate) params = params.set('start_date', this.scheduleStartDate);
    if (this.scheduleEndDate) params = params.set('end_date', this.scheduleEndDate);

    this.http.get<any[]>(`${this.api}/admin/schedules`, { headers: this.headers(), params: params }).subscribe({ next: data => { this.schedules = data || []; this.isLoading = false; }, error: err => this.fail(err) });
  }

  editSchedule(schedule: any): void {
    this.editingScheduleId = schedule.ID;
    this.isGlobalSchedule = !schedule.EmployeeID;
    this.scheduleForm = { ...schedule, EmployeeID: schedule.EmployeeID || '', EmployeeIDs: schedule.EmployeeID ? [Number(schedule.EmployeeID)] : [], Tanggal: schedule.Tanggal ? schedule.Tanggal.substring(0, 10) : '', JamMulai: (schedule.JamMulai || '').substring(0, 5), JamSelesai: (schedule.JamSelesai || '').substring(0, 5) };
  }

  resetSchedule(): void { this.editingScheduleId = null; this.isGlobalSchedule = true; this.scheduleForm = this.emptySchedule(); }

  isEmployeeSelected(employeeId: number | undefined): boolean {
    return !this.isGlobalSchedule && !!employeeId && (this.scheduleForm.EmployeeIDs || []).includes(Number(employeeId));
  }

  toggleGlobalSchedule(): void {
    this.isGlobalSchedule = !this.isGlobalSchedule;
    this.scheduleForm.EmployeeIDs = this.isGlobalSchedule ? [] : (this.scheduleForm.EmployeeIDs || []);
    this.scheduleForm.EmployeeID = this.isGlobalSchedule ? '' : (this.scheduleForm.EmployeeIDs[0] || '');
  }

  toggleEmployee(employeeId: number | undefined): void {
    if (!employeeId) return;
    this.isGlobalSchedule = false;
    const selected = new Set<number>((this.scheduleForm.EmployeeIDs || []).map((id: any) => Number(id)));
    const id = Number(employeeId);
    if (selected.has(id)) selected.delete(id); else selected.add(id);
    this.scheduleForm.EmployeeIDs = Array.from(selected);
    this.scheduleForm.EmployeeID = this.scheduleForm.EmployeeIDs[0] || '';
  }

  get regularHours(): { start: string, end: string } {
    if (!this.schedules || this.schedules.length === 0) {
      return { start: '09:00', end: '17:00' };
    }
    const regulerShift = this.schedules.find(s => !s.EmployeeID && s.NamaShift?.toLowerCase().includes('reguler'));
    
    if (regulerShift) {
      return {
        start: (regulerShift.JamMulai || '09:00').substring(0, 5),
        end: (regulerShift.JamSelesai || '17:00').substring(0, 5)
      };
    }
    
    const globalShift = this.schedules.find(s => !s.EmployeeID);
    if (globalShift) {
      return {
        start: (globalShift.JamMulai || '09:00').substring(0, 5),
        end: (globalShift.JamSelesai || '17:00').substring(0, 5)
      };
    }

    return { start: '09:00', end: '17:00' };
  }

  async saveSchedule(): Promise<void> {
    const wasEditing = !!this.editingScheduleId;
    const action = wasEditing ? 'mengubah shift ini' : 'menyimpan shift baru';
    if (!await this.alert.confirm('Konfirmasi perubahan', `Apakah Anda yakin ingin ${action}?`)) return;
    this.isSaving = true;
    
    const formattedDate = this.scheduleForm.Tanggal ? (this.scheduleForm.Tanggal.includes('T') ? this.scheduleForm.Tanggal : `${this.scheduleForm.Tanggal}T00:00:00Z`) : '';
    
    const empId = Number(this.scheduleForm.EmployeeID);
    const isGlobal = !empId || empId === 0;
    const selectedEmployeeIds = isGlobal ? [] : [empId];
    
    const body = { 
      ...this.scheduleForm, 
      EmployeeID: isGlobal ? null : empId, 
      EmployeeIDs: selectedEmployeeIds, 
      Tanggal: formattedDate, 
      JamMulai: this.scheduleForm.JamMulai.length === 5 ? `${this.scheduleForm.JamMulai}:00` : this.scheduleForm.JamMulai, 
      JamSelesai: this.scheduleForm.JamSelesai.length === 5 ? `${this.scheduleForm.JamSelesai}:00` : this.scheduleForm.JamSelesai, 
      ToleransiTerlambatMenit: Number(this.scheduleForm.ToleransiTerlambatMenit) 
    };
    const request = this.editingScheduleId ? this.http.put(`${this.api}/admin/schedules/${this.editingScheduleId}`, body, { headers: this.headers() }) : this.http.post(`${this.api}/admin/schedules`, body, { headers: this.headers() });
    request.subscribe({ next: () => { this.isSaving = false; this.resetSchedule(); this.loadSchedules(); this.alert.success(wasEditing ? 'Shift diperbarui' : 'Shift disimpan'); }, error: (err: any) => { this.isSaving = false; this.fail(err); this.alert.error('Gagal menyimpan shift', err.error?.error || 'Gagal menyimpan shift'); } });
  }

  async saveShiftAssignment(): Promise<void> {
    const employeeId = Number(this.shiftAssignment.employee_id);
    if (!employeeId || !this.shiftAssignment.shift) {
      this.alert.error('Data belum lengkap', 'Karyawan dan shift wajib dipilih.');
      return;
    }
    if (!await this.alert.confirm('Simpan perubahan shift?', 'Shift karyawan akan diperbarui pada data karyawan.')) return;
    this.isSaving = true;
    this.http.put(`${this.api}/admin/employees/${employeeId}/shift`, { shift: this.shiftAssignment.shift }, { headers: this.headers() }).subscribe({
      next: () => { this.isSaving = false; this.alert.success('Shift karyawan berhasil diperbarui'); this.loadEmployees(); },
      error: err => { this.isSaving = false; this.alert.error('Gagal mengubah shift', err.error?.error || 'Gagal menyimpan shift'); }
    });
  }

  async deleteSchedule(id: number): Promise<void> {
    if (!await this.alert.confirm('Hapus shift?', 'Shift ini akan dihapus dari sistem.', 'Ya, hapus')) return;
    this.http.delete(`${this.api}/admin/schedules/${id}`, { headers: this.headers() }).subscribe({ next: () => { this.loadSchedules(); this.alert.success('Shift dihapus'); }, error: err => { this.fail(err); this.alert.error('Gagal menghapus shift', err.error?.error || 'Gagal menghapus shift'); } });
  }

  loadHomeLocations(): void {
    this.http.get<any[]>(`${this.api}/admin/home-locations`, { headers: this.headers() }).subscribe({ next: data => { this.homeRows = data || []; this.isLoading = false; }, error: err => this.fail(err) });
  }

  editHome(row: any): void {
    this.selectedHome = row.employee;
    const location = row.location || {};
    this.homeForm = { latitude_rumah: location.LatitudeRumah || row.employee.HomeLatitude || null, longitude_rumah: location.LongitudeRumah || row.employee.HomeLongitude || null, radius_meter: location.RadiusMeter || 100, alamat_rumah: location.AlamatRumah || '', google_maps_url: location.GoogleMapsURL || '' };
  }

  async saveHome(): Promise<void> {
    if (!this.selectedHome) return;
    if (!await this.alert.confirm('Simpan lokasi rumah?', 'Koordinat geofence WFH karyawan akan diperbarui dari link Google Maps.')) return;
    this.isSaving = true;
    this.http.put(`${this.api}/admin/home-locations/${this.selectedHome.ID}`, this.homeForm, { headers: this.headers() }).subscribe({ next: () => { this.isSaving = false; this.selectedHome = null; this.loadHomeLocations(); this.alert.success('Lokasi rumah disimpan'); }, error: err => { this.isSaving = false; this.fail(err); this.alert.error('Gagal menyimpan lokasi rumah', err.error?.error || 'Gagal menyimpan lokasi rumah'); } });
  }

  loadQuotas(): void {
    this.http.get<any[]>(`${this.api}/admin/employees`, { headers: this.headers() }).subscribe({ next: employees => { this.employees = employees || []; this.loadQuotaRows(); }, error: err => this.failQuota(err) });
  }

  get quotaTypeCount(): number {
    return new Set((this.quotas || []).map(q => q.JenisCuti)).size;
  }

  loadQuotaRows(): void {
    this.http.get<any[]>(`${this.api}/admin/leave-quotas?tahun=${this.quotaForm.tahun}`, { headers: this.headers() }).subscribe({ next: data => { this.quotas = data || []; this.isLoading = false; }, error: err => this.failQuota(err) });
  }

  private failQuota(err: any): void { this.isLoading = false; this.errorMessage = 'Gagal memuat data kuota: ' + (err?.error?.error || 'Unknown error'); }

  editQuota(quota: any): void {
    this.quotaForm = { employee_id: String(quota.EmployeeID), tahun: quota.Tahun, jenis_cuti: quota.JenisCuti, sisa_kuota: quota.SisaKuota };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async saveQuota(): Promise<void> {
    if (!await this.alert.confirm('Simpan kuota?', 'Perubahan kuota izin/cuti akan disimpan.')) return;
    this.isSaving = true;
    this.http.put(`${this.api}/admin/leave-quotas/${this.quotaForm.employee_id}`, this.quotaForm, { headers: this.headers() }).subscribe({ next: () => { this.isSaving = false; this.loadQuotaRows(); this.alert.success('Kuota berhasil disimpan'); }, error: err => { this.isSaving = false; this.fail(err); this.alert.error('Gagal menyimpan kuota', err.error?.error || 'Gagal menyimpan kuota'); } });
  }

  async deleteQuota(id: number): Promise<void> {
    if (!await this.alert.confirm('Hapus kuota?', 'Data kuota ini akan dihapus dari sistem.', 'Ya, hapus')) return;
    this.http.delete(`${this.api}/admin/leave-quotas/${id}`, { headers: this.headers() }).subscribe({
      next: () => { this.loadQuotaRows(); this.alert.success('Kuota dihapus'); },
      error: err => { this.fail(err); this.alert.error('Gagal menghapus kuota', err.error?.error || 'Gagal menghapus kuota'); }
    });
  }

  viewQuota(quota: any): void {
    const nama = quota.Employee?.User?.Nama || 'Nama belum tersedia';
    const nik = quota.Employee?.NIK || '—';
    const info = `Karyawan: ${nama} (${nik})\nTahun: ${quota.Tahun}\nJenis: ${quota.JenisCuti}\nSisa Kuota: ${quota.SisaKuota} hari`;
    this.alert.info('Detail Kuota', info);
  }

  private emptySchedule(): any { return { EmployeeID: '', EmployeeIDs: [], Tanggal: new Date().toISOString().substring(0, 10), NamaShift: 'Reguler', JamMulai: '09:00', JamSelesai: '17:00', ToleransiTerlambatMenit: 10 }; }
  private fail(err: any): void { this.isLoading = false; this.errorMessage = err?.error?.error || 'Gagal memuat data.'; }
}
