import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';

interface CompanyEvent {
  ID: number;
  Tanggal: string;
  JamMulai: string;
  JamSelesai: string;
  Judul: string;
  Tipe: string;
  Deskripsi: string;
  Lokasi: string;
  StatusAktif: boolean;
}

interface CalendarDay {
  date: number;
  dateKey: string;
  isToday: boolean;
  hasEvents: boolean;
  isHoliday?: boolean;
}

interface HolidayItem {
  date: string;
  description: string;
}

@Component({
  selector: 'app-admin-events',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminSidebarComponent],
  templateUrl: './admin-events.component.html',
  styleUrls: ['./admin-events.component.scss']
})
export class AdminEventsComponent implements OnInit {
  currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  selectedYear = new Date().getFullYear();
  availableYears: number[] = [];
  selectedDate = this.toDateKey(new Date());
  calendarDays: Array<CalendarDay | null> = [];
  weekDays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  events: CompanyEvent[] = [];
  holidays: HolidayItem[] = [];
  isLoading = false;
  isSaving = false;
  showModal = false;
  errorMessage = '';

  tableFilters = {
    start_date: '',
    end_date: ''
  };
  tableEvents: CompanyEvent[] = [];
  isLoadingTable = false;

  form = this.emptyForm();
  private readonly baseUrl = 'http://localhost:8080/api/v1/admin/events';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private alert: AlertService
  ) {}

  ngOnInit(): void {
    const today = new Date();
    
    // Initialize available years (5 years back, 5 years forward)
    for (let i = today.getFullYear() - 5; i <= today.getFullYear() + 5; i++) {
      this.availableYears.push(i);
    }

    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    this.tableFilters.start_date = this.toDateKey(firstDay);
    this.tableFilters.end_date = this.toDateKey(lastDay);

    this.generateCalendar();
    this.loadHolidays();
    this.loadEvents();
    this.loadTableEvents();
  }

  getHeaders(): HttpHeaders {
    return new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
  }

  loadEvents(): void {
    const start = this.toDateKey(this.currentMonth);
    const end = this.toDateKey(new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 0));
    this.isLoading = true;
    this.http.get<CompanyEvent[]>(`${this.baseUrl}?start=${start}&end=${end}`, { headers: this.getHeaders() }).subscribe({
      next: (data) => {
        this.events = data || [];
        this.isLoading = false;
        this.generateCalendar();
      },
      error: (err) => {
        this.errorMessage = this.apiError(err, 'Gagal memuat event perusahaan.');
        this.isLoading = false;
      }
    });
  }

  loadTableEvents(): void {
    if (!this.tableFilters.start_date || !this.tableFilters.end_date) return;
    this.isLoadingTable = true;
    const start = this.tableFilters.start_date;
    const end = this.tableFilters.end_date;
    this.http.get<CompanyEvent[]>(`${this.baseUrl}?start=${start}&end=${end}`, { headers: this.getHeaders() }).subscribe({
      next: (data) => {
        this.tableEvents = data || [];
        this.isLoadingTable = false;
      },
      error: (err) => {
        console.error('Failed to load table events', err);
        this.isLoadingTable = false;
      }
    });
  }

  onTableFilterChange(): void {
    this.loadTableEvents();
  }

  loadHolidays(): void {
    this.http.get<any[]>('http://localhost:8080/api/v1/holidays', { headers: this.getHeaders() }).subscribe({
      next: (data) => {
        this.holidays = (data || []).map(item => ({
          date: String(item.Tanggal).split('T')[0],
          description: item.Keterangan || 'Hari Libur'
        }));
        this.generateCalendar();
      },
      error: (err) => {
        console.error('Failed to load holidays', err);
      }
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
        hasEvents: this.eventsForDate(dateKey).length > 0,
        isHoliday: holidayCount > 0
      });
    }
  }

  holidaysForDate(dateKey: string): HolidayItem[] {
    return this.holidays.filter(holiday => holiday.date === dateKey);
  }

  changeMonth(offset: number): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + offset, 1);
    this.selectedYear = this.currentMonth.getFullYear();
    this.selectedDate = this.toDateKey(this.currentMonth);
    this.events = [];
    this.generateCalendar();
    this.loadEvents();
  }

  onYearChange(): void {
    this.currentMonth = new Date(Number(this.selectedYear), this.currentMonth.getMonth(), 1);
    this.selectedDate = this.toDateKey(this.currentMonth);
    this.events = [];
    this.generateCalendar();
    this.loadEvents();
  }

  goToToday(): void {
    const today = new Date();
    this.currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    this.selectedYear = this.currentMonth.getFullYear();
    this.selectedDate = this.toDateKey(today);
    this.events = [];
    this.generateCalendar();
    this.loadEvents();
  }

  selectDate(day: CalendarDay | null): void {
    if (day) this.selectedDate = day.dateKey;
  }

  eventsForDate(dateKey: string): CompanyEvent[] {
    return this.events.filter(event => this.dateKey(event.Tanggal) === dateKey);
  }

  get selectedDateEvents(): CompanyEvent[] {
    return this.eventsForDate(this.selectedDate);
  }

  get selectedDateLabel(): string {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    }).format(new Date(`${this.selectedDate}T00:00:00`));
  }

  openCreateModal(): void {
    this.form = this.emptyForm(this.selectedDate);
    this.errorMessage = '';
    this.showModal = true;
  }

  openEditModal(event: CompanyEvent): void {
    this.form = {
      ID: event.ID,
      tanggal: this.dateKey(event.Tanggal),
      jam_mulai: event.JamMulai?.substring(0, 5) || '',
      jam_selesai: event.JamSelesai?.substring(0, 5) || '',
      judul: event.Judul,
      tipe: event.Tipe || 'info',
      deskripsi: event.Deskripsi || '',
      lokasi: event.Lokasi || '',
      status_aktif: event.StatusAktif !== false
    };
    this.errorMessage = '';
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  async saveEvent(): Promise<void> {
    if (!this.form.tanggal || !this.form.jam_mulai || !this.form.judul.trim()) {
      this.errorMessage = 'Tanggal, jam mulai, dan judul wajib diisi.';
      return;
    }
    const isEdit = this.form.ID > 0;
    if (!await this.alert.confirm(isEdit ? 'Simpan perubahan event?' : 'Tambah event perusahaan?', 'Agenda ini akan ditampilkan pada kalender karyawan.')) return;

    this.isSaving = true;
    const request = isEdit
      ? this.http.put(`${this.baseUrl}/${this.form.ID}`, this.form, { headers: this.getHeaders() })
      : this.http.post(this.baseUrl, this.form, { headers: this.getHeaders() });

    request.subscribe({
      next: () => {
        this.isSaving = false;
        this.closeModal();
        this.alert.success(isEdit ? 'Event berhasil diperbarui' : 'Event berhasil ditambahkan');
        this.loadEvents();
        this.loadTableEvents();
      },
      error: (err) => {
        this.isSaving = false;
        this.errorMessage = this.apiError(err, 'Gagal menyimpan event perusahaan.');
        this.alert.error('Gagal menyimpan event', this.errorMessage);
      }
    });
  }

  async deleteEvent(event: CompanyEvent): Promise<void> {
    if (!await this.alert.confirm('Hapus event perusahaan?', `Event "${event.Judul}" akan dihapus.`, 'Ya, hapus')) return;
    this.http.delete(`${this.baseUrl}/${event.ID}`, { headers: this.getHeaders() }).subscribe({
      next: () => {
        this.alert.success('Event berhasil dihapus');
        this.loadEvents();
        this.loadTableEvents();
      },
      error: (err) => this.alert.error('Gagal menghapus event', err.error?.error || 'Gagal menghapus event perusahaan')
    });
  }

  private emptyForm(date = this.toDateKey(new Date())) {
    return {
      ID: 0, tanggal: date, jam_mulai: '', jam_selesai: '', judul: '', tipe: 'rapat',
      deskripsi: '', lokasi: '', status_aktif: true
    };
  }

  private apiError(error: any, fallback: string): string {
    if (error?.status === 0) return 'Backend tidak dapat dihubungi. Pastikan API sudah dijalankan ulang.';
    return error?.error?.error || `${fallback} (HTTP ${error?.status || 'unknown'})`;
  }

  private dateKey(value: string): string {
    return String(value).split('T')[0];
  }

  private toDateKey(date: Date): string {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  }
}
