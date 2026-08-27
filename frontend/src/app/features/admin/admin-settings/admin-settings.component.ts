import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { FormsModule } from '@angular/forms';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    AdminSidebarComponent,
    DatePipe,
  ],
  templateUrl: './admin-settings.component.html',
  styleUrls: ['./admin-settings.component.scss'],
})
export class AdminSettingsComponent implements OnInit {
  activeTab: 'general' | 'holidays' = 'general';

  // General Settings
  office: any = {
    ID: null,
    NamaLokasi: '',
    GoogleMapsURL: '',
    Latitude: 0,
    Longitude: 0,
    RadiusMeter: 100,
    Alamat: '',
  };
  regularSchedules: any[] = [];
  readonly regularDayNames = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  general: any = { MinimumMasaKerjaCutiBulan: 3, BatasLaporanSetelahCheckoutMenit: 60 };

  isLoadingOffice = true;
  isLoadingSchedule = true;
  isLoadingGeneral = true;
  isLoadingHelpdesk = true;
  isSavingOffice = false;
  isSavingSchedule = false;
  isSavingGeneral = false;
  isSavingHelpdesk = false;

  helpdesk: any = {
    EmailHelpdesk: '',
    EmailIT: '',
    WhatsAppHRD: '',
    WhatsAppIT: '',
    JamLayanan: '',
  };
  jamMulaiLayanan = '08:00';
  jamSelesaiLayanan = '17:00';

  // Holidays
  holidays: any[] = [];
  holidayYear = new Date().getFullYear();
  isSyncingHolidays = false;
  holidaySyncMessage = '';
  holidayForm = { id: 0, tanggal: '', keterangan: '' };
  showHolidayModal = false;

  private baseUrl = 'http://localhost:8080/api/v1/admin';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private alert: AlertService,
  ) {}

  ngOnInit(): void {
    this.loadOffice();
    this.loadRegularSchedule();
    this.loadGeneral();
    this.loadHelpdesk();
    this.loadHolidays();
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders().set(
      'Authorization',
      `Bearer ${this.authService.getToken()}`,
    );
  }

  // --- GENERAL SETTINGS ---

  loadOffice(): void {
    this.http
      .get<any>(`${this.baseUrl}/settings/office`, {
        headers: this.getHeaders(),
      })
      .subscribe({
        next: (data) => {
          this.office = data;
          this.isLoadingOffice = false;
        },
        error: () => (this.isLoadingOffice = false),
      });
  }

  loadRegularSchedule(): void {
    this.http
      .get<any[]>(`${this.baseUrl}/settings/regular-schedule`, {
        headers: this.getHeaders(),
      })
      .subscribe({
        next: (data) => {
          this.regularSchedules = (data || []).sort((a, b) => a.day_of_week - b.day_of_week).map((row: any, i: number) => ({
            ...row,
            day_name: row.day_name || this.regularDayNames[i],
            start_time: (row.start_time || '').substring(0, 5),
            end_time: (row.end_time || '').substring(0, 5),
            late_tolerance_minutes: Number(row.late_tolerance_minutes ?? 10)
          }));
          this.isLoadingSchedule = false;
        },
        error: () => (this.isLoadingSchedule = false),
      });
  }

  loadGeneral(): void {
    this.http.get<any>(`${this.baseUrl}/settings/general`, { headers: this.getHeaders() }).subscribe({
      next: data => { this.general = this.normalizeGeneral(data); this.isLoadingGeneral = false; },
      error: () => this.isLoadingGeneral = false
    });
  }

  // Accept both the new minute field and the legacy hour field. This keeps the
  // control populated while an existing API/database is being upgraded.
  private normalizeGeneral(data: any): any {
    const minutes = data?.BatasLaporanSetelahCheckoutMenit ?? data?.batas_laporan_setelah_checkout_menit;
    const legacyHours = data?.BatasLaporanSetelahCheckoutJam ?? data?.batas_laporan_setelah_checkout_jam;
    return {
      ...data,
      MinimumMasaKerjaCutiBulan: data?.MinimumMasaKerjaCutiBulan ?? data?.minimum_masa_kerja_cuti_bulan ?? 3,
      BatasLaporanSetelahCheckoutMenit: minutes ?? (legacyHours != null ? Number(legacyHours) * 60 : 60)
    };
  }

  async saveGeneral(): Promise<void> {
    if (!(await this.alert.confirm('Simpan aturan umum?', 'Aturan masa kerja cuti dan batas laporan akan diperbarui.'))) return;
    this.isSavingGeneral = true;
    const body = {
      minimum_masa_kerja_cuti_bulan: Number(this.general.MinimumMasaKerjaCutiBulan),
      batas_laporan_setelah_checkout_menit: Number(this.general.BatasLaporanSetelahCheckoutMenit)
    };
    this.http.put(`${this.baseUrl}/settings/general`, body, { headers: this.getHeaders() }).subscribe({
      next: data => { this.general = this.normalizeGeneral(data); this.isSavingGeneral = false; this.alert.success('Aturan umum berhasil disimpan'); },
      error: err => { this.isSavingGeneral = false; this.alert.error('Gagal menyimpan aturan umum', err.error?.error || 'Gagal menyimpan'); }
    });
  }

  async saveOffice(): Promise<void> {
    if (
      !(await this.alert.confirm(
        'Simpan lokasi kantor?',
        'Pengaturan geofence kantor akan diperbarui.',
      ))
    )
      return;
    this.isSavingOffice = true;
    this.office.Latitude = Number(this.office.Latitude);
    this.office.Longitude = Number(this.office.Longitude);
    this.office.RadiusMeter = Number(this.office.RadiusMeter);

    this.http
      .put(`${this.baseUrl}/settings/office`, this.office, {
        headers: this.getHeaders(),
      })
      .subscribe({
        next: () => {
          this.alert.success('Lokasi kantor berhasil disimpan');
          this.isSavingOffice = false;
        },
        error: (err) => {
          this.alert.error(
            'Gagal menyimpan lokasi kantor',
            err.error?.error || 'Gagal menyimpan',
          );
          this.isSavingOffice = false;
        },
      });
  }

  async saveRegularSchedule(): Promise<void> {
    if (
      !(await this.alert.confirm(
        'Simpan Jadwal Reguler?',
        'Jadwal ini digunakan oleh karyawan yang tidak memiliki jadwal khusus.',
      ))
    )
      return;
    this.isSavingSchedule = true;
    if (this.regularSchedules.some(r => r.is_working_day && (!r.start_time || !r.end_time || Number(r.late_tolerance_minutes) < 0))) {
      this.alert.error('Jadwal belum lengkap', 'Jam masuk/pulang wajib diisi dan toleransi tidak boleh negatif.'); return;
    }
    const body = { schedules: this.regularSchedules.map(r => ({ ...r, start_time: r.start_time ? `${r.start_time}:00` : '', end_time: r.end_time ? `${r.end_time}:00` : '', late_tolerance_minutes: Number(r.late_tolerance_minutes) })) };

    this.http
      .put(`${this.baseUrl}/settings/regular-schedule`, body, {
        headers: this.getHeaders(),
      })
      .subscribe({
        next: () => {
          this.alert.success('Jadwal Reguler berhasil disimpan');
          this.isSavingSchedule = false;
        },
        error: (err) => {
          this.alert.error(
            'Gagal menyimpan Jadwal Reguler',
            err.error?.error || 'Gagal menyimpan',
          );
          this.isSavingSchedule = false;
        },
      });
  }

  loadHelpdesk(): void {
    this.http
      .get<any>(`http://localhost:8080/api/v1/settings/helpdesk`, {
        headers: this.getHeaders(),
      })
      .subscribe({
        next: (data) => {
          this.helpdesk = data;
          if (data.JamLayanan) {
            const match = data.JamLayanan.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
            if (match) {
              this.jamMulaiLayanan = match[1];
              this.jamSelesaiLayanan = match[2];
            }
          }
          this.isLoadingHelpdesk = false;
        },
        error: () => (this.isLoadingHelpdesk = false),
      });
  }

  async saveHelpdesk(): Promise<void> {
    if (
      !(await this.alert.confirm(
        'Simpan kontak bantuan?',
        'Informasi kontak helpdesk dan IT Support akan diperbarui.',
      ))
    )
      return;
    this.isSavingHelpdesk = true;
    this.helpdesk.JamLayanan = `Senin - Jumat: ${this.jamMulaiLayanan} - ${this.jamSelesaiLayanan} WIB`;

    this.http
      .put(`${this.baseUrl}/settings/helpdesk`, this.helpdesk, {
        headers: this.getHeaders(),
      })
      .subscribe({
        next: () => {
          this.alert.success('Kontak pusat bantuan berhasil disimpan');
          this.isSavingHelpdesk = false;
        },
        error: (err) => {
          this.alert.error(
            'Gagal menyimpan kontak',
            err.error?.error || 'Gagal menyimpan kontak',
          );
          this.isSavingHelpdesk = false;
        },
      });
  }

  // --- HOLIDAYS ---

  loadHolidays(): void {
    this.http
      .get<
        any[]
      >(`http://localhost:8080/api/v1/holidays?year=${this.holidayYear}`, { headers: this.getHeaders() })
      .subscribe({
        next: (data) => (this.holidays = data),
        error: (err) => console.error(err),
      });
  }

  openHolidayModal(h: any = null) {
    if (h && h.type && h.type !== 'company') {
      this.alert.error('Kalender nasional', 'Hari libur nasional dan cuti bersama hanya dapat diperbarui melalui sinkronisasi.');
      return;
    }
    if (h) {
      let tgl = '';
      if (h.Tanggal) tgl = new Date(h.Tanggal).toISOString().split('T')[0];
      this.holidayForm = { id: h.ID, tanggal: tgl, keterangan: h.Keterangan };
    } else {
      this.holidayForm = { id: 0, tanggal: '', keterangan: '' };
    }
    this.showHolidayModal = true;
  }

  closeHolidayModal() {
    this.showHolidayModal = false;
  }

  async saveHoliday(): Promise<void> {
    // Make sure we parse the date properly to save
    const payload = {
      ID: this.holidayForm.id,
      // Send a date-only value so the browser timezone cannot shift it.
      tanggal: this.holidayForm.tanggal,
      keterangan: this.holidayForm.keterangan,
    };
    const wasEdit = !!this.holidayForm.id;
    if (
      !(await this.alert.confirm(
        'Simpan hari libur?',
        `Apakah Anda yakin ingin ${wasEdit ? 'mengubah' : 'menambahkan'} hari libur ini?`,
      ))
    )
      return;

    if (this.holidayForm.id) {
      this.http
        .put(`${this.baseUrl}/holidays/${this.holidayForm.id}`, payload, {
          headers: this.getHeaders(),
        })
        .subscribe({
          next: () => {
            this.loadHolidays();
            this.closeHolidayModal();
            this.alert.success(
              wasEdit ? 'Hari libur diperbarui' : 'Hari libur disimpan',
            );
          },
          error: (err) =>
            this.alert.error(
              'Gagal menyimpan hari libur',
              err.error?.error || 'Gagal menyimpan hari libur',
            ),
        });
    } else {
      this.http
        .post(`${this.baseUrl}/holidays`, payload, {
          headers: this.getHeaders(),
        })
        .subscribe({
          next: () => {
            this.loadHolidays();
            this.closeHolidayModal();
            this.alert.success('Hari libur disimpan');
          },
          error: (err) =>
            this.alert.error(
              'Gagal menyimpan hari libur',
              err.error?.error || 'Gagal menyimpan hari libur',
            ),
        });
    }
  }

  syncNationalHolidays(): void {
    this.isSyncingHolidays = true;
    this.holidaySyncMessage = '';
    this.http.post<any>(`${this.baseUrl}/holidays/sync?year=${this.holidayYear}`, {}, { headers: this.getHeaders() }).subscribe({
      next: (result) => { this.isSyncingHolidays = false; this.holidaySyncMessage = `Sinkronisasi ${result.year} selesai (${result.created} baru, ${result.updated} diperbarui).`; this.loadHolidays(); },
      error: (err) => { this.isSyncingHolidays = false; this.holidaySyncMessage = err.error?.error || 'Sumber kalender tidak dapat diakses. Data lama tetap dipertahankan.'; }
    });
  }

  async deleteHoliday(id: number): Promise<void> {
    if (
      await this.alert.confirm(
        'Hapus hari libur?',
        'Hari libur ini akan dihapus dari sistem.',
        'Ya, hapus',
      )
    ) {
      this.http
        .delete(`${this.baseUrl}/holidays/${id}`, {
          headers: this.getHeaders(),
        })
        .subscribe({
          next: () => {
            this.loadHolidays();
            this.alert.success('Hari libur dihapus');
          },
          error: (err) =>
            this.alert.error(
              'Gagal menghapus hari libur',
              err.error?.error || 'Gagal menghapus hari libur',
            ),
        });
    }
  }
}
