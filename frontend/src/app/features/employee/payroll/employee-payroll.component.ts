import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedSidebarComponent } from '../../shared/shared-sidebar/shared-sidebar.component';
import { Payroll, PayrollService } from '../../../core/services/payroll.service';
import { AlertService } from '../../../core/services/alert.service';

@Component({ selector: 'app-employee-payroll', standalone: true, imports: [CommonModule, SharedSidebarComponent], templateUrl: './employee-payroll.component.html', styleUrls: ['./employee-payroll.component.scss'] })
export class EmployeePayrollComponent implements OnInit {
  rows: Payroll[] = []; selected?: Payroll; loading = true;
  private readonly monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  constructor(private payroll: PayrollService, private alert: AlertService) {}
  ngOnInit(): void { this.payroll.mine().subscribe({ next: rows => { this.rows = rows || []; this.loading = false; }, error: () => { this.loading = false; } }); }
  preview(row: Payroll): void { this.payroll.mine().subscribe({ next: rows => this.selected = rows.find(item => item.ID === row.ID), error: err => void this.alert.error('Gagal membuka slip', err.error?.error || '') }); }
  close(): void { this.selected = undefined; }
  download(row: Payroll): void { this.payroll.pdf(row.ID, true).subscribe({ next: blob => { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `slip-gaji-${row.employee_code_snapshot}-${row.periode_bulan.slice(0, 7)}.pdf`; link.click(); URL.revokeObjectURL(url); }, error: err => void this.alert.error('Gagal mengunduh PDF', err.error?.error || '') }); }
  money(value: number): string { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value || 0); }
  formatPeriod(value: string | undefined | null): string { const match = String(value || '').match(/^(\d{4})-(\d{2})/); if (!match) return '-'; const month = Number(match[2]); return month >= 1 && month <= 12 ? `${this.monthNames[month - 1]} ${match[1]}` : '-'; }
}
