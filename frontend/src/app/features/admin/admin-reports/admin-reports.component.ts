import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, RouterLink, AdminSidebarComponent],
  templateUrl: './admin-reports.component.html',
  styleUrls: ['./admin-reports.component.scss']
})
export class AdminReportsComponent implements OnInit {
  stats: any = {
    total_karyawan: 0,
    hadir_hari_ini: 0,
    terlambat_hari_ini: 0,
    izin_cuti_hari_ini: 0
  };
  
  reports: any[] = [];
  departments: any[] = [];
  isLoadingStats = true;
  isLoadingReports = false;

  filters = {
    start_date: '',
    end_date: '',
    status: 'Semua',
    department_id: '',
    periode: 'Kustom'
  };

  private baseReportUrl = 'http://localhost:8080/api/v1/admin/reports';
  private baseDeptUrl = 'http://localhost:8080/api/v1/organization/departments';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Format to YYYY-MM-DD
    this.filters.start_date = this.toDateInput(firstDay);
    this.filters.end_date = this.toDateInput(today);

    const routePeriod = this.route.snapshot.data['periode'];
    if (routePeriod) {
      this.filters.periode = routePeriod;
      this.setPeriodDates(routePeriod);
    }

    this.loadStats();
    this.loadDepartments();
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
        this.isLoadingStats = false;
      }
    });
  }

  loadDepartments(): void {
    const headers = this.getHeaders();
    this.http.get<any[]>(this.baseDeptUrl, { headers }).subscribe({
      next: (data) => {
        this.departments = data || [];
      },
      error: (err) => {
        console.error('Failed to load departments', err);
      }
    });
  }

  onPeriodeChange(): void {
    this.setPeriodDates(this.filters.periode);
    this.loadReports();
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
    if (this.filters.department_id) {
      queryParams += `&department_id=${this.filters.department_id}`;
    }

    this.http.get<any[]>(`${this.baseReportUrl}${queryParams}`, { headers }).subscribe({
      next: (data) => {
        this.reports = data;
        this.isLoadingReports = false;
      },
      error: (err) => {
        console.error('Failed to load reports', err);
        this.isLoadingReports = false;
      }
    });
  }

  exportCSV(): void {
    let queryParams = `?start_date=${this.filters.start_date}&end_date=${this.filters.end_date}`;
    if (this.filters.status !== 'Semua') {
      queryParams += `&status=${this.filters.status}`;
    }
    if (this.filters.department_id) {
      queryParams += `&department_id=${this.filters.department_id}`;
    }
    
    const headers = this.getHeaders();
    this.http.get(`${this.baseReportUrl}/export${queryParams}`, { headers, responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rekap_absensi_${this.filters.start_date}_to_${this.filters.end_date}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      },
      error: (err) => {
        console.error('Failed to export CSV', err);
        alert('Gagal mengunduh laporan CSV.');
      }
    });
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
  }

  exportPDF(): void {
    if (this.reports.length === 0) {
      alert('Tidak ada data untuk diekspor.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Gagal membuka jendela cetak. Mohon izinkan pop-up.');
      return;
    }

    let rowsHtml = '';
    this.reports.forEach(r => {
      const dateVal = r.Tanggal ? new Date(r.Tanggal).toLocaleDateString('id-ID') : '-';
      const jamMasuk = r.JamMasuk ? new Date(r.JamMasuk).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-';
      const jamPulang = r.JamPulang ? new Date(r.JamPulang).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-';
      
      let badgeClass = 'status-alpha';
      if (r.Status === 'Hadir') badgeClass = 'status-hadir';
      else if (r.Status === 'Terlambat') badgeClass = 'status-terlambat';
      else if (r.Status === 'Izin') badgeClass = 'status-izin';
      else if (r.Status === 'Cuti') badgeClass = 'status-cuti';

      rowsHtml += `
        <tr>
          <td>${dateVal}</td>
          <td>${r.Employee?.NIK || ''}</td>
          <td>${r.Employee?.User?.Nama || ''}</td>
          <td>${r.TipeKerja || 'WFO'}</td>
          <td>${jamMasuk}</td>
          <td>${jamPulang}</td>
          <td><span class="status-badge ${badgeClass}">${r.Status}</span></td>
        </tr>
      `;
    });

    printWindow.document.write(`
      <html>
      <head>
        <title>Rekap Absensi Karyawan - PT. Golan</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #1e293b; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
          .header h1 { margin: 0; color: #1e3a8a; font-size: 24px; }
          .header p { margin: 5px 0 0; color: #64748b; font-size: 14px; }
          .info { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px; color: #475569; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background-color: #f1f5f9; color: #334155; font-weight: bold; border: 1px solid #cbd5e1; padding: 10px; font-size: 12px; text-align: left; }
          td { border: 1px solid #cbd5e1; padding: 10px; font-size: 11px; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .status-badge { padding: 3px 8px; border-radius: 9999px; font-size: 10px; font-weight: 500; display: inline-block; }
          .status-hadir { background-color: #dbeafe; color: #1e5aa8; }
          .status-terlambat { background-color: #fef3c7; color: #92400e; }
          .status-alpha { background-color: #fee2e2; color: #991b1b; }
          .status-izin { background-color: #e0f2fe; color: #075985; }
          .status-cuti { background-color: #f3e8ff; color: #6b21a8; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>PT. GOLAN DIGITAL KREATIF</h1>
          <p>Laporan Rekap Absensi Kehadiran Karyawan</p>
        </div>
        <div class="info">
          <div><strong>Periode:</strong> ${this.filters.start_date} s/d ${this.filters.end_date}</div>
          <div><strong>Dicetak pada:</strong> ${new Date().toLocaleString('id-ID')}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>NIK</th>
              <th>Nama Karyawan</th>
              <th>Tipe Kerja</th>
              <th>Jam Masuk</th>
              <th>Jam Pulang</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
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
