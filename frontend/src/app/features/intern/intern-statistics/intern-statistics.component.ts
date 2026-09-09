import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { SharedSidebarComponent } from '../../shared/shared-sidebar/shared-sidebar.component';
import { ReportExportService } from '../../../core/services/report-export.service';

interface ChartBar {
  dayName: string;
  hours: string | number;
  hoursVal: number;
  heightPercent: number;
  dateStr: string;
  status: string;
  jamMasuk?: string;
  jamPulang?: string;
  tipeKerja?: string;
}

@Component({
  selector: 'app-intern-statistics',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, SharedSidebarComponent],
  templateUrl: './intern-statistics.component.html',
  styleUrls: ['./intern-statistics.component.scss']
})
export class InternStatisticsComponent implements OnInit {
  isLoading = true;
  isExportOpen = false;

  start = '';
  end = '';

  stats: any = {
    hadir: 0,
    terlambat: 0,
    izin_disetujui: 0,
    alpha: 0,
    total_days: 0,
    attendance_rate: 100,
    average_checkin_time: '-',
    work_type_stats: { wfo: 0, wfh: 0, remote: 0 },
    logbooks_submitted: 0,
    logbooks_approved: 0,
    daily_trend: []
  };

  weeklyTrend: ChartBar[] = [];

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private reportExport: ReportExportService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    let params = new HttpParams();
    if (this.start) params = params.set('start_date', this.start);
    if (this.end) params = params.set('end_date', this.end);

    this.http.get<any>('http://localhost:8080/api/v1/internship/statistics', {
      params,
      headers: new HttpHeaders().set('Authorization', `Bearer ${this.auth.getToken()}`)
    }).subscribe({
      next: data => {
        this.stats = data || {};
        this.stats.work_type_stats = this.stats.work_type_stats || { wfo: 0, wfh: 0, remote: 0 };
        this.processDailyTrend(this.stats.daily_trend || []);
        this.isLoading = false;
      },
      error: err => {
        console.error('Failed to load intern statistics', err);
        this.isLoading = false;
      }
    });
  }

  processDailyTrend(rawTrend: any[]): void {
    const sorted = [...rawTrend];
    this.weeklyTrend = sorted.map(item => ({
      dayName: item.day_name || 'Harian',
      hours: item.hours || 0,
      hoursVal: parseFloat(item.hours || 0),
      heightPercent: item.height_percent || 0,
      dateStr: item.date_str || item.tanggal || '',
      status: item.status || 'Hadir',
      jamMasuk: item.jam_masuk || '-',
      jamPulang: item.jam_pulang || '-',
      tipeKerja: item.tipe_kerja || 'WFO'
    }));
  }

  get strokeDashoffset(): number {
    const circumference = 282.74;
    const rate = this.stats.attendance_rate || 0;
    return circumference - (rate / 100) * circumference;
  }

  toggleExportDropdown(): void {
    this.isExportOpen = !this.isExportOpen;
  }

  exportCSV(): void {
    this.isExportOpen = false;
    const headers = ['Metric / Tanggal', 'Nilai / Status', 'Tipe Kerja', 'Jam Masuk', 'Jam Pulang', 'Durasi (Jam)'];
    const summaryRows = [
      ['Persentase Kehadiran', `${this.stats.attendance_rate || 0}%`, '', '', '', ''],
      ['Hadir Tepat Waktu', `${this.stats.hadir || 0} Hari`, '', '', '', ''],
      ['Terlambat', `${this.stats.terlambat || 0} Hari`, '', '', '', ''],
      ['Izin & Cuti', `${this.stats.izin_disetujui || 0} Hari`, '', '', '', ''],
      ['Alpha / Mangkir', `${this.stats.alpha || 0} Hari`, '', '', '', ''],
      ['Rata-rata Check-in', `${this.stats.average_checkin_time || '-'}`, '', '', '', ''],
      ['Logbook Disetujui', `${this.stats.logbooks_approved || 0}`, '', '', '', ''],
      ['--- DETIL HARIAN ---', '', '', '', '', '']
    ];
    const trendRows = this.weeklyTrend.map(bar => [
      bar.dateStr,
      bar.status,
      bar.tipeKerja,
      bar.jamMasuk,
      bar.jamPulang,
      bar.hours
    ]);
    this.reportExport.downloadCsv('statistik-kehadiran-magang.csv', headers, [...summaryRows, ...trendRows]);
  }

  exportExcel(): void {
    this.isExportOpen = false;
    const headers = ['Metric / Tanggal', 'Nilai / Status', 'Tipe Kerja', 'Jam Masuk', 'Jam Pulang', 'Durasi (Jam)'];
    const summaryRows = [
      ['Persentase Kehadiran', `${this.stats.attendance_rate || 0}%`, '', '', '', ''],
      ['Hadir Tepat Waktu', `${this.stats.hadir || 0} Hari`, '', '', '', ''],
      ['Terlambat', `${this.stats.terlambat || 0} Hari`, '', '', '', ''],
      ['Izin & Cuti', `${this.stats.izin_disetujui || 0} Hari`, '', '', '', ''],
      ['Alpha / Mangkir', `${this.stats.alpha || 0} Hari`, '', '', '', ''],
      ['Rata-rata Check-in', `${this.stats.average_checkin_time || '-'}`, '', '', '', ''],
      ['Logbook Disetujui', `${this.stats.logbooks_approved || 0}`, '', '', '', ''],
      ['--- DETIL HARIAN ---', '', '', '', '', '']
    ];
    const trendRows = this.weeklyTrend.map(bar => [
      bar.dateStr,
      bar.status,
      bar.tipeKerja,
      bar.jamMasuk,
      bar.jamPulang,
      bar.hours
    ]);
    this.reportExport.downloadExcel('statistik-kehadiran-magang.xls', headers, [...summaryRows, ...trendRows]);
  }

  exportJSON(): void {
    this.isExportOpen = false;
    this.reportExport.downloadJson('statistik-kehadiran-magang.json', this.stats);
  }

  exportPDF(): void {
    this.isExportOpen = false;
    void this.reportExport.downloadStatisticsPdf('statistik-kehadiran-magang.pdf', 'Statistik Kehadiran Magang', this.reportDate(), this.summaryRows(), this.detailHeaders(), this.detailRows());
  }

  printReport(): void {
    this.isExportOpen = false;
    this.reportExport.printStatisticsReport('Statistik Kehadiran Magang', this.reportDate(), this.summaryRows(), this.detailHeaders(), this.detailRows());
  }

  private detailHeaders(): string[] {
    return ['Metric / Tanggal', 'Nilai / Status', 'Tipe Kerja', 'Jam Masuk', 'Jam Pulang', 'Durasi (Jam)'];
  }

  private summaryRows(): unknown[][] {
    return [
      ['Persentase Kehadiran', `${this.stats.attendance_rate || 0}%`, '', '', '', ''],
      ['Hadir Tepat Waktu', `${this.stats.hadir || 0} Hari`, '', '', '', ''],
      ['Terlambat', `${this.stats.terlambat || 0} Hari`, '', '', '', ''],
      ['Izin & Cuti', `${this.stats.izin_disetujui || 0} Hari`, '', '', '', ''],
      ['Alpha / Mangkir', `${this.stats.alpha || 0} Hari`, '', '', '', ''],
      ['Rata-rata Check-in', `${this.stats.average_checkin_time || '-'}`, '', '', '', ''],
      ['Logbook Disetujui', `${this.stats.logbooks_approved || 0}`, '', '', '', ''],
      ['--- DETIL HARIAN ---', '', '', '', '', '']
    ];
  }

  private detailRows(): unknown[][] {
    return this.weeklyTrend.map(bar => [bar.dateStr || '-', bar.status || '-', bar.tipeKerja || '-', bar.jamMasuk || '-', bar.jamPulang || '-', bar.hours || 0]);
  }

  private reportDate(): string {
    return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date());
  }
}

