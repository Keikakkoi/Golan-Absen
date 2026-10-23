import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedSidebarComponent } from '../../shared/shared-sidebar/shared-sidebar.component';
import { PAYROLL_COMPANY_CODE, PAYROLL_COMPANY_NAME, PAYROLL_TAKE_HOME_PAY_SUBTITLE, Payroll, PayrollService } from '../../../core/services/payroll.service';
import { AlertService } from '../../../core/services/alert.service';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';

@Component({ selector: 'app-employee-payroll', standalone: true, imports: [CommonModule, SharedSidebarComponent, PaginationComponent], templateUrl: './employee-payroll.component.html', styleUrls: ['./employee-payroll.component.scss'] })
export class EmployeePayrollComponent implements OnInit {
  readonly companyName = PAYROLL_COMPANY_NAME;
  readonly takeHomePaySubtitle = PAYROLL_TAKE_HOME_PAY_SUBTITLE;
  rows: Payroll[] = []; selected?: Payroll; loading = true; errorMessage = '';
  page = 1; limit = 10; total = 0; totalPages = 0;
  readonly pageSizeOptions = [10, 25, 50, 100];
  private readonly monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  constructor(private payroll: PayrollService, private alert: AlertService) {}
  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.payroll.mine(this.page, this.limit).subscribe({
      next: response => {
        this.rows = response.data || [];
        this.total = Number(response.total) || 0;
        this.page = Number(response.page) || 1;
        this.limit = Number(response.limit || response.per_page) || this.limit;
        this.totalPages = Number(response.total_pages) || 0;
        this.loading = false;
      },
      error: err => {
        this.rows = [];
        this.total = 0;
        this.totalPages = 0;
        this.errorMessage = err.error?.error || 'Gagal memuat slip gaji.';
        this.loading = false;
      }
    });
  }
  pageChanged(page: number): void { if (this.loading || page < 1 || page > this.totalPages || page === this.page) return; this.page = page; this.load(); }
  pageSizeChanged(limit: number): void { if (this.loading || limit === this.limit) return; this.limit = Number(limit); this.page = 1; this.load(); }
  preview(row: Payroll): void { this.selected = row; }
  close(): void { this.selected = undefined; }
  companyCodeValue(row?: Payroll): string { return row?.company_phone_snapshot?.trim() || PAYROLL_COMPANY_CODE; }
  download(row: Payroll): void { this.payroll.pdf(row.ID, true).subscribe({ next: blob => { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `slip-gaji-${row.employee_code_snapshot}-${row.periode_bulan.slice(0, 7)}.pdf`; link.click(); URL.revokeObjectURL(url); }, error: err => void this.alert.error('Gagal mengunduh PDF', err.error?.error || '') }); }
  money(value: number): string { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value || 0); }
  hasPayrollComponent(row: Payroll | undefined, type: 'income' | 'deduction', name: string): boolean { return !!row?.items?.some(item => item.type === type && String(item.name || '').trim().toLowerCase() === name.toLowerCase()); }
  formatPeriod(value: string | undefined | null): string { const match = String(value || '').match(/^(\d{4})-(\d{2})/); if (!match) return '-'; const month = Number(match[2]); return month >= 1 && month <= 12 ? `${this.monthNames[month - 1]} ${match[1]}` : '-'; }
}
