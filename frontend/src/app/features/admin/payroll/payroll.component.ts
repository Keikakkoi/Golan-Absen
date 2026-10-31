import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { PAYROLL_COMPANY_CONTACT, PAYROLL_COMPANY_NAME, PAYROLL_TAKE_HOME_PAY_SUBTITLE, Payroll, PayrollItem, PayrollService } from '../../../core/services/payroll.service';
import { environment } from '../../../../environments/environment';
import { Subscription } from 'rxjs';
import { DatePickerComponent } from '../../../shared/date-picker/date-picker.component';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';

interface DirectoryEmployee { employee_id: number; Nama: string; Role?: string; role?: string; Employee?: { employee_code?: string; EmployeeCode?: string; Division?: { NamaDivisi?: string }; Position?: { NamaJabatan?: string }; NIK?: string }; Status: string; }

@Component({ selector: 'app-payroll', standalone: true, imports: [CommonModule, FormsModule, AdminSidebarComponent, DatePickerComponent, PaginationComponent], templateUrl: './payroll.component.html', styleUrls: ['./payroll.component.scss'] })
export class PayrollComponent implements OnInit, OnDestroy {
  readonly companyName = PAYROLL_COMPANY_NAME;
  readonly companyContact = PAYROLL_COMPANY_CONTACT;
  readonly takeHomePaySubtitle = PAYROLL_TAKE_HOME_PAY_SUBTITLE;
  readonly internPayrollMessage = 'Peserta magang belum dapat diproses dalam penggajian karena status penggajiannya belum tersedia pada versi sekarang.';
  rows: Payroll[] = []; employees: DirectoryEmployee[] = []; divisions: string[] = [];
  isLoading = true; isSaving = false; errorMessage = ''; page = 1; totalPages = 1; totalRows = 0;
  readonly pageSizeOptions = [10, 25, 50, 100];
  isCalculatingWorkDays = false;
  filters = { month: '', year: '', employee_id: '', division: '', status: '', limit: 10 };

  statusClass(status: string): string {
    const normalized = String(status || '').trim().toLowerCase();
    if (normalized === 'published') return 'status-published';
    if (normalized === 'draft') return 'status-draft';
    return 'status-neutral';
  }
  readonly monthOptions = [
    { value: '1', label: 'Januari' }, { value: '2', label: 'Februari' },
    { value: '3', label: 'Maret' }, { value: '4', label: 'April' },
    { value: '5', label: 'Mei' }, { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' }, { value: '8', label: 'Agustus' },
    { value: '9', label: 'September' }, { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' }, { value: '12', label: 'Desember' }
  ];
  readonly yearOptions = Array.from(
    { length: new Date().getFullYear() - 2000 + 6 },
    (_, index) => String(2000 + index)
  ).reverse();
  isEditorOpen = false; isPreviewOpen = false; editingID: number | null = null; selected?: Payroll;
  form: any = this.emptyForm();
  employeeDetails = { position: '-', role: '-', code: '-' };
  private currentUser: { name?: string; jabatan?: string } = {};
  private userSubscription?: Subscription;

  constructor(private payroll: PayrollService, private http: HttpClient, private auth: AuthService, private alert: AlertService) {}
  ngOnInit(): void {
    this.userSubscription = this.auth.currentUser$.subscribe(user => {
      this.currentUser = user || {};
      this.syncApproverFields();
    });
    this.loadEmployees();
    this.load();
  }
  ngOnDestroy(): void { this.userSubscription?.unsubscribe(); }
  private headers(): HttpHeaders { return new HttpHeaders().set('Authorization', `Bearer ${this.auth.getToken()}`); }
  load(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.payroll.list({ ...this.filters, page: this.page }).subscribe({
      next: data => {
        this.rows = data.data || [];
        this.totalRows = Number(data.total) || 0;
        this.page = Number(data.page) || 1;
        this.filters.limit = Number(data.limit || data.per_page) || this.filters.limit;
        this.totalPages = Number(data.total_pages) || 0;
        this.isLoading = false;
      },
      error: err => {
        this.errorMessage = err.error?.error || 'Gagal memuat daftar slip gaji.';
        this.isLoading = false;
      }
    });
  }
  loadEmployees(): void { this.http.get<DirectoryEmployee[]>(`${environment.apiUrl}/admin/employees`, { headers: this.headers() }).subscribe({ next: employees => { this.employees = (employees || []).filter(employee => employee.employee_id && (String(employee.Status || '').toLowerCase() === 'aktif' || this.isInternEmployee(employee))); this.divisions = [...new Set(this.employees.map(e => e.Employee?.Division?.NamaDivisi || '').filter(Boolean))].sort(); if (this.form.employee_id) this.onEmployeeSelected(this.form.employee_id); }, error: () => undefined }); }
  applyFilters(): void { this.page = 1; this.load(); }
  resetFilters(): void { this.filters = { month: '', year: '', employee_id: '', division: '', status: '', limit: 10 }; this.applyFilters(); }
  changePage(page: number): void { if (this.isLoading || page < 1 || page > this.totalPages || page === this.page) return; this.page = page; this.load(); }
  pageSizeChanged(limit: number): void { if (this.isLoading || limit === this.filters.limit) return; this.filters.limit = Number(limit); this.page = 1; this.load(); }
  emptyForm(): any { const now = new Date(); return { employee_id: '', periode_bulan: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`, payroll_cutoff_start: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, payroll_cutoff_end: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`, payment_date: '', company_phone: PAYROLL_COMPANY_CONTACT.phone, total_hari_kerja: 0, notes: '', approved_by_name: '', approved_by_position: '', received_by_name: '', received_by_position: '', incomes: [{ name: 'Gaji pokok', amount: 0 }, { name: 'Uang makan', amount: 0 }, { name: 'Uang Transportasi', amount: 0 }], deductions: [{ name: 'PPh 21', amount: 0 }, { name: 'BPJS Kesehatan', amount: 0 }, { name: 'BPJS Ketenagakerjaan', amount: 0 }] }; }
  openCreate(): void { this.editingID = null; this.form = this.emptyForm(); this.resetEmployeeDetails(); this.syncApproverFields(); this.isEditorOpen = true; this.isPreviewOpen = false; }
  edit(row: Payroll): void {
    if (this.isInternEmployee(this.employees.find(employee => employee.employee_id === row.employee_id))) {
      void this.alert.info('Penggajian Peserta Magang Dikunci', this.internPayrollMessage);
      return;
    }
    this.payroll.detail(row.ID).subscribe({ next: detail => { this.editingID = detail.ID; this.form = this.formFromPayroll(detail); this.syncApproverFields(); this.onEmployeeSelected(this.form.employee_id); this.isEditorOpen = true; this.isPreviewOpen = false; }, error: err => void this.alert.error('Gagal membuka slip', err.error?.error || '') });
  }
  formFromPayroll(row: Payroll): any {
    const incomes = this.ensureComponent((row.items || []).filter(i => i.type === 'income').map(i => ({ name: i.name, amount: i.amount })), 'Uang Transportasi', Number(row.uang_transportasi) || 0);
    const deductions = this.ensureComponent((row.items || []).filter(i => i.type === 'deduction').map(i => ({ name: i.name, amount: i.amount })), 'BPJS Ketenagakerjaan', Number(row.bpjs_ketenagakerjaan) || 0);
    return { employee_id: row.employee_id, periode_bulan: row.periode_bulan?.slice(0, 7), payroll_cutoff_start: row.payroll_cutoff_start?.slice(0, 10), payroll_cutoff_end: row.payroll_cutoff_end?.slice(0, 10), payment_date: row.payment_date?.slice(0, 10), company_phone: PAYROLL_COMPANY_CONTACT.phone, total_hari_kerja: row.total_hari_kerja, notes: row.notes || '', approved_by_name: row.approved_by_name || '', approved_by_position: row.approved_by_position || '', received_by_name: row.received_by_name || '', received_by_position: row.received_by_position || '', incomes, deductions };
  }
  private ensureComponent(items: any[], name: string, amount: number): any[] { return items.some(item => String(item.name || '').trim().toLowerCase() === name.toLowerCase()) ? items : [...items, { name, amount }]; }
  syncApproverFields(): void { this.form.approved_by_name = this.currentUser.name || localStorage.getItem('name') || ''; this.form.approved_by_position = this.currentUser.jabatan || localStorage.getItem('jabatan') || ''; }
  onEmployeeSelected(employeeID: number | string): void {
    const employee = this.employees.find(item => item.employee_id === Number(employeeID));
    this.employeeDetails = {
      position: this.displayValue(employee?.Employee?.Position?.NamaJabatan),
      role: this.displayValue(employee?.Role || employee?.role),
      code: this.employeeCode(employee)
    };
    this.form.received_by_name = employee?.Nama || '';
    this.form.received_by_position = employee?.Employee?.Position?.NamaJabatan || '';
    if (this.isInternEmployee(employee)) {
      void this.alert.info('Penggajian Peserta Magang Dikunci', this.internPayrollMessage);
      this.isCalculatingWorkDays = false;
      this.form.total_hari_kerja = 0;
      return;
    }
    this.recalculateWorkDays();
  }
  employeeCode(employee?: DirectoryEmployee): string { return this.displayValue(employee?.Employee?.employee_code || employee?.Employee?.EmployeeCode); }
  private displayValue(value: string | null | undefined): string { const normalized = String(value || '').trim(); return normalized || '-'; }
  private resetEmployeeDetails(): void { this.employeeDetails = { position: '-', role: '-', code: '-' }; }
  isInternEmployee(employee?: DirectoryEmployee): boolean {
    const role = String(employee?.Role || employee?.role || '').trim().toUpperCase();
    return role === 'MAGANG' || String(employee?.Status || '').trim().toUpperCase() === 'MAGANG';
  }
  get selectedEmployeeIsIntern(): boolean {
    return this.isInternEmployee(this.employees.find(item => item.employee_id === Number(this.form.employee_id)));
  }
  onCutoffChanged(): void { this.recalculateWorkDays(); }
  private recalculateWorkDays(): void {
    const employeeID = Number(this.form.employee_id);
    const startDate = String(this.form.payroll_cutoff_start || '');
    const endDate = String(this.form.payroll_cutoff_end || '');
    if (!employeeID || !startDate || !endDate || startDate > endDate) {
      this.isCalculatingWorkDays = false;
      this.form.total_hari_kerja = 0;
      return;
    }
    this.isCalculatingWorkDays = true;
    this.payroll.attendanceDays(employeeID, startDate, endDate).subscribe({
      next: result => { this.form.total_hari_kerja = Math.max(0, Math.trunc(Number(result?.total_hari_kerja) || 0)); this.isCalculatingWorkDays = false; },
      error: () => { this.form.total_hari_kerja = 0; this.isCalculatingWorkDays = false; }
    });
  }
  closeEditor(): void { this.isEditorOpen = false; this.isPreviewOpen = false; }
  addItem(type: 'income' | 'deduction'): void { (type === 'income' ? this.form.incomes : this.form.deductions).push({ name: '', amount: 0 }); }
  removeItem(type: 'income' | 'deduction', index: number): void { const items = type === 'income' ? this.form.incomes : this.form.deductions; if (items.length > 1) items.splice(index, 1); }
  total(items: { amount: number }[]): number { return items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0); }
  get totalIncome(): number { return this.total(this.form.incomes || []); }
  get totalDeduction(): number { return this.total(this.form.deductions || []); }
  get takeHomePay(): number { return this.totalIncome - this.totalDeduction; }
  get hasInvalidCutoffRange(): boolean {
    const start = String(this.form.payroll_cutoff_start || '');
    const end = String(this.form.payroll_cutoff_end || '');
    return !start || !end || start > end;
  }
  private componentAmount(items: any[], name: string): number { const item = (items || []).find(candidate => String(candidate.name || '').trim().toLowerCase() === name.toLowerCase()); return Number(item?.amount) || 0; }
  private payload(): any { return { employee_id: Number(this.form.employee_id), periode_bulan: this.form.periode_bulan, payroll_cutoff_start: this.form.payroll_cutoff_start, payroll_cutoff_end: this.form.payroll_cutoff_end, payment_date: this.form.payment_date, company_phone: PAYROLL_COMPANY_CONTACT.phone, total_hari_kerja: Number(this.form.total_hari_kerja), uang_transportasi: this.componentAmount(this.form.incomes, 'Uang Transportasi'), bpjs_ketenagakerjaan: this.componentAmount(this.form.deductions, 'BPJS Ketenagakerjaan'), notes: this.form.notes, approved_by_name: this.form.approved_by_name, approved_by_position: this.form.approved_by_position, received_by_name: this.form.received_by_name, received_by_position: this.form.received_by_position, items: [...this.form.incomes.map((i: any) => ({ type: 'income', name: i.name, amount: Number(i.amount) || 0 })), ...this.form.deductions.map((i: any) => ({ type: 'deduction', name: i.name, amount: Number(i.amount) || 0 }))] }; }
  async save(): Promise<void> {
    if (this.selectedEmployeeIsIntern) {
      await this.alert.info('Penggajian Peserta Magang Dikunci', this.internPayrollMessage);
      return;
    }
    if (this.isCalculatingWorkDays || !this.form.employee_id || !this.form.periode_bulan || this.hasInvalidCutoffRange || this.form.total_hari_kerja === '' || Number(this.form.total_hari_kerja) < 0 || !this.form.payment_date || this.takeHomePay < 0) { await this.alert.error('Data belum valid', this.isCalculatingWorkDays ? 'Tunggu sampai total hari kerja selesai dihitung.' : 'Lengkapi data dan pastikan rentang cut-off serta Take Home Pay valid.'); return; } this.isSaving = true; const request = this.editingID ? this.payroll.update(this.editingID, this.payload()) : this.payroll.create(this.payload()); request.subscribe({ next: async () => { this.isSaving = false; this.closeEditor(); this.load(); await this.alert.success('Slip gaji disimpan'); }, error: async err => { this.isSaving = false; await this.alert.error('Gagal menyimpan slip', err.error?.error || 'Periksa kembali data slip.'); } });
  }
  async publish(row: Payroll): Promise<void> {
    if (this.isInternEmployee(this.employees.find(employee => employee.employee_id === row.employee_id))) { await this.alert.info('Penggajian Peserta Magang Dikunci', this.internPayrollMessage); return; }
    if (await this.alert.confirm('Terbitkan slip gaji?', 'Slip Published tidak dapat diedit atau dihapus.')) this.payroll.publish(row.ID).subscribe({ next: () => { this.load(); void this.alert.success('Slip gaji diterbitkan'); }, error: err => void this.alert.error('Gagal menerbitkan slip', err.error?.error || '') });
  }
  async remove(row: Payroll): Promise<void> {
    if (this.isInternEmployee(this.employees.find(employee => employee.employee_id === row.employee_id))) { await this.alert.info('Penggajian Peserta Magang Dikunci', this.internPayrollMessage); return; }
    if (row.status !== 'Draft' || !await this.alert.confirm('Hapus slip gaji?', 'Slip Draft ini akan dihapus permanen.', 'Ya, hapus')) return; this.payroll.remove(row.ID).subscribe({ next: () => { this.load(); void this.alert.success('Slip gaji dihapus'); }, error: err => void this.alert.error('Gagal menghapus slip', err.error?.error || '') });
  }
  preview(row: Payroll): void { this.payroll.detail(row.ID).subscribe({ next: detail => { this.selected = detail; this.isPreviewOpen = true; }, error: err => void this.alert.error('Gagal membuka Preview', err.error?.error || '') }); }
  previewEditor(): void {
    if (this.selectedEmployeeIsIntern) {
      void this.alert.info('Penggajian Peserta Magang Dikunci', this.internPayrollMessage);
      return;
    }
    const employee = this.employees.find(item => item.employee_id === Number(this.form.employee_id));
     this.selected = { ...this.payload(), ID: this.editingID || 0, employee_name_snapshot: employee?.Nama || '-', employee_code_snapshot: this.employeeCode(employee), nik_snapshot: employee?.Employee?.NIK || '', position_snapshot: employee?.Employee?.Position?.NamaJabatan || '', division_snapshot: employee?.Employee?.Division?.NamaDivisi || '', company_name_snapshot: PAYROLL_COMPANY_NAME, company_phone_snapshot: PAYROLL_COMPANY_CONTACT.phone, uang_transportasi: this.componentAmount(this.form.incomes, 'Uang Transportasi'), bpjs_ketenagakerjaan: this.componentAmount(this.form.deductions, 'BPJS Ketenagakerjaan'), total_income: this.totalIncome, total_deduction: this.totalDeduction, take_home_pay: this.takeHomePay, status: 'Draft', items: this.payload().items } as Payroll;
    this.isPreviewOpen = true;
  }
  download(row: Payroll): void { this.payroll.pdf(row.ID).subscribe({ next: blob => { const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `slip-gaji-${row.employee_code_snapshot}-${row.periode_bulan.slice(0, 7)}.pdf`; link.click(); URL.revokeObjectURL(link.href); }, error: err => void this.alert.error('Gagal mengunduh PDF', err.error?.error || '') }); }
  employeeLabel(employeeID: number): string { const employee = this.employees.find(e => e.employee_id === employeeID); return employee ? `${employee.Nama} (${this.employeeCode(employee)})` : '-'; }
  formatMoney(value: number): string { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value || 0); }
  hasPayrollComponent(row: Payroll | undefined, type: 'income' | 'deduction', name: string): boolean { return !!row?.items?.some(item => item.type === type && String(item.name || '').trim().toLowerCase() === name.toLowerCase()); }
  formatPeriod(value: string | undefined | null): string {
    const match = String(value || '').match(/^(\d{4})-(\d{2})/);
    if (!match) return '-';
    const month = Number(match[2]);
    return month >= 1 && month <= 12 ? `${this.monthOptions[month - 1].label} ${match[1]}` : '-';
  }
}
