import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { FormsModule } from '@angular/forms';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, AdminSidebarComponent, DatePipe],
  templateUrl: './admin-settings.component.html',
  styleUrls: ['./admin-settings.component.scss']
})
export class AdminSettingsComponent implements OnInit {
  activeTab: 'general' | 'holidays' = 'general';

  // General Settings
  office: any = { ID: null, NamaLokasi: '', Latitude: 0, Longitude: 0, RadiusMeter: 100, Alamat: '' };
  schedule: any = { ID: null, NamaShift: '', JamMulai: '', JamSelesai: '', ToleransiTerlambatMenit: 10, HariKerja: '' };
  
  isLoadingOffice = true;
  isLoadingSchedule = true;
  isSavingOffice = false;
  isSavingSchedule = false;

  // Holidays
  holidays: any[] = [];
  holidayForm = { id: 0, tanggal: '', keterangan: '' };
  showHolidayModal = false;

  private baseUrl = 'http://localhost:8080/api/v1/admin';

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit(): void {
    this.loadOffice();
    this.loadSchedule();
    this.loadHolidays();
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
  }

  // --- GENERAL SETTINGS ---

  loadOffice(): void {
    this.http.get<any>(`${this.baseUrl}/settings/office`, { headers: this.getHeaders() }).subscribe({
      next: (data) => {
        this.office = data;
        this.isLoadingOffice = false;
      },
      error: () => this.isLoadingOffice = false
    });
  }

  loadSchedule(): void {
    this.http.get<any>(`${this.baseUrl}/settings/schedule`, { headers: this.getHeaders() }).subscribe({
      next: (data) => {
        this.schedule = data;
        if (this.schedule.JamMulai) this.schedule.JamMulai = this.schedule.JamMulai.substring(0, 5);
        if (this.schedule.JamSelesai) this.schedule.JamSelesai = this.schedule.JamSelesai.substring(0, 5);
        this.isLoadingSchedule = false;
      },
      error: () => this.isLoadingSchedule = false
    });
  }

  saveOffice(): void {
    this.isSavingOffice = true;
    this.office.Latitude = Number(this.office.Latitude);
    this.office.Longitude = Number(this.office.Longitude);
    this.office.RadiusMeter = Number(this.office.RadiusMeter);

    this.http.put(`${this.baseUrl}/settings/office`, this.office, { headers: this.getHeaders() }).subscribe({
      next: () => {
        alert('Pengaturan Lokasi Kantor berhasil disimpan!');
        this.isSavingOffice = false;
      },
      error: (err) => {
        alert(err.error?.error || 'Gagal menyimpan');
        this.isSavingOffice = false;
      }
    });
  }

  saveSchedule(): void {
    this.isSavingSchedule = true;
    const body = {
      ...this.schedule,
      JamMulai: this.schedule.JamMulai.length === 5 ? `${this.schedule.JamMulai}:00` : this.schedule.JamMulai,
      JamSelesai: this.schedule.JamSelesai.length === 5 ? `${this.schedule.JamSelesai}:00` : this.schedule.JamSelesai,
      ToleransiTerlambatMenit: Number(this.schedule.ToleransiTerlambatMenit)
    };

    this.http.put(`${this.baseUrl}/settings/schedule`, body, { headers: this.getHeaders() }).subscribe({
      next: () => {
        alert('Pengaturan Jam Kerja berhasil disimpan!');
        this.isSavingSchedule = false;
      },
      error: (err) => {
        alert(err.error?.error || 'Gagal menyimpan');
        this.isSavingSchedule = false;
      }
    });
  }

  // --- HOLIDAYS ---

  loadHolidays(): void {
    this.http.get<any[]>('http://localhost:8080/api/v1/holidays', { headers: this.getHeaders() }).subscribe({
      next: (data) => this.holidays = data,
      error: (err) => console.error(err)
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

  saveHoliday() {
    // Make sure we parse the date properly to save
    const tglParsed = new Date(this.holidayForm.tanggal).toISOString();
    const payload = { ID: this.holidayForm.id, tanggal: tglParsed, keterangan: this.holidayForm.keterangan };

    if (this.holidayForm.id) {
      this.http.put(`${this.baseUrl}/holidays/${this.holidayForm.id}`, payload, { headers: this.getHeaders() }).subscribe({
      next: () => {
        this.loadHolidays();
        this.closeHolidayModal();
        },
        error: (err) => alert(err.error?.error || 'Gagal menyimpan hari libur')
      });
    } else {
      this.http.post(`${this.baseUrl}/holidays`, payload, { headers: this.getHeaders() }).subscribe({
        next: () => {
          this.loadHolidays();
          this.closeHolidayModal();
        },
        error: (err) => alert(err.error?.error || 'Gagal menyimpan hari libur')
      });
    }
  }

  deleteHoliday(id: number) {
    if (confirm('Yakin ingin menghapus hari libur ini?')) {
      this.http.delete(`${this.baseUrl}/holidays/${id}`, { headers: this.getHeaders() }).subscribe({
        next: () => this.loadHolidays(),
        error: (err) => alert(err.error?.error || 'Gagal menghapus hari libur')
      });
    }
  }
}
