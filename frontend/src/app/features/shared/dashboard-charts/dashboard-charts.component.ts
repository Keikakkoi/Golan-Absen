import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { HttpContext } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SKIP_PAGE_LOADING } from '../../../core/interceptors/page-loading-context';
import { DASHBOARD_CHART_THEME } from './dashboard-chart-theme';

export interface ChartValue { label: string; value: number; }
export interface ChartPoint { date: string; hadir: number; terlambat: number; izin: number; alfa: number; }
export interface DashboardChartData {
  attendance_trend: ChartPoint[]; today_status: ChartValue[]; comparison: ChartValue[];
  report_status: ChartValue[]; logbook_status: ChartValue[];
  internship: { progress_percent: number; days_remaining: number };
}

@Component({
  selector: 'app-dashboard-charts', standalone: true, imports: [CommonModule],
  templateUrl: './dashboard-charts.component.html', styleUrls: ['./dashboard-charts.component.scss']
})
export class DashboardChartsComponent implements OnInit, OnDestroy {
  @Input() role: 'admin' | 'manager' | 'employee' | 'intern' = 'employee';
  data: DashboardChartData = this.emptyData();
  loading = true; error = false;
  readonly chartTheme = DASHBOARD_CHART_THEME;
  private disconnect?: () => void;

  constructor(private http: HttpClient, private auth: AuthService, private realtime: NotificationService) {}

  ngOnInit(): void { this.load(); this.disconnect = this.realtime.connectRealtime(() => this.load(true)); }
  ngOnDestroy(): void { this.disconnect?.(); }
  retry(): void { this.load(); }

  load(background = false): void {
    this.loading = true; this.error = false;
    const end = this.dateKey(new Date()); const startDate = new Date(); startDate.setDate(startDate.getDate() - 29);
    const params = `?start_date=${this.dateKey(startDate)}&end_date=${end}&period=30d`;
    const context = new HttpContext().set(SKIP_PAGE_LOADING, background);
    this.http.get<DashboardChartData>(`http://localhost:8080/api/v1/dashboard/charts${params}`, { headers: this.headers(), context }).subscribe({
      next: value => { this.data = this.normalize(value); this.loading = false; },
      error: () => { this.error = true; this.loading = false; }
    });
  }

  get isAdmin(): boolean { return this.role === 'admin'; }
  get isManager(): boolean { return this.role === 'manager'; }
  get isIntern(): boolean { return this.role === 'intern'; }
  get hasTrend(): boolean { return this.data.attendance_trend.length > 0 && this.data.attendance_trend.some(item => this.totalPoint(item) > 0); }
  get hasToday(): boolean { return this.data.today_status.some(item => item.value > 0); }
  get maxTrend(): number { return Math.max(1, ...this.data.attendance_trend.map(item => this.totalPoint(item))); }
  get maxComparison(): number { return Math.max(1, ...this.data.comparison.map(item => item.value)); }
  get maxReports(): number { return Math.max(1, ...this.data.report_status.map(item => item.value)); }
  get maxLogbooks(): number { return Math.max(1, ...this.data.logbook_status.map(item => item.value)); }
  get trendTotal(): number { return this.data.attendance_trend.reduce((sum, item) => sum + this.totalPoint(item), 0); }
  get trendSummary(): Array<{ label: string; key: keyof ChartPoint; value: number; rate: number }> {
    const total = this.trendTotal;
    return [
      { label: 'Hadir', key: 'hadir', value: this.trendValue('hadir'), rate: this.trendRate('hadir', total) },
      { label: 'Terlambat', key: 'terlambat', value: this.trendValue('terlambat'), rate: this.trendRate('terlambat', total) },
      { label: 'Izin/Cuti', key: 'izin', value: this.trendValue('izin'), rate: this.trendRate('izin', total) },
      { label: 'Alfa', key: 'alfa', value: this.trendValue('alfa'), rate: this.trendRate('alfa', total) }
    ];
  }
  totalPoint(item: ChartPoint): number { return Number(item.hadir || 0) + Number(item.terlambat || 0) + Number(item.izin || 0) + Number(item.alfa || 0); }
  private trendValue(key: keyof ChartPoint): number { return this.data.attendance_trend.reduce((sum, item) => sum + Number(item[key] || 0), 0); }
  private trendRate(key: keyof ChartPoint, total: number): number { return total ? Math.round(this.trendValue(key) / total * 100) : 0; }
  linePoints(key: string): string { const points = this.data.attendance_trend; if (!points.length) return ''; return points.map((item, index) => `${(index / Math.max(1, points.length - 1)) * 100},${100 - (Number((item as any)[key]) || 0) / this.maxTrend * 90 - 5}`).join(' '); }
  get donutStyle(): string { const values = this.data.today_status; const total = values.reduce((sum, item) => sum + Number(item.value || 0), 0); if (!total) return '#cbd5e1 0 100%'; let offset = 0; return `conic-gradient(${values.map(item => { const next = offset + Number(item.value || 0) / total * 100; const segment = `${this.color(item.label)} ${offset}% ${next}%`; offset = next; return segment; }).join(',')})`; }
  barHeight(value: number, max: number): number { return max ? Math.max(3, value / max * 100) : 0; }
  dateLabel(value: string): string { return value ? new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' }).format(new Date(`${value}T00:00:00`)) : '-'; }
  color(label: string): string { const key = label.toLowerCase(); if (key.includes('hadir') || key.includes('approved') || key.includes('selesai')) return this.chartTheme.status.hadir; if (key.includes('izin') || key.includes('cuti') || key.includes('submitted')) return this.chartTheme.status.izin; if (key.includes('terlambat') || key.includes('late')) return this.chartTheme.status.terlambat; if (key.includes('alfa') || key.includes('reject') || key.includes('ditolak')) return this.chartTheme.status.alfa; if (key.includes('pending')) return this.chartTheme.status.pending; return this.chartTheme.status.neutral; }
  track(_: number, item: ChartValue): string { return item.label; }
  private normalize(value: DashboardChartData | null): DashboardChartData { const safe = value || this.emptyData(); return { attendance_trend: safe.attendance_trend || [], today_status: safe.today_status || [], comparison: safe.comparison || [], report_status: safe.report_status || [], logbook_status: safe.logbook_status || [], internship: safe.internship || { progress_percent: 0, days_remaining: 0 } }; }
  private emptyData(): DashboardChartData { return { attendance_trend: [], today_status: [], comparison: [], report_status: [], logbook_status: [], internship: { progress_percent: 0, days_remaining: 0 } }; }
  private dateKey(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
  private headers(): HttpHeaders { return new HttpHeaders().set('Authorization', `Bearer ${this.auth.getToken()}`); }
}
