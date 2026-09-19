import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';

@Component({
  selector: 'app-admin-management',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminSidebarComponent, PaginationComponent],
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
  schedulePage = 1;
  schedulePageSize = 25;
  readonly schedulePageSizeOptions = [10, 25, 50, 100];
  regularSchedules: any[] = [];
  readonly shiftOptions = ['Reguler', 'Shift Pagi', 'Shift Siang', 'Shift Malam'];
  shiftAssignment: any = { employee_id: '', shift: 'Reguler' };
  scheduleForm: any = this.emptySchedule();
  editingScheduleId: number | null = null;
  isGlobalSchedule = true;
  activeTimePicker: 'start' | 'end' | null = null;
  readonly timeHours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'));
  readonly timeMinutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));
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
  homeTotal = 0;
  homePage = 1;
  homePageSize = 25;
  homeTotalPages = 1;
  selectedHome: any = null;
  homeForm: any = { latitude_rumah: null, longitude_rumah: null, radius_meter: 100, alamat_rumah: '', google_maps_url: '' };
  homeTab: 'active' | 'requests' = 'active';
  homeRequests: any[] = [];
  homePendingCount = 0;
  selectedHomeRequest: any = null;

  employees: any[] = [];
  quotas: any[] = [];
  quotaPage = 1;
  quotaPageSize = 25;
  readonly quotaPageSizeOptions = [10, 25, 50, 100];
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

    this.loadRegularSchedule();
    this.http.get<any[]>(`${this.api}/admin/schedules`, { headers: this.headers(), params: params }).subscribe({ next: data => { this.schedules = data || []; this.schedulePage = 1; this.isLoading = false; }, error: err => this.fail(err) });
  }

  get displayedSchedules(): any[] {
    const start = (this.schedulePage - 1) * this.schedulePageSize;
    return (this.schedules || []).slice(start, start + this.schedulePageSize);
  }

  schedulePageChanged(page: number): void {
    this.schedulePage = page;
  }

  schedulePageSizeChanged(size: number): void {
    this.schedulePageSize = size;
    this.schedulePage = 1;
  }

  private loadRegularSchedule(): void {
    this.http.get<any[]>(`${this.api}/admin/settings/regular-schedule`, { headers: this.headers() }).subscribe({
      next: data => { this.regularSchedules = (data || []).map(row => ({ ...row, start_time: this.clock(row.start_time), end_time: this.clock(row.end_time) })); },
      error: err => { console.error('[Shift] gagal memuat konfigurasi Reguler', err); this.regularSchedules = []; }
    });
  }

  editSchedule(schedule: any): void {
    this.editingScheduleId = schedule.ID;
    this.isGlobalSchedule = !schedule.EmployeeID;
    this.scheduleForm = { ...schedule, EmployeeID: schedule.EmployeeID || '', EmployeeIDs: schedule.EmployeeID ? [Number(schedule.EmployeeID)] : [], Tanggal: schedule.Tanggal ? schedule.Tanggal.substring(0, 10) : '', JamMulai: (schedule.JamMulai || '').substring(0, 5), JamSelesai: (schedule.JamSelesai || '').substring(0, 5), HariKerja: this.parseWorkDays(schedule.HariKerja ?? schedule.hari_kerja) };
  }

  resetSchedule(): void { this.editingScheduleId = null; this.isGlobalSchedule = true; this.activeTimePicker = null; this.scheduleForm = this.emptySchedule(); }

  toggleTimePicker(picker: 'start' | 'end'): void {
    this.activeTimePicker = this.activeTimePicker === picker ? null : picker;
  }

  timeValue(picker: 'start' | 'end'): string {
    const configured = picker === 'start' ? this.scheduleForm.JamMulai : this.scheduleForm.JamSelesai;
    if (configured) return this.clock(configured);
    const reference = picker === 'start' ? this.regularHours.start : this.regularHours.end;
    return reference || '--:--';
  }

  timePart(picker: 'start' | 'end', part: 'hour' | 'minute'): string {
    const value = this.timeValue(picker).split(':');
    return value[part === 'hour' ? 0 : 1] || (part === 'hour' ? '00' : '00');
  }

  selectTimePart(picker: 'start' | 'end', part: 'hour' | 'minute', value: string): void {
    const hour = part === 'hour' ? value : this.timePart(picker, 'hour');
    const minute = part === 'minute' ? value : this.timePart(picker, 'minute');
    const time = `${hour}:${minute}`;
    if (picker === 'start') this.scheduleForm.JamMulai = time;
    else this.scheduleForm.JamSelesai = time;
  }

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

  get regularHours(): { start: string, end: string, status: string } {
    const row = this.regularSchedules.find(item => Number(item.day_of_week) === this.activeWeekday);
    if (!row || !row.is_working_day || !row.start_time || !row.end_time) {
      return { start: '', end: '', status: row ? 'Libur / tidak ada jam kerja' : 'Konfigurasi tidak ditemukan' };
    }
    return { start: row.start_time, end: row.end_time, status: '' };
  }

  get activeWeekday(): number {
    const value = this.scheduleStartDate || new Date().toISOString().substring(0, 10);
    const date = new Date(`${value}T00:00:00`);
    return date.getDay() || 7;
  }

  scheduleTime(schedule: any, field: 'start' | 'end'): string {
    const isRegular = String(schedule?.NamaShift || '').trim().toLowerCase().startsWith('reguler');
    if (isRegular) return field === 'start' ? this.regularHours.start : this.regularHours.end;
    return this.clock(field === 'start' ? schedule?.JamMulai : schedule?.JamSelesai);
  }

  scheduleStatus(schedule: any): string {
    if (!String(schedule?.NamaShift || '').trim().toLowerCase().startsWith('reguler')) return '';
    return this.regularHours.status;
  }

  private clock(value: any): string { return String(value || '').substring(0, 5); }

  async saveSchedule(): Promise<void> {
    if (!this.scheduleForm.HariKerja?.length) { this.alert.error('Hari kerja belum dipilih', 'Pilih minimal satu hari kerja.'); return; }
    if (String(this.scheduleForm.NamaShift || '').trim().toLowerCase().startsWith('reguler')) {
      this.alert.error('Shift Reguler dikelola otomatis', 'Gunakan Pengaturan Umum. Shift Reguler tidak dapat dibuat atau diduplikasi dari daftar ini.');
      return;
    }
    const wasEditing = !!this.editingScheduleId;
    const action = wasEditing ? 'mengubah shift ini' : 'menyimpan shift baru';
    if (!await this.alert.confirm('Konfirmasi perubahan', `Apakah Anda yakin ingin ${action}?`)) return;
    this.isSaving = true;
    
    const formattedDate = this.scheduleForm.Tanggal ? (this.scheduleForm.Tanggal.includes('T') ? this.scheduleForm.Tanggal : `${this.scheduleForm.Tanggal}T00:00:00Z`) : '';
    
    const empId = Number(this.scheduleForm.EmployeeID);
    const isGlobal = !empId || empId === 0;
    const selectedEmployeeIds = isGlobal ? [] : [empId];
    const startTime = this.scheduleForm.JamMulai || this.regularHours.start;
    const endTime = this.scheduleForm.JamSelesai || this.regularHours.end;
    if (!startTime || !endTime) {
      this.isSaving = false;
      this.alert.error('Jam kerja belum tersedia', 'Pilih jam mulai dan jam selesai atau lengkapi konfigurasi hari aktif di Pengaturan Umum.');
      return;
    }
    
    const body = { 
      ...this.scheduleForm, 
      EmployeeID: isGlobal ? null : empId, 
      EmployeeIDs: selectedEmployeeIds, 
      Tanggal: formattedDate, 
      JamMulai: startTime.length === 5 ? `${startTime}:00` : startTime,
      JamSelesai: endTime.length === 5 ? `${endTime}:00` : endTime,
      ToleransiTerlambatMenit: Number(this.scheduleForm.ToleransiTerlambatMenit) 
      ,HariKerja: this.scheduleForm.HariKerja.map((day: string) => Number(day))
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
    const params = new HttpParams().set('page', this.homePage).set('limit', this.homePageSize);
    this.http.get<any>(`${this.api}/admin/home-locations`, { headers: this.headers(), params }).subscribe({
      next: response => {
        this.homeRows = response?.data || [];
        this.homeTotal = Number(response?.total || 0);
        this.homePage = Math.max(1, Number(response?.page || this.homePage));
        this.homePageSize = Number(response?.limit || this.homePageSize);
        this.homeTotalPages = Math.max(1, Number(response?.total_pages || Math.ceil(this.homeTotal / this.homePageSize)));
        if (this.homePage > this.homeTotalPages) {
          this.homePage = this.homeTotalPages;
          this.loadHomeLocations();
          return;
        }
        this.isLoading = false;
        this.loadHomeRequests();
      },
      error: err => this.fail(err)
    });
  }

  loadHomeRequests(): void {
    this.http.get<any>(`${this.api}/admin/home-location-requests`, { headers: this.headers() }).subscribe({ next: response => { this.homeRequests = response?.data || []; this.homePendingCount = Number(response?.pending_count || 0); }, error: err => this.fail(err) });
  }

  async approveHomeRequest(item: any): Promise<void> {
    if (!await this.alert.confirm('Setujui pengajuan lokasi?', 'Lokasi baru akan aktif sesuai tanggal mulai berlaku.')) return;
    this.isSaving = true;
    this.http.post(`${this.api}/admin/home-location-requests/${item.ID}/approve`, {}, { headers: this.headers() }).subscribe({ next: () => { this.isSaving = false; this.closeHomeRequestDetail(); this.alert.success('Pengajuan disetujui'); this.loadHomeLocations(); }, error: err => { this.isSaving = false; this.alert.error('Gagal menyetujui pengajuan', err.error?.error || 'Gagal memproses pengajuan'); } });
  }

  async rejectHomeRequest(item: any): Promise<void> {
    const reason = await this.alert.textarea('Alasan penolakan', 'Tuliskan alasan agar karyawan dapat memperbaiki pengajuan.');
    if (!reason) return;
    this.isSaving = true;
    this.http.post(`${this.api}/admin/home-location-requests/${item.ID}/reject`, { alasan_penolakan: reason }, { headers: this.headers() }).subscribe({ next: () => { this.isSaving = false; this.closeHomeRequestDetail(); this.alert.success('Pengajuan ditolak'); this.loadHomeRequests(); }, error: err => { this.isSaving = false; this.alert.error('Gagal menolak pengajuan', err.error?.error || 'Gagal memproses pengajuan'); } });
  }

  openHomeRequestDetail(item: any): void { this.selectedHomeRequest = item; }
  closeHomeRequestDetail(): void { this.selectedHomeRequest = null; }
  isPendingHomeRequest(item: any): boolean { return item?.Status === 'Menunggu Persetujuan'; }
  isImageAttachment(item: any): boolean {
    const value = String(item?.AttachmentName || item?.AttachmentURL || '').split('?')[0].toLowerCase();
    return /\.(png|jpe?g|webp|gif|bmp|svg)$/.test(value);
  }
  homeMapsUrl(latitude: any, longitude: any, url?: string): string {
    if (url) return url;
    if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) return '';
    return `https://www.google.com/maps?q=${latitude},${longitude}`;
  }

  homePageChanged(page: number): void {
    this.homePage = page;
    this.loadHomeLocations();
  }

  homePageSizeChanged(size: number): void {
    this.homePageSize = size;
    this.homePage = 1;
    this.loadHomeLocations();
  }

  editHome(row: any): void {
    this.selectedHome = row.employee;
    const location = row.location || {};
    this.homeForm = { latitude_rumah: location.LatitudeRumah || row.employee.HomeLatitude || null, longitude_rumah: location.LongitudeRumah || row.employee.HomeLongitude || null, radius_meter: location.RadiusMeter || 100, alamat_rumah: location.AlamatRumah || '', google_maps_url: location.GoogleMapsURL || '' };
  }

  onHomeGoogleMapsUrlChange(): void {
    this.homeForm.latitude_rumah = null;
    this.homeForm.longitude_rumah = null;
  }

  resolveHomeGoogleMapsUrl(): void {
    const url = String(this.homeForm.google_maps_url || '').trim();
    if (!url) return;
    this.http.get<any>(`${this.api}/google-maps/resolve`, { headers: this.headers(), params: { url } }).subscribe({
      next: result => {
        this.homeForm.latitude_rumah = Number(result.latitude);
        this.homeForm.longitude_rumah = Number(result.longitude);
      },
      error: err => this.alert.error('Link Google Maps tidak valid', err.error?.error || 'Koordinat tidak dapat diambil dari link tersebut')
    });
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

  get displayedQuotas(): any[] {
    const start = (this.quotaPage - 1) * this.quotaPageSize;
    return (this.quotas || []).slice(start, start + this.quotaPageSize);
  }

  loadQuotaRows(): void {
    this.http.get<any[]>(`${this.api}/admin/leave-quotas?tahun=${this.quotaForm.tahun}`, { headers: this.headers() }).subscribe({ next: data => { this.quotas = data || []; this.quotaPage = 1; this.isLoading = false; }, error: err => this.failQuota(err) });
  }

  quotaPageChanged(page: number): void {
    this.quotaPage = page;
  }

  quotaPageSizeChanged(size: number): void {
    this.quotaPageSize = size;
    this.quotaPage = 1;
  }

  private failQuota(err: any): void { this.isLoading = false; this.errorMessage = 'Gagal memuat data kuota: ' + (err?.error?.error || 'Unknown error'); }

  editQuota(quota: any): void {
    this.quotaForm = { employee_id: String(quota.EmployeeID), tahun: quota.Tahun, jenis_cuti: quota.JenisCuti, sisa_kuota: quota.SisaKuota };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async saveQuota(): Promise<void> {
    if (!await this.alert.confirm('Simpan kuota?', 'Perubahan kuota cuti akan disimpan.')) return;
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

  toggleWorkDay(day: string): void {
    const selected = new Set<string>((this.scheduleForm.HariKerja || []).map((value: any) => String(value)));
    selected.has(day) ? selected.delete(day) : selected.add(day);
    this.scheduleForm.HariKerja = Array.from(selected).sort((a, b) => Number(a) - Number(b));
  }

  isWorkDaySelected(day: string): boolean { return (this.scheduleForm.HariKerja || []).map((v: any) => String(v)).includes(day); }
  getWorkDaysLabel(value: any): string {
    return this.parseWorkDays(value).map((day: string) => this.workDays.find(item => item.id === day)?.label).filter(Boolean).join(', ');
  }
  private parseWorkDays(value: any): string[] {
    if (Array.isArray(value)) return value.map(v => String(v));
    try { const parsed = JSON.parse(value || '[1,2,3,4,5,6]'); return Array.isArray(parsed) && parsed.length ? parsed.map((v: any) => String(v)) : ['1','2','3','4','5','6']; } catch { return ['1','2','3','4','5','6']; }
  }
  private emptySchedule(): any { return { EmployeeID: '', EmployeeIDs: [], Tanggal: new Date().toISOString().substring(0, 10), NamaShift: 'Reguler', JamMulai: '', JamSelesai: '', ToleransiTerlambatMenit: 10, HariKerja: ['1','2','3','4','5','6'] }; }
  private fail(err: any): void { this.isLoading = false; this.errorMessage = err?.error?.error || 'Gagal memuat data.'; }
}
