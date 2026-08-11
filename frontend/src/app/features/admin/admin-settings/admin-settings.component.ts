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
  schedule: any = {
    ID: null,
    NamaShift: '',
    JamMulai: '',
    JamSelesai: '',
    ToleransiTerlambatMenit: 10,
    HariKerja: '',
  };
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
    this.loadSchedule();
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

  loadSchedule(): void {
    this.http
      .get<any>(`${this.baseUrl}/settings/schedule`, {
        headers: this.getHeaders(),
      })
      .subscribe({
        next: (data) => {
          this.schedule = data;
          if (this.schedule.JamMulai)
            this.schedule.JamMulai = this.schedule.JamMulai.substring(0, 5);
          if (this.schedule.JamSelesai)
            this.schedule.JamSelesai = this.schedule.JamSelesai.substring(0, 5);
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

  async saveSchedule(): Promise<void> {
    if (
      !(await this.alert.confirm(
        'Simpan pengaturan jam kerja?',
        'Perubahan jadwal kerja akan diterapkan ke sistem.',
      ))
    )
      return;
    this.isSavingSchedule = true;
    const body = {
      ...this.schedule,
      JamMulai:
        this.schedule.JamMulai.length === 5
          ? `${this.schedule.JamMulai}:00`
          : this.schedule.JamMulai,
      JamSelesai:
        this.schedule.JamSelesai.length === 5
          ? `${this.schedule.JamSelesai}:00`
          : this.schedule.JamSelesai,
      ToleransiTerlambatMenit: Number(this.schedule.ToleransiTerlambatMenit),
    };

    this.http
      .put(`${this.baseUrl}/settings/schedule`, body, {
        headers: this.getHeaders(),
      })
      .subscribe({
        next: () => {
          this.alert.success('Pengaturan jam kerja disimpan');
          this.isSavingSchedule = false;
        },
        error: (err) => {
          this.alert.error(
            'Gagal menyimpan jam kerja',
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
      >('http://localhost:8080/api/v1/holidays', { headers: this.getHeaders() })
      .subscribe({
        next: (data) => (this.holidays = data),
        error: (err) => console.error(err),
      });
  }

  openHolidayModal(h: any = null) {
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
    const tglParsed = new Date(this.holidayForm.tanggal).toISOString();
    const payload = {
      ID: this.holidayForm.id,
      tanggal: tglParsed,
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
