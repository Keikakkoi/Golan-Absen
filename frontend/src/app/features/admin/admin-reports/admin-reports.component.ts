import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ReportExportService } from '../../../core/services/report-export.service';

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, RouterLink, AdminSidebarComponent, PaginationComponent],
  templateUrl: './admin-reports.component.html',
  styleUrls: ['./admin-reports.component.scss']
})
export class AdminReportsComponent implements OnInit {
  stats: any = {
    total_karyawan: 0,
    hadir_hari_ini: 0,
    belum_absen_hari_ini: 0,
    izin_cuti_hari_ini: 0
  };
  
  allReports: any[] = [];
  reports: any[] = [];
  divisions: any[] = [];
  projects: any[] = [];
  uniqueRoles: any[] = [];
  isLoadingStats = true;
  isLoadingReports = false;
  isExportOpen = false;
  errorMessage = '';
  page = 1;
  pageSize = 25;
  selectedReport: any | null = null;

  filters = {
    start_date: '',
    end_date: '',
    status: 'Semua',
    division_id: '',
    project_id: '',
    periode: 'Kustom',
    search: '',
    role: '',
    sort_order: 'desc'
  };

  private baseReportUrl = 'http://localhost:8080/api/v1/admin/reports';
  private baseDeptUrl = 'http://localhost:8080/api/v1/organization/divisions';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private reportExport: ReportExportService
  ) {}

  ngOnInit(): void {
    const today = new Date();
    
    // Format to YYYY-MM-DD
    this.filters.start_date = this.toDateInput(today);
    this.filters.end_date = this.toDateInput(today);

    const routePeriod = this.route.snapshot.data['periode'];
    if (routePeriod) {
      this.filters.periode = routePeriod;
      this.setPeriodDates(routePeriod);
    }

    this.loadStats();
    this.loadDivisionsAndRoles();
    this.loadReports();
  }

  loadStats(): void {
    const headers = this.getHeaders();
    this.http.get<any>(`${this.baseReportUrl}/stats`, { headers }).subscribe({
      next: (data) => {
        this.stats = data;
        this.isLoadingStats = false;
      },
      error: (err) => {
        console.error('Failed to load stats', err);
        this.errorMessage = 'Gagal memuat data karyawan: ' + (err.error?.error || 'Gagal memuat data.');
        this.isLoadingStats = false;
      }
    });
  }

  loadDivisionsAndRoles(): void {
    const headers = this.getHeaders();
    this.http.get<any[]>(this.baseDeptUrl, { headers }).subscribe({
      next: (data) => {
        this.divisions = data || [];
      },
      error: (err) => {
        console.error('Failed to load divisions', err);
      }
    });

    this.http.get<any[]>('http://localhost:8080/api/v1/organization/positions', { headers }).subscribe({
      next: (data) => {
        this.uniqueRoles = data.map(p => p.NamaJabatan).sort();
      },
      error: (err) => console.error('Failed to load roles', err)
    });

    this.http.get<any[]>('http://localhost:8080/api/v1/organization/projects', { headers }).subscribe({
      next: (data) => this.projects = data || [],
      error: (err) => console.error('Failed to load projects', err)
    });
  }

  onPeriodeChange(): void {
    this.setPeriodDates(this.filters.periode);
    this.loadReports();
  }

  onFilterChange(): void {
    // If backend filters change, we need to load from backend
    this.loadReports();
  }

  onLocalFilterChange(): void {
    this.applyFilters(true);
  }

  private setPeriodDates(period: string): void {
    const today = new Date();
    if (period === 'Harian') {
      const todayStr = this.toDateInput(today);
      this.filters.start_date = todayStr;
      this.filters.end_date = todayStr;
    } else if (period === 'Mingguan') {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(today.setDate(diff));
      this.filters.start_date = monday.toISOString().split('T')[0];
      this.filters.end_date = this.toDateInput(new Date());
    } else if (period === 'Bulanan') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      this.filters.start_date = this.toDateInput(firstDay);
      this.filters.end_date = this.toDateInput(new Date());
    }
  }

  loadReports(): void {
    this.isLoadingReports = true;
    const headers = this.getHeaders();
    
    let queryParams = `?start_date=${this.filters.start_date}&end_date=${this.filters.end_date}`;
    if (this.filters.status !== 'Semua') {
      queryParams += `&status=${this.filters.status}`;
    }
    if (this.filters.division_id) {
      queryParams += `&division_id=${this.filters.division_id}`;
    }
    if (this.filters.project_id) {
      queryParams += `&project_id=${this.filters.project_id}`;
    }
    this.http.get<any[]>(`${this.baseReportUrl}${queryParams}`, { headers }).subscribe({
      next: (data) => {
        this.allReports = data || [];
        this.applyFilters(false);
        this.isLoadingReports = false;
      },
      error: (err) => {
        console.error('Failed to load reports', err);
        this.errorMessage = 'Gagal memuat data karyawan: ' + (err.error?.error || 'Gagal memuat data.');
        this.isLoadingReports = false;
      }
    });
  }

  applyFilters(resetPage = true): void {
    let temp = [...this.allReports];

    if (this.filters.search) {
      const q = this.filters.search.toLowerCase();
      temp = temp.filter(r => 
        (r.Employee?.User?.Nama && r.Employee.User.Nama.toLowerCase().includes(q)) ||
        (r.Employee?.NIK && r.Employee.NIK.toLowerCase().includes(q)) ||
        (r.Employee?.Position?.NamaJabatan && r.Employee.Position.NamaJabatan.toLowerCase().includes(q))
      );
    }

    if (this.filters.role) {
      temp = temp.filter(r => r.Employee?.Position?.NamaJabatan === this.filters.role);
    }

    if (this.filters.sort_order === 'desc') {
      temp.sort((a, b) => new Date(b.Tanggal).getTime() - new Date(a.Tanggal).getTime());
    } else if (this.filters.sort_order === 'asc') {
      temp.sort((a, b) => new Date(a.Tanggal).getTime() - new Date(b.Tanggal).getTime());
    } else if (this.filters.sort_order === 'name_asc') {
      temp.sort((a, b) => (a.Employee?.User?.Nama || '').localeCompare(b.Employee?.User?.Nama || ''));
    } else if (this.filters.sort_order === 'name_desc') {
      temp.sort((a, b) => (b.Employee?.User?.Nama || '').localeCompare(a.Employee?.User?.Nama || ''));
    }

    this.reports = temp;
    if (resetPage) {
      this.page = 1;
    } else {
      this.ensureValidPage();
    }
  }

  get paginationStartIndex(): number {
    return this.reports.length === 0 ? 0 : (this.page - 1) * this.pageSize;
  }

  get paginationEndIndex(): number {
    return Math.min(this.paginationStartIndex + this.pageSize, this.reports.length);
  }

  get displayedReports(): any[] {
    return this.reports.slice(this.paginationStartIndex, this.paginationEndIndex);
  }

  onPageChange(page: number): void {
    this.page = page;
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize = pageSize;
    this.page = 1;
  }

  private ensureValidPage(): void {
    const totalPages = Math.max(1, Math.ceil(this.reports.length / this.pageSize));
    if (this.page > totalPages) this.page = totalPages;
  }

  openReportDetail(report: any): void {
    this.selectedReport = report;
  }

  closeReportDetail(): void {
    this.selectedReport = null;
  }

  checkInPhoto(report: any): string {
    return report?.FotoSelfieMasukURL || report?.foto_selfie_masuk_url || '';
  }

  checkInLatitude(report: any): number | null {
    return this.coordinate(report?.LatitudeMasuk ?? report?.latitude_masuk);
  }

  checkInLongitude(report: any): number | null {
    return this.coordinate(report?.LongitudeMasuk ?? report?.longitude_masuk);
  }

  locationSummary(report: any): string {
    const latitude = this.checkInLatitude(report);
    const longitude = this.checkInLongitude(report);
    return latitude !== null && longitude !== null
      ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
      : 'Tidak ada lokasi';
  }

  mapEmbedUrl(report: any): SafeResourceUrl | null {
    const latitude = this.checkInLatitude(report);
    const longitude = this.checkInLongitude(report);
    if (latitude === null || longitude === null) return null;
    const delta = 0.003;
    const url = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - delta}%2C${latitude - delta}%2C${longitude + delta}%2C${latitude + delta}&layer=mapnik&marker=${latitude}%2C${longitude}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  mapsUrl(report: any): string | null {
    const latitude = this.checkInLatitude(report);
    const longitude = this.checkInLongitude(report);
    return latitude !== null && longitude !== null
      ? `https://www.google.com/maps?q=${latitude},${longitude}`
      : null;
  }

  private coordinate(value: unknown): number | null {
    const number = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(number) && number !== 0 ? number : null;
  }

  toggleExportDropdown(): void {
    this.isExportOpen = !this.isExportOpen;
  }

  exportCSV(): void {
    if (this.reports.length === 0) {
      alert('Tidak ada data untuk diekspor.');
      return;
    }
    
    let csvContent = 'Tanggal,NIK,Nama Karyawan,Divisi,Jabatan,Tipe Kerja,Jam Masuk,Jam Pulang,Status\n';
    
    this.reports.forEach(r => {
      const dateVal = r.Tanggal ? new Date(r.Tanggal).toLocaleDateString('id-ID') : '-';
      const jamMasuk = r.JamMasuk ? new Date(r.JamMasuk).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-';
      const jamPulang = r.JamPulang ? new Date(r.JamPulang).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-';
      
      const row = [
        dateVal,
        `="${r.Employee?.NIK || ''}"`,
        `"${(r.Employee?.User?.Nama || '').replace(/"/g, '""')}"`,
        `"${(r.Employee?.Division?.NamaDivisi || '').replace(/"/g, '""')}"`,
        `"${(r.Employee?.Position?.NamaJabatan || '').replace(/"/g, '""')}"`,
        r.TipeKerja || 'WFO',
        jamMasuk,
        jamPulang,
        r.Status
      ];
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rekap_absensi_${this.filters.start_date}_to_${this.filters.end_date}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  exportExcel(): void {
    if (this.reports.length === 0) {
      alert('Tidak ada data untuk diekspor.');
      return;
    }
    let excelContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
        <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Rekap Absensi</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
        <style>
          table { border-collapse: collapse; width: 100%; }
          th { background-color: #3b82f6; color: white; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
          td { border: 1px solid #cbd5e1; padding: 8px; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>NIK</th>
              <th>Nama Karyawan</th>
              <th>Divisi</th>
              <th>Jabatan</th>
              <th>Tipe Kerja</th>
              <th>Jam Masuk</th>
              <th>Jam Pulang</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
    `;

    this.reports.forEach(r => {
      const dateVal = r.Tanggal ? new Date(r.Tanggal).toLocaleDateString('id-ID') : '-';
      const jamMasuk = r.JamMasuk ? new Date(r.JamMasuk).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-';
      const jamPulang = r.JamPulang ? new Date(r.JamPulang).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-';
      excelContent += `
        <tr>
          <td>${dateVal}</td>
          <td>'${r.Employee?.NIK || ''}</td>
          <td>${r.Employee?.User?.Nama || ''}</td>
          <td>${r.Employee?.Division?.NamaDivisi || ''}</td>
          <td>${r.Employee?.Position?.NamaJabatan || ''}</td>
          <td>${r.TipeKerja || 'WFO'}</td>
          <td>${jamMasuk}</td>
          <td>${jamPulang}</td>
          <td>${r.Status}</td>
        </tr>
      `;
    });

    excelContent += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rekap_absensi_${this.filters.start_date}_to_${this.filters.end_date}.xls`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    document.body.removeChild(a);
  }

  exportJSON(): void {
    if (this.reports.length === 0) {
      alert('Tidak ada data untuk diekspor.');
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.reports, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `rekap_absensi_${this.filters.start_date}_to_${this.filters.end_date}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }

  exportPDF(): void {
    if (this.reports.length === 0) {
      alert('Tidak ada data untuk diekspor.');
      return;
    }

    const report = this.buildPrintableReport();
    void this.reportExport.downloadPdf(`rekap-absensi-${this.filters.start_date}-sampai-${this.filters.end_date}.pdf`, 'Laporan Rekap Absensi Kehadiran Karyawan', `${this.filters.start_date} s/d ${this.filters.end_date}`, report.headers, report.rows);
  }

  printReport(): void {
    if (this.reports.length === 0) return;
    const report = this.buildPrintableReport();
    this.reportExport.printReport('Laporan Rekap Absensi Kehadiran Karyawan', `${this.filters.start_date} s/d ${this.filters.end_date}`, report.headers, report.rows);
  }

  private buildPrintableReport(): { headers: string[]; rows: unknown[][] } {
    const headers = ['Tanggal', 'NIK', 'Nama Karyawan', 'Divisi', 'Jabatan', 'Tipe Kerja', 'Jam Masuk', 'Jam Pulang', 'Status'];
    const rows = this.reports.map(r => [
      this.formatAttendanceDate(r.Tanggal), r.Employee?.NIK || '-', r.Employee?.User?.Nama || '-',
      r.Employee?.Division?.NamaDivisi || '-', r.Employee?.Position?.NamaJabatan || '-', r.TipeKerja || 'WFO',
      this.formatAttendanceTime(r.JamMasuk), this.formatAttendanceTime(r.JamPulang), r.Status || '-'
    ]);
    return { headers, rows };
  }

  private formatAttendanceDate(value: string): string {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(date);
  }

  private formatAttendanceTime(value: string): string {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' }).format(date);
  }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  logout(): void {
    this.authService.logout();
  }

  private toDateInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
