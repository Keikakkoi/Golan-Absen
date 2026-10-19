import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AttendanceService } from '../../../core/services/attendance.service';
import { SharedSidebarComponent } from '../../shared/shared-sidebar/shared-sidebar.component';

interface ChartBar {
  dayName: string;
  hours: number;
  heightPercent: number;
  dateStr: string;
}

@Component({
  selector: 'app-statistics',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, SharedSidebarComponent],
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.scss']
})
export class StatisticsComponent implements OnInit {
  records: any[] = [];
  isLoading = true;
  start = '';
  end = '';
  validationError = '';
  loadError = '';

  // General Counters
  totalDays = 0;
  countHadir = 0;
  countIzin = 0;
  countCuti = 0;
  countTerlambat = 0;
  countAlpha = 0;

  attendanceRate = 0;
  averageCheckInTime = '-';
  workTypeStats = {
    wfo: 0,
    wfh: 0,
    dinasLuar: 0
  };

  // SVG Chart data
  weeklyTrend: ChartBar[] = [];

  constructor(private attendanceService: AttendanceService) {}

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    if (!this.isValidDateRange()) {
      this.records = [];
      this.calculateMetrics();
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.loadError = '';
    this.attendanceService.getHistory(this.start || undefined, this.end || undefined).subscribe({
      next: (data) => {
        this.records = data || [];
        this.calculateMetrics();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load stats data', err);
        this.loadError = 'Data statistik tidak dapat dimuat. Silakan coba lagi.';
        this.isLoading = false;
      }
    });
  }

  onDateFilterChange(): void {
    if (!this.isValidDateRange()) {
      this.validationError = 'Tanggal mulai tidak boleh lebih besar dari tanggal selesai.';
      this.records = [];
      this.calculateMetrics();
      this.isLoading = false;
      return;
    }

    this.validationError = '';
    this.loadStats();
  }

  private isValidDateRange(): boolean {
    return !this.start || !this.end || this.start <= this.end;
  }

  calculateMetrics(): void {
    this.totalDays = this.records.length;
    
    this.countHadir = 0;
    this.countIzin = 0;
    this.countCuti = 0;
    this.countTerlambat = 0;
    this.countAlpha = 0;
    this.workTypeStats = { wfo: 0, wfh: 0, dinasLuar: 0 };

    let totalCheckInSecs = 0;
    let checkInCount = 0;

    // Process last 7 records for the chart
    const last7 = [...this.records]
      .sort((a, b) => new Date(a.Tanggal).getTime() - new Date(b.Tanggal).getTime())
      .slice(-7);

    this.weeklyTrend = last7.map(rec => {
      let hours = 0;
      if (rec.JamMasuk && rec.JamPulang) {
        const diffMs = new Date(rec.JamPulang).getTime() - new Date(rec.JamMasuk).getTime();
        hours = Math.max(0, parseFloat((diffMs / 3600000).toFixed(1)));
      }

      // Max scale is 12 hours for visual presentation
      const heightPercent = Math.min(100, Math.round((hours / 12) * 100));
      const dateObj = new Date(`${String(rec.Tanggal).slice(0, 10)}T00:00:00+07:00`);
      const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jakarta', weekday: 'short' }).format(dateObj);
      const dayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
      const dateStr = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short' }).format(dateObj);
      
      return {
        dayName: days[dayIndex >= 0 ? dayIndex : dateObj.getDay()],
        hours: hours,
        heightPercent: heightPercent,
        dateStr
      };
    });

    // Populate overall statistics
    this.records.forEach(rec => {
      // Counters by status
      const status = String(rec.Status || '').trim();
      const isLate = status === 'Terlambat' || rec.IsLate === true || Number(rec.LateDurationMinutes) > 0;
      if (isLate) this.countTerlambat++;
      else if (status === 'Hadir') this.countHadir++;
      else if (status === 'Izin') this.countIzin++;
      else if (status === 'Cuti') this.countCuti++;
      else if (status === 'Alpha') this.countAlpha++;

      // Counters by work type
      const tipe = String(rec.TipeKerja || 'WFO').trim().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').toUpperCase();
      if (tipe === 'WFO') this.workTypeStats.wfo++;
      else if (tipe === 'WFH') this.workTypeStats.wfh++;
      else if (tipe === 'DINAS LUAR' || tipe === 'REMOTE') this.workTypeStats.dinasLuar++;

      // Check-in times analysis
      if (rec.JamMasuk) {
        const timePart = new Date(rec.JamMasuk);
        const parts = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        }).formatToParts(timePart);
        const getPart = (type: string) => Number(parts.find(part => part.type === type)?.value || 0);
        const secs = getPart('hour') * 3600 + getPart('minute') * 60 + getPart('second');
        totalCheckInSecs += secs;
        checkInCount++;
      }
    });

    // Attendance Rate (all Hadir records count as present)
    const presentCount = this.countHadir + this.countTerlambat;
    this.attendanceRate = this.totalDays > 0 
      ? Math.round((presentCount / this.totalDays) * 100) 
      : 100;

    // Average check-in time calculation
    if (checkInCount > 0) {
      const avgSecs = Math.round(totalCheckInSecs / checkInCount);
      const h = Math.floor(avgSecs / 3600).toString().padStart(2, '0');
      const m = Math.floor((avgSecs % 3600) / 60).toString().padStart(2, '0');
      const s = (avgSecs % 60).toString().padStart(2, '0');
      this.averageCheckInTime = `${h}:${m}:${s}`;
    } else {
      this.averageCheckInTime = '-';
    }
  }

  get strokeDashoffset(): number {
    // Circumference of circular path with r=45 is 2 * PI * 45 = 282.74
    const circumference = 282.74;
    return circumference - (this.attendanceRate / 100) * circumference;
  }
}
