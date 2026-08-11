import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SharedSidebarComponent } from '../../shared/shared-sidebar/shared-sidebar.component';
import { AppNotification, NotificationService } from '../../../core/services/notification.service';
import { DashboardChartsComponent } from '../../shared/dashboard-charts/dashboard-charts.component';

interface CompanyEvent {
  date: string;
  time: string;
  endTime?: string;
  title: string;
  description: string;
  location?: string;
  type: 'meeting' | 'rapat' | 'info';
  fileAttachmentUrl?: string;
  fileAttachmentName?: string;
}

interface HolidayItem {
  date: string;
  description: string;
}

interface CalendarDay {
  date: number;
  dateKey: string;
  isToday: boolean;
  hasEvents: boolean;
  isHoliday: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, SharedSidebarComponent, DashboardChartsComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  userName = '';
  userEmail = '';
  
  stats: any = {
    hadir_bulan_ini: 0,
    sisa_cuti: 0,
    today_status: 'Belum Absen',
    today_check_in: '',
    today_check_out: '',
    can_check_in: false,
    can_check_out: false,
    attendance_message: ''
  };

  notifications: AppNotification[] = [];
  showNotifications = false;
  currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  selectedDate = this.toDateKey(new Date());
  calendarDays: Array<CalendarDay | null> = [];
  weekDays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  companyEvents: CompanyEvent[] = [];
  holidays: HolidayItem[] = [];
  private refreshTimer?: ReturnType<typeof setInterval>;
  private disconnectRealtime?: () => void;

  constructor(private authService: AuthService, private http: HttpClient, private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.generateCalendar();
    this.loadHolidays();

    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.userName = user.name;
        this.loadProfileEmail();
        this.loadStats();
        this.loadNotifications();
        this.notificationService.enablePush(false).catch(() => undefined);
        this.disconnectRealtime = this.notificationService.connectRealtime(() => this.refreshData());
        this.loadEvents();
        this.refreshTimer = setInterval(() => this.refreshData(), 30_000);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.disconnectRealtime?.();
  }

  private refreshData(): void {
    this.loadStats();
    this.loadNotifications();
    this.loadEvents();
  }

  loadStats(): void {
    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    this.http.get<any>('http://localhost:8080/api/v1/dashboard/employee/stats', { headers }).subscribe({
      next: (data) => {
        this.stats = data;
      },
      error: (err) => {
        console.error('Failed to load stats', err);
      }
    });
  }

  private loadProfileEmail(): void {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    this.http.get<any>('http://localhost:8080/api/v1/employee/profile', { headers }).subscribe({
      next: (profile) => this.userEmail = profile.Email || '',
      error: () => this.userEmail = ''
    });
  }

  loadNotifications(): void {
    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    this.http.get<AppNotification[]>('http://localhost:8080/api/v1/notifications', { headers }).subscribe({
      next: (data) => {
        this.notifications = data || [];
      },
      error: (err) => {
        console.error('Failed to load notifications', err);
      }
    });
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
  }

  markAsRead(notification: AppNotification): void {
    if (notification.StatusBaca) return;
    this.notificationService.markAsRead(notification.ID).subscribe({
      next: () => notification.StatusBaca = true,
      error: (err) => console.error('Failed to mark notification as read', err)
    });
  }

  loadEvents(): void {
    const start = this.toDateKey(this.currentMonth);
    const end = this.toDateKey(new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 0));
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);

    this.http.get<any[]>(`http://localhost:8080/api/v1/events?start=${start}&end=${end}`, { headers }).subscribe({
      next: (data) => {
        this.companyEvents = (data || []).map(event => {
          const description = [
            event.Deskripsi,
            event.Lokasi ? `Lokasi: ${event.Lokasi}` : ''
          ].filter(Boolean).join(' • ');
          const type = event.Tipe === 'rapat' || event.Tipe === 'meeting' ? event.Tipe : 'info';
          return {
            date: String(event.Tanggal).split('T')[0],
            time: event.JamMulai,
            endTime: event.JamSelesai || undefined,
            title: event.Judul,
            description,
            location: event.Lokasi || undefined,
            type,
            fileAttachmentUrl: event.FileAttachmentURL || undefined,
            fileAttachmentName: event.FileAttachmentName || undefined
          };
        });
        this.generateCalendar();
      },
      error: (err) => console.error('Failed to load company events', err)
    });
  }

  loadHolidays(): void {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    this.http.get<any[]>('http://localhost:8080/api/v1/holidays', { headers }).subscribe({
      next: (data) => {
        this.holidays = (data || []).map(item => ({
          date: String(item.Tanggal).split('T')[0],
          description: item.Keterangan || 'Hari Libur'
        }));
        this.generateCalendar();
      },
      error: (err) => console.error('Failed to load holidays', err)
    });
  }

  generateCalendar(): void {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayKey = this.toDateKey(new Date());

    this.calendarDays = Array.from({ length: firstDay }, () => null);

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = this.toDateKey(new Date(year, month, day));
      const holidayCount = this.holidaysForDate(dateKey).length;
      this.calendarDays.push({
        date: day,
        dateKey,
        isToday: dateKey === todayKey,
        hasEvents: this.eventsForDate(dateKey).length > 0 || holidayCount > 0,
        isHoliday: holidayCount > 0
      });
    }
  }

  selectDate(day: CalendarDay | null): void {
    if (day) this.selectedDate = day.dateKey;
  }

  changeMonth(offset: number): void {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() + offset,
      1
    );
    this.selectedDate = this.toDateKey(this.currentMonth);
    this.generateCalendar();
    this.loadEvents();
  }

  goToToday(): void {
    const today = new Date();
    this.currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    this.selectedDate = this.toDateKey(today);
    this.generateCalendar();
    this.loadEvents();
  }

  eventsForDate(dateKey: string): CompanyEvent[] {
    return this.companyEvents.filter(event => event.date === dateKey);
  }

  holidaysForDate(dateKey: string): HolidayItem[] {
    return this.holidays.filter(holiday => holiday.date === dateKey);
  }

  get selectedDateEvents(): CompanyEvent[] {
    return this.eventsForDate(this.selectedDate);
  }

  get selectedDateHolidays(): HolidayItem[] {
    return this.holidaysForDate(this.selectedDate);
  }

  get selectedDateLabel(): string {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    }).format(new Date(`${this.selectedDate}T00:00:00`));
  }

  isImageAttachment(fileUrl?: string, fileName?: string): boolean {
    if (!fileUrl) return false;
    const target = (fileName || fileUrl).toLowerCase();
    return target.endsWith('.png') || target.endsWith('.jpg') || target.endsWith('.jpeg') || target.endsWith('.webp') || target.endsWith('.gif') || target.endsWith('.svg');
  }

  private toDateKey(date: Date): string {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-');
  }

  get unreadCount(): number {
    return this.notifications.filter(n => !n.StatusBaca).length;
  }

  logout(): void {
    this.authService.logout();
  }
}
