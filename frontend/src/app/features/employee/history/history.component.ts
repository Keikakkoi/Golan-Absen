import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AttendanceService } from '../../../core/services/attendance.service';
import { SharedSidebarComponent } from '../../shared/shared-sidebar/shared-sidebar.component';
import { UiSkeletonComponent } from '../../../shared/ui-skeleton/ui-skeleton.component';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, SharedSidebarComponent, UiSkeletonComponent],
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss']
})
export class HistoryComponent implements OnInit {
  records: any[] = [];
  isLoading = true;
  viewMode: 'table' | 'calendar' = 'table';
  
  // Calendar data
  currentMonth: Date = new Date();
  calendarDays: any[] = [];
  weekDays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  constructor(private attendanceService: AttendanceService) {}

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData(): void {
    this.isLoading = true;
    this.attendanceService.getHistory().subscribe({
      next: (data) => {
        this.records = data;
        this.isLoading = false;
        this.generateCalendar();
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  toggleView(mode: 'table' | 'calendar'): void {
    this.viewMode = mode;
  }

  selectedRecord: any = null;

  openDetail(record: any): void {
    this.selectedRecord = record;
  }

  closeDetail(): void {
    this.selectedRecord = null;
  }

  getStatusShort(status: string): string {
    const labels: Record<string, string> = {
      Hadir: 'H',
      Izin: 'I',
      Cuti: 'C',
      Alpha: 'A',
      'Tidak Hadir': 'A'
    };
    return labels[status] || status.slice(0, 2).toUpperCase();
  }

  getWorkDuration(rec: any): string {
    if (!rec.JamMasuk || !rec.JamPulang) return '-';
    const entry = new Date(rec.JamMasuk);
    const exit = new Date(rec.JamPulang);
    const diffMs = exit.getTime() - entry.getTime();
    if (diffMs < 0) return '-';
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffMins = Math.floor((diffMs % 3600000) / 60000);
    return `${diffHrs} jam ${diffMins} menit`;
  }

  generateCalendar(): void {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    this.calendarDays = [];
    
    // Empty slots before first day
    for (let i = 0; i < firstDay; i++) {
      this.calendarDays.push(null);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
      const record = this.records.find(r => r.Tanggal.startsWith(dateStr));
      this.calendarDays.push({
        date: i,
        record: record
      });
    }
  }

  prevMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
    this.generateCalendar();
  }

  nextMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
    this.generateCalendar();
  }
}
