import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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
  section = 'roles';
  isLoading = true;
  isSaving = false;
  errorMessage = '';

  permissions: any[] = [];
  assignments: any[] = [];
  selectedRole = 'HRD';

  schedules: any[] = [];
  scheduleForm: any = this.emptySchedule();
  editingScheduleId: number | null = null;
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
  quotaForm: any = { employee_id: '', tahun: new Date().getFullYear(), jenis_cuti: 'Cuti Tahunan', sisa_kuota: 12 };

  private readonly api = 'http://localhost:8080/api/v1';

  constructor(private http: HttpClient, private auth: AuthService, private alert: AlertService, route: ActivatedRoute) {
    this.section = route.snapshot.data['section'] || 'roles';
  }

  ngOnInit(): void { this.loadSection(); }

  loadSection(): void {
    this.isLoading = true;
    this.errorMessage = '';
    if (this.section === 'roles') this.loadRoles();
    if (this.section === 'schedules') this.loadSchedules();
    if (this.section === 'home') this.loadHomeLocations();
    if (this.section === 'quotas') this.loadQuotas();
  }

  private headers(): HttpHeaders { return new HttpHeaders().set('Authorization', `Bearer ${this.auth.getToken()}`); }

  loadRoles(): void {
    this.http.get<any>(`${this.api}/admin/roles`, { headers: this.headers() }).subscribe({
      next: data => { this.permissions = data.permissions || []; this.assignments = data.assignments || []; this.isLoading = false; },
      error: err => this.fail(err)
    });
  }

  allowed(permissionId: number): boolean {
    return this.assignments.some(a => a.Role === this.selectedRole && a.PermissionID === permissionId && a.Diizinkan);
  }

  togglePermission(permissionId: number): void {
    const existing = this.assignments.find(a => a.Role === this.selectedRole && a.PermissionID === permissionId);
    if (existing) existing.Diizinkan = !existing.Diizinkan;
    else this.assignments.push({ Role: this.selectedRole, PermissionID: permissionId, Diizinkan: true });
  }

  async saveRoles(): Promise<void> {
    if (!await this.alert.confirm('Simpan permission?', 'Perubahan hak akses role akan langsung diterapkan.')) return;
    this.isSaving = true;
    this.http.put(`${this.api}/admin/roles`, this.assignments.map(a => ({ role: a.Role, permission_id: a.PermissionID, diizinkan: a.Diizinkan })), { headers: this.headers() }).subscribe({
      next: () => { this.isSaving = false; this.alert.success('Permission berhasil disimpan'); }, error: err => { this.isSaving = false; this.fail(err); this.alert.error('Gagal menyimpan permission', err.error?.error || 'Gagal menyimpan permission'); }
    });
  }

  loadSchedules(): void {
    this.http.get<any[]>(`${this.api}/admin/schedules`, { headers: this.headers() }).subscribe({ next: data => { this.schedules = data || []; this.isLoading = false; }, error: err => this.fail(err) });
  }

  editSchedule(schedule: any): void {
    this.editingScheduleId = schedule.ID;
    this.scheduleForm = { ...schedule, JamMulai: (schedule.JamMulai || '').substring(0, 5), JamSelesai: (schedule.JamSelesai || '').substring(0, 5) };
  }

  resetSchedule(): void { this.editingScheduleId = null; this.scheduleForm = this.emptySchedule(); }

  async saveSchedule(): Promise<void> {
    const wasEditing = !!this.editingScheduleId;
    const action = wasEditing ? 'mengubah shift ini' : 'menyimpan shift baru';
    if (!await this.alert.confirm('Konfirmasi perubahan', `Apakah Anda yakin ingin ${action}?`)) return;
    this.isSaving = true;
    const body = { ...this.scheduleForm, JamMulai: this.scheduleForm.JamMulai.length === 5 ? `${this.scheduleForm.JamMulai}:00` : this.scheduleForm.JamMulai, JamSelesai: this.scheduleForm.JamSelesai.length === 5 ? `${this.scheduleForm.JamSelesai}:00` : this.scheduleForm.JamSelesai, ToleransiTerlambatMenit: Number(this.scheduleForm.ToleransiTerlambatMenit) };
    const request = this.editingScheduleId ? this.http.put(`${this.api}/admin/schedules/${this.editingScheduleId}`, body, { headers: this.headers() }) : this.http.post(`${this.api}/admin/schedules`, body, { headers: this.headers() });
    request.subscribe({ next: () => { this.isSaving = false; this.resetSchedule(); this.loadSchedules(); this.alert.success(wasEditing ? 'Shift diperbarui' : 'Shift disimpan'); }, error: err => { this.isSaving = false; this.fail(err); this.alert.error('Gagal menyimpan shift', err.error?.error || 'Gagal menyimpan shift'); } });
  }

  async deleteSchedule(id: number): Promise<void> {
    if (!await this.alert.confirm('Hapus shift?', 'Shift ini akan dihapus dari sistem.', 'Ya, hapus')) return;
    this.http.delete(`${this.api}/admin/schedules/${id}`, { headers: this.headers() }).subscribe({ next: () => { this.loadSchedules(); this.alert.success('Shift dihapus'); }, error: err => { this.fail(err); this.alert.error('Gagal menghapus shift', err.error?.error || 'Gagal menghapus shift'); } });
  }

  getWorkDays(schedule: any): string[] {
    const selectedDays = String(schedule?.HariKerja || '')
      .split(',')
      .map(day => day.trim())
      .filter(Boolean);
    return this.workDays.filter(day => selectedDays.includes(day.id)).map(day => day.label);
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
    this.http.get<any[]>(`${this.api}/admin/employees`, { headers: this.headers() }).subscribe({ next: employees => { this.employees = employees || []; this.loadQuotaRows(); }, error: err => this.fail(err) });
  }

  get quotaTypeCount(): number {
    return new Set((this.quotas || []).map(q => q.JenisCuti)).size;
  }

  loadQuotaRows(): void {
    this.http.get<any[]>(`${this.api}/admin/leave-quotas?tahun=${this.quotaForm.tahun}`, { headers: this.headers() }).subscribe({ next: data => { this.quotas = data || []; this.isLoading = false; }, error: err => this.fail(err) });
  }

  editQuota(quota: any): void { this.quotaForm = { employee_id: quota.EmployeeID, tahun: quota.Tahun, jenis_cuti: quota.JenisCuti, sisa_kuota: quota.SisaKuota }; }

  async saveQuota(): Promise<void> {
    if (!await this.alert.confirm('Simpan kuota?', 'Perubahan kuota izin/cuti akan disimpan.')) return;
    this.isSaving = true;
    this.http.put(`${this.api}/admin/leave-quotas/${this.quotaForm.employee_id}`, this.quotaForm, { headers: this.headers() }).subscribe({ next: () => { this.isSaving = false; this.loadQuotaRows(); this.alert.success('Kuota berhasil disimpan'); }, error: err => { this.isSaving = false; this.fail(err); this.alert.error('Gagal menyimpan kuota', err.error?.error || 'Gagal menyimpan kuota'); } });
  }

  private emptySchedule(): any { return { NamaShift: '', JamMulai: '09:00', JamSelesai: '17:00', ToleransiTerlambatMenit: 10, HariKerja: '1,2,3,4,5' }; }
  private fail(err: any): void { this.isLoading = false; this.errorMessage = err?.error?.error || 'Gagal memuat data.'; }
}
