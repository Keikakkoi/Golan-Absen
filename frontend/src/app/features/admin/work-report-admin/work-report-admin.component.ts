import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SharedSidebarComponent } from '../../shared/shared-sidebar/shared-sidebar.component';
import { WorkReportService, WorkReport, WorkReportColumn } from '../../../core/services/work-report.service';
import { AlertService } from '../../../core/services/alert.service';
import { AuthService } from '../../../core/services/auth.service';
import Swal from 'sweetalert2';
import { UiSkeletonComponent } from '../../../shared/ui-skeleton/ui-skeleton.component';

@Component({
  selector: 'app-work-report-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedSidebarComponent, UiSkeletonComponent],
  templateUrl: './work-report-admin.component.html',
  styleUrls: ['./work-report-admin.component.scss']
})
export class WorkReportAdminComponent implements OnInit {
  reports: WorkReport[] = [];
  allReports: WorkReport[] = [];
  columns: WorkReportColumn[] = [];
  isLoading = true;
  viewMode: 'reports' | 'columns' = 'reports';
  isExportOpen = false;

  // Filters
  filterOptions = {
    search: '',
    startDate: '',
    endDate: '',
    division: '',
    project_id: '',
    role: '',
    status: '',
    sort_order: 'desc'
  };
  uniqueDivisions: string[] = [];
  uniqueRoles: string[] = [];
  projects: any[] = [];

  // Column Form
  isEditingColumn = false;
  editingColumnId: number | null = null;
  colForm: Partial<WorkReportColumn> = this.resetColForm();

  constructor(
    private workReportService: WorkReportService,
    private alertService: AlertService,
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.loadDivisionsAndRoles();
  }

  loadData() {
    this.isLoading = true;
    if (this.viewMode === 'reports') {
      this.workReportService.getWorkReports(undefined, this.filterOptions.startDate, this.filterOptions.endDate, this.filterOptions.project_id).subscribe({
        next: (res) => {
          this.allReports = res;
          this.applyFilters();
          this.isLoading = false;
        },
        error: () => this.isLoading = false
      });
    } else {
      this.workReportService.getColumns().subscribe({
        next: (res) => {
          this.columns = res;
          this.isLoading = false;
        },
        error: () => this.isLoading = false
      });
    }
  }

  getHeaders() {
    return new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
  }

  loadDivisionsAndRoles() {
    this.http.get<any[]>('http://localhost:8080/api/v1/organization/divisions', { headers: this.getHeaders() }).subscribe({
      next: (data) => {
        this.uniqueDivisions = data.map(d => d.NamaDivisi).sort();
      },
      error: (err) => console.error('Failed to load divisions', err)
    });

    this.http.get<any[]>('http://localhost:8080/api/v1/organization/positions', { headers: this.getHeaders() }).subscribe({
      next: (data) => {
        this.uniqueRoles = data.map(p => p.NamaJabatan).sort();
      },
      error: (err) => console.error('Failed to load roles', err)
    });

    this.http.get<any[]>('http://localhost:8080/api/v1/organization/projects', { headers: this.getHeaders() }).subscribe({
      next: (data) => this.projects = data || [],
      error: (err) => console.error('Failed to load projects', err)
    });
  }

  applyFilters() {
    let temp = this.allReports;

    // 1. Search (Name, Tugas, Judul)
    if (this.filterOptions.search) {
      const q = this.filterOptions.search.toLowerCase();
      temp = temp.filter(r => 
        this.getEmployeeName(r).toLowerCase().includes(q) ||
        (r.tugas && r.tugas.toLowerCase().includes(q)) ||
        (r.judul && r.judul.toLowerCase().includes(q)) ||
        (r.deskripsi_kegiatan && r.deskripsi_kegiatan.toLowerCase().includes(q))
      );
    }

    // 2. Date Range
    if (this.filterOptions.startDate) {
      const start = new Date(this.filterOptions.startDate);
      start.setHours(0,0,0,0);
      temp = temp.filter(r => {
        if (!r.tanggal) return false;
        const d = new Date(r.tanggal);
        d.setHours(0,0,0,0);
        return d.getTime() >= start.getTime();
      });
    }
    if (this.filterOptions.endDate) {
      const end = new Date(this.filterOptions.endDate);
      end.setHours(23,59,59,999);
      temp = temp.filter(r => {
        if (!r.tanggal) return false;
        const d = new Date(r.tanggal);
        return d.getTime() <= end.getTime();
      });
    }

    // 3. Division
    if (this.filterOptions.division) {
      temp = temp.filter(r => r.Employee?.Division?.NamaDivisi === this.filterOptions.division);
    }

    // 4. Role (Jabatan)
    if (this.filterOptions.role) {
      temp = temp.filter(r => r.Employee?.Position?.NamaJabatan === this.filterOptions.role);
    }

    // 5. Status Validasi
    if (this.filterOptions.status) {
      if (this.filterOptions.status === 'Menunggu') {
        temp = temp.filter(r => (!r.status_sesuai || r.status_sesuai === 'Menunggu') && !this.isNoReport(r));
      } else if (this.filterOptions.status === 'tidak membuat laporan kerja') {
        temp = temp.filter(r => this.isNoReport(r) || r.status_sesuai === 'tidak membuat laporan kerja');
      } else {
        temp = temp.filter(r => r.status_sesuai === this.filterOptions.status);
      }
    }

    if (this.filterOptions.sort_order === 'desc') {
      temp.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
    } else if (this.filterOptions.sort_order === 'asc') {
      temp.sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());
    } else if (this.filterOptions.sort_order === 'name_asc') {
      temp.sort((a, b) => this.getEmployeeName(a).localeCompare(this.getEmployeeName(b)));
    } else if (this.filterOptions.sort_order === 'name_desc') {
      temp.sort((a, b) => this.getEmployeeName(b).localeCompare(this.getEmployeeName(a)));
    }

    this.reports = temp;
  }

  resetFilters() {
    this.filterOptions = {
      search: '',
      startDate: '',
      endDate: '',
      division: '',
      project_id: '',
      role: '',
      status: '',
      sort_order: 'desc'
    };
    this.loadData();
  }

  switchMode(mode: 'reports' | 'columns') {
    this.viewMode = mode;
    this.loadData();
  }

  // HR Validation
  updateValidation(report: WorkReport, event: any) {
    const newVal = event.target.value;
    if (!newVal) return;
    
    this.workReportService.updateWorkReport(report.ID!, { status_sesuai: newVal }).subscribe({
      next: (res) => {
        report.status_sesuai = res.status_sesuai;
        report.validasi_oleh_hr = true;
        this.alertService.success('Status validasi berhasil diupdate');
      },
      error: () => {
        this.alertService.error('Gagal mengupdate validasi');
      }
    });
  }

  // Column Management
  resetColForm(): Partial<WorkReportColumn> {
    return {
      nama_kolom: '',
      tipe_input: 'text',
      opsi: '',
      aktif: true,
      wajib_diisi: false,
      urutan: 0
    };
  }

  openColumnForm(col?: WorkReportColumn) {
    this.isEditingColumn = true;
    if (col) {
      this.editingColumnId = col.ID;
      this.colForm = { ...col };
    } else {
      this.editingColumnId = null;
      this.colForm = this.resetColForm();
    }
  }

  closeColumnForm() {
    this.isEditingColumn = false;
  }

  saveColumn() {
    if (this.editingColumnId) {
      this.workReportService.updateColumn(this.editingColumnId, this.colForm).subscribe({
        next: () => {
          this.alertService.success('Kolom berhasil diupdate');
          this.closeColumnForm();
          this.loadData();
        },
        error: () => this.alertService.error('Gagal mengupdate kolom')
      });
    } else {
      this.workReportService.createColumn(this.colForm).subscribe({
        next: () => {
          this.alertService.success('Kolom berhasil ditambahkan');
          this.closeColumnForm();
          this.loadData();
        },
        error: () => this.alertService.error('Gagal menambahkan kolom')
      });
    }
  }

  deleteColumn(id: number) {
    if (confirm('Yakin ingin menghapus kolom ini?')) {
      this.workReportService.deleteColumn(id).subscribe({
        next: () => {
          this.alertService.success('Kolom dihapus');
          this.loadData();
        },
        error: () => this.alertService.error('Gagal menghapus kolom')
      });
    }
  }

  toggleExportDropdown() {
    this.isExportOpen = !this.isExportOpen;
  }

  exportExcel() {
    this.isExportOpen = false;
    if (!this.reports || this.reports.length === 0) return;

    // Find custom fields headers
    let customHeaders: string[] = [];
    if (this.columns && this.columns.length > 0) {
      customHeaders = this.columns.map(c => c.nama_kolom);
    } else if (this.reports.length > 0 && this.reports[0].custom_fields) {
      try {
        const parsed = JSON.parse(this.reports[0].custom_fields);
        customHeaders = Object.keys(parsed);
      } catch(e) {}
    }

    let html = `
      <html xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head>
        <meta charset="utf-8">
        <style>
          table { border-collapse: collapse; font-family: Arial, sans-serif; }
          th, td { border: 1px solid #000000; padding: 6px; text-align: center; vertical-align: middle; }
          .bg-yellow { background-color: #FFFF00; font-weight: bold; }
          .bg-teal { background-color: #C6E0B4; font-weight: bold; } /* light green/teal from image */
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              <th class="bg-yellow">No</th>
              <th class="bg-teal">Hari/Tanggal</th>
              <th class="bg-yellow">Nama</th>
              <th class="bg-yellow">Divisi</th>
              <th class="bg-yellow">Jabatan</th>
              <th class="bg-yellow">Tugas</th>
              <th class="bg-yellow">Judul Golan Nusantara/ Golan Education</th>
              <th class="bg-yellow">Deskripsi Kegiatan</th>
              <th class="bg-yellow">Realisasi Kegiatan. ( Capaian Target. % )</th>
              <th class="bg-yellow">Kendala (Jika Ada)</th>
              <th class="bg-yellow">Rencana Minggu Depan</th>
              <th class="bg-yellow">Link Artikel</th>
              <th class="bg-yellow">Catatan Tambahan</th>
              <th class="bg-yellow">Status Validasi</th>
              <th class="bg-yellow">Aksi & Validasi</th>`;
              
    customHeaders.forEach(ch => {
      html += `<th class="bg-yellow">${ch}</th>`;
    });

    html += `</tr>
          </thead>
          <tbody>
    `;
    
    this.reports.forEach((r, index) => {
      const dateObj = new Date(r.tanggal);
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const dateString = `${days[dateObj.getDay()]}, ${dateObj.getDate()} ${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
      const dept = r.Employee?.Division?.NamaDivisi || '-';
      const jabatan = r.Employee?.Position?.NamaJabatan || '-';
      const userName = this.getEmployeeName(r);
      const statusReport = this.isNoReport(r) ? 'tidak membuat laporan kerja' : 'Sudah Report';
      const statusValidation = r.status_sesuai || (this.isNoReport(r) ? 'tidak membuat laporan kerja' : 'Menunggu');
      
      html += `
        <tr>
          <td>${index + 1}</td>
          <td>${dateString}</td>
          <td>${userName}</td>
          <td>${dept}</td>
          <td>${jabatan}</td>
          <td style="text-align: left;">${(r.tugas || '').replace(/</g, '&lt;')}</td>
          <td style="text-align: left;">${(r.judul || '').replace(/</g, '&lt;')}</td>
          <td style="text-align: left;">${(r.deskripsi_kegiatan || '').replace(/</g, '&lt;')}</td>
          <td>${r.realisasi_kegiatan || ''}</td>
          <td style="text-align: left;">${(r.kendala || '').replace(/</g, '&lt;')}</td>
          <td style="text-align: left;">${(r.rencana_minggu_depan || '').replace(/</g, '&lt;')}</td>
          <td>${r.link_artikel ? `<a href="${r.link_artikel}">${r.link_artikel}</a>` : '-'}</td>
          <td style="text-align: left;">${(r.catatan_tambahan || '').replace(/</g, '&lt;')}</td>
          <td>${statusReport}</td>
          <td>${statusValidation}</td>`;
          
      let customData: any = {};
      try { customData = JSON.parse(r.custom_fields || '{}'); } catch(e) {}
      
      if (this.columns && this.columns.length > 0) {
        this.columns.forEach(col => {
          html += `<td>${customData[col.ID] || ''}</td>`;
        });
      } else {
        customHeaders.forEach(ch => {
          html += `<td>${customData[ch] || ''}</td>`;
        });
      }
      
      html += `</tr>`;
    });
    
    html += `
          </tbody>
        </table>
      </body>
      </html>
    `;
    
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Rekap_Laporan_Kerja_${new Date().getTime()}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  exportCSV() {
    this.isExportOpen = false;
    if (!this.reports || this.reports.length === 0) return;
    
    // Create CSV content manually
    let csvContent = "data:text/csv;charset=utf-8,";
    // Headers
    const headers = ["No", "Tanggal", "Nama Karyawan", "Divisi", "Jabatan", "Tugas", "Judul", "Deskripsi", "Realisasi", "Kendala", "Rencana", "Status Report", "Status Validasi"];
    const customHeaders = this.columns.map(c => `"${c.nama_kolom.replace(/"/g, '""')}"`);
    csvContent += headers.concat(customHeaders).join(",") + "\n";
    
    this.reports.forEach((r, i) => {
      const row = [
        i + 1,
        new Date(r.tanggal).toISOString().split('T')[0],
        `"${(r.Employee?.User?.Nama || '').replace(/"/g, '""')}"`,
        `"${(r.Employee?.Division?.NamaDivisi || '').replace(/"/g, '""')}"`,
        `"${(r.Employee?.Position?.NamaJabatan || '').replace(/"/g, '""')}"`,
        `"${(r.tugas || '').replace(/"/g, '""')}"`,
        `"${(r.judul || '').replace(/"/g, '""')}"`,
        `"${(r.deskripsi_kegiatan || '').replace(/"/g, '""')}"`,
        `"${(r.realisasi_kegiatan || '').replace(/"/g, '""')}"`,
        `"${(r.kendala || '').replace(/"/g, '""')}"`,
        `"${(r.rencana_minggu_depan || '').replace(/"/g, '""')}"`,
        `"${(this.isNoReport(r) ? 'tidak membuat laporan kerja' : 'Sudah Report').replace(/"/g, '""')}"`,
        `"${(r.status_sesuai || (this.isNoReport(r) ? 'tidak membuat laporan kerja' : 'Menunggu')).replace(/"/g, '""')}"`
      ];

      // Custom fields
      let customData: any = {};
      try {
        if (r.custom_fields) customData = JSON.parse(r.custom_fields);
      } catch (e) {}

      this.columns.forEach(col => {
        const val = customData[col.ID] || '-';
        row.push(`"${String(val).replace(/"/g, '""')}"`);
      });

      csvContent += row.join(",") + "\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Laporan_Kerja_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  exportJSON() {
    this.isExportOpen = false;
    if (!this.reports || this.reports.length === 0) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.reports, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "rekap_laporan_kerja.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }

  exportPDF() {
    this.isExportOpen = false;
    window.print();
  }

  printReport() {
    this.isExportOpen = false;
    window.print();
  }

  getEmployeeName(report: WorkReport): string {
    return report.Employee?.User?.Nama || 'Unknown';
  }

  isNoReport(report: WorkReport): boolean {
    if (!report) return false;
    if (report.status_sesuai === 'tidak membuat laporan kerja' || report.status_sesuai === 'Tidak Membuat Laporan Kerja') {
      return true;
    }
    return !report.tugas && !report.judul && !report.deskripsi_kegiatan;
  }
}
