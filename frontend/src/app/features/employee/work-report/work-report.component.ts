import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { WorkReportService, WorkReport, WorkReportColumn, ComplianceResult, WorkReportDeadline, PaginatedWorkReports } from '../../../core/services/work-report.service';
import { AlertService } from '../../../core/services/alert.service';
import { AuthService } from '../../../core/services/auth.service';
import Swal from 'sweetalert2';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';

import { CommonModule } from '@angular/common';
import { SharedSidebarComponent } from '../../shared/shared-sidebar/shared-sidebar.component';
import { UiSkeletonComponent } from '../../../shared/ui-skeleton/ui-skeleton.component';

@Component({
  selector: 'app-work-report',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, SharedSidebarComponent, UiSkeletonComponent, PaginationComponent],
  templateUrl: './work-report.component.html',
  styleUrls: ['./work-report.component.scss']
})
export class WorkReportComponent implements OnInit {
  viewMode: 'list' | 'form' = 'list';
  isExportOpen = false;
  editingReportId: number | null = null;
  reports: WorkReport[] = [];
  private allReports: WorkReport[] = [];
  private serverPaginated = false;
  complianceData: ComplianceResult[] = [];
  columns: WorkReportColumn[] = [];
  reportForm!: FormGroup;
  selectedDate: string = '';
  isSubmitting = false;
  isLoading = true;
  isRefreshing = false;
  refreshError = '';
  refreshSuccess = '';
  userDivisi: string = '';
  selectedScreenshots: File[] = [];
  screenshotPreviews: string[] = [];
  deadlineInfo: WorkReportDeadline | null = null;
  deadlineError = '';
  currentPage = 1;
  pageSize = 25;
  totalReports = 0;
  pageSizeOptions = [10, 25, 50, 100];

  constructor(
    private fb: FormBuilder,
    private workReportService: WorkReportService,
    private alertService: AlertService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.userDivisi = localStorage.getItem('divisi') || 'Belum Ditentukan';
    this.initForm();
    this.loadInitialData();
  }

  initForm() {
    this.reportForm = this.fb.group({
      tanggal: ['', Validators.required],
      tugas: ['', Validators.required],
      judul: [''],
      deskripsi_kegiatan: ['', Validators.required],
      realisasi_kegiatan: ['', Validators.required],
      kendala: [''],
      rencana_minggu_depan: [''],
      link_artikel: [''],
      catatan_tambahan: [''],
      customFieldsForm: this.fb.group({})
    });
  }

  loadInitialData(isRefresh = false) {
    if (isRefresh && (this.isRefreshing || this.isLoading)) return;

    this.refreshError = '';
    this.refreshSuccess = '';
    this.isLoading = !isRefresh;
    this.isRefreshing = isRefresh;

    forkJoin({
      columns: this.workReportService.getColumns(isRefresh),
      reports: this.workReportService.getWorkReports(undefined, undefined, undefined, undefined, isRefresh, this.currentPage, this.pageSize)
    }).pipe(
      finalize(() => {
        this.isLoading = false;
        this.isRefreshing = false;
      })
    ).subscribe({
      next: ({ columns, reports }) => {
        this.columns = columns;
        this.buildCustomFieldsForm();
        const response = reports as WorkReport[] | PaginatedWorkReports;
        if (Array.isArray(response)) {
          // Backward-compatible fallback for an older API process that still
          // returns the complete array instead of the pagination envelope.
          this.allReports = response;
          this.reports = response.slice((this.currentPage - 1) * this.pageSize, this.currentPage * this.pageSize);
          this.totalReports = response.length;
          this.serverPaginated = false;
        } else {
          this.allReports = [];
          this.reports = (response.data || []).slice(0, this.pageSize);
          this.totalReports = Number(response.total || 0);
          this.currentPage = Number(response.page || this.currentPage);
          this.serverPaginated = true;
        }
        this.loadCompliance(isRefresh);
        if (isRefresh) {
          this.refreshSuccess = 'Data laporan berhasil diperbarui.';
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: this.refreshSuccess,
            showConfirmButton: false,
            timer: 2500,
            timerProgressBar: true
          });
        }
      },
      error: (err) => {
        this.refreshError = err?.error?.error || 'Gagal memperbarui data laporan. Periksa koneksi lalu coba lagi.';
      }
    });
  }

  refreshReports(): void {
    this.loadInitialData(true);
  }

  pageChanged(page: number): void {
    if (page === this.currentPage) return;
    this.currentPage = page;
    this.loadInitialData();
  }

  pageSizeChanged(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.loadInitialData();
  }

  loadCompliance(forceRefresh = false) {
    // Check current month compliance
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const end = now.toISOString().split('T')[0];

    this.workReportService.getCompliance(start, end, undefined, forceRefresh).subscribe({
      next: (res) => {
        this.complianceData = res;
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  buildCustomFieldsForm() {
    const customGroup = this.reportForm.get('customFieldsForm') as FormGroup;
    Object.keys(customGroup.controls).forEach(name => customGroup.removeControl(name));
    this.columns.forEach(col => {
      customGroup.addControl(col.nama_kolom, this.fb.control('', col.wajib_diisi ? Validators.required : null));
    });
  }

  getOptions(opsiStr: string): string[] {
    try {
      return JSON.parse(opsiStr) || [];
    } catch {
      return [];
    }
  }

  openForm(date?: string) {
    this.viewMode = 'form';
    this.editingReportId = null;
    this.reportForm.reset();
    this.clearScreenshots();
    const workDate = date || new Date().toISOString().split('T')[0];
    this.reportForm.patchValue({ tanggal: workDate });
    this.loadDeadline(workDate);
  }

  onReportDateChange(date: string): void { this.loadDeadline(date); }

  private loadDeadline(date: string): void {
    this.deadlineInfo = null; this.deadlineError = '';
    if (!date) return;
    this.workReportService.getDeadline(date).subscribe({
      next: info => this.deadlineInfo = info,
      error: err => this.deadlineError = err?.error?.error || 'Informasi batas waktu tidak tersedia.'
    });
  }

  toggleExportDropdown() {
    this.isExportOpen = !this.isExportOpen;
  }

  cancelForm() {
    this.viewMode = 'list';
    this.isExportOpen = false;
    this.editingReportId = null;
  }

  editReport(r: WorkReport) {
    this.viewMode = 'form';
    this.isExportOpen = false;
    this.editingReportId = r.ID || null;
    this.clearScreenshots();
    
    // Parse custom fields if any
    let customFields = {};
    if (r.custom_fields) {
      try {
        customFields = JSON.parse(r.custom_fields);
      } catch (e) {}
    }
    
    this.reportForm.patchValue({
      tanggal: new Date(r.tanggal).toISOString().split('T')[0],
      tugas: r.tugas,
      judul: r.judul,
      deskripsi_kegiatan: r.deskripsi_kegiatan,
      realisasi_kegiatan: r.realisasi_kegiatan,
      kendala: r.kendala,
      rencana_minggu_depan: r.rencana_minggu_depan,
      link_artikel: r.link_artikel,
      catatan_tambahan: r.catatan_tambahan,
      customFieldsForm: customFields
    });
    this.loadDeadline(this.reportForm.value.tanggal);
    
    // If we want to support updating, we would store the active report ID.
    // For now, let's keep it simple or implement full update logic.
    // Since createWorkReport exists, I will just open it. If update is needed, 
    // a new state 'editingReportId' would be needed. 
  }

  onScreenshotsSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (files.length > 3) {
      this.alertService.error('Upload screenshot', 'Maksimal 3 gambar per laporan.');
      input.value = '';
      return;
    }
    const invalid = files.find(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024);
    if (invalid) {
      this.alertService.error('Upload screenshot', 'File harus JPG, PNG, atau WEBP dengan ukuran maksimal 5MB.');
      input.value = '';
      return;
    }
    this.selectedScreenshots = files;
    this.screenshotPreviews = files.map(file => URL.createObjectURL(file));
  }

  clearScreenshots(): void {
    this.screenshotPreviews.forEach(url => URL.revokeObjectURL(url));
    this.selectedScreenshots = [];
    this.screenshotPreviews = [];
  }

  deleteReport(id: number) {
    this.isExportOpen = false;
    Swal.fire({
      title: 'Hapus Laporan?',
      text: "Data yang dihapus tidak dapat dikembalikan!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        this.workReportService.deleteWorkReport(id).subscribe({
          next: () => {
            Swal.fire('Terhapus!', 'Laporan berhasil dihapus.', 'success');
            this.loadInitialData();
          },
          error: (err) => {
            Swal.fire('Gagal', 'Laporan gagal dihapus.', 'error');
          }
        });
      }
    });
  }

  submitReport() {
    if (this.reportForm.invalid) {
      Swal.fire({
        icon: 'error',
        title: 'Formulir Belum Lengkap',
        text: 'Harap lengkapi semua field yang diwajibkan',
        confirmButtonColor: '#2F80ED'
      });
      return;
    }

    Swal.fire({
      title: 'Kirim Laporan Kerja?',
      text: "Apakah Anda yakin data yang diisi sudah benar?",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2F80ED',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Ya, Kirim!',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        this.processSubmit();
      }
    });
  }

  private processSubmit() {
    this.isSubmitting = true;
    const formValue = this.reportForm.value;
    
    const payload = new FormData();
    payload.append('tanggal', formValue.tanggal || '');
    payload.append('tugas', formValue.tugas || '');
    payload.append('judul', formValue.judul || '');
    payload.append('deskripsi_kegiatan', formValue.deskripsi_kegiatan || '');
    payload.append('realisasi_kegiatan', formValue.realisasi_kegiatan || '');
    payload.append('kendala', formValue.kendala || '');
    payload.append('rencana_minggu_depan', formValue.rencana_minggu_depan || '');
    payload.append('link_artikel', formValue.link_artikel || '');
    payload.append('catatan_tambahan', formValue.catatan_tambahan || '');
    payload.append('custom_fields', JSON.stringify(formValue.customFieldsForm || {}));
    this.selectedScreenshots.forEach(file => payload.append('screenshots', file, file.name));

    const request = this.editingReportId 
      ? this.workReportService.updateWorkReport(this.editingReportId, payload)
      : this.workReportService.createWorkReport(payload);

    request.subscribe({
      next: () => {
        this.isSubmitting = false;
        Swal.fire({
          icon: 'success',
          title: 'Berhasil!',
          text: this.editingReportId ? 'Laporan kerja berhasil diperbarui' : 'Laporan kerja berhasil dikirim',
          confirmButtonColor: '#2F80ED'
        }).then(() => {
          this.viewMode = 'list';
          this.editingReportId = null;
          this.loadInitialData();
        });
      },
      error: (err) => {
        this.isSubmitting = false;
        Swal.fire({
          icon: 'error',
          title: 'Gagal',
          text: (this.editingReportId ? 'Gagal memperbarui laporan: ' : 'Gagal mengirim laporan: ') + err.message,
          confirmButtonColor: '#2F80ED'
        });
      }
    });
  }

  exportExcel() {
    if (!this.reports || this.reports.length === 0) return;
    
    const userName = localStorage.getItem('name') || '-';
    const userDivisi = localStorage.getItem('divisi') || 'Belum Ditentukan';
    const userJabatan = localStorage.getItem('jabatan') || 'Belum Ditentukan';

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
              <th class="bg-yellow">Status Validasi</th>`;
              
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
      
      html += `
        <tr>
          <td>${index + 1}</td>
          <td>${dateString}</td>
          <td>${userName}</td>
          <td>${userDivisi}</td>
          <td>${userJabatan}</td>
          <td style="text-align: left;">${(r.tugas || '').replace(/</g, '&lt;')}</td>
          <td style="text-align: left;">${(r.judul || '').replace(/</g, '&lt;')}</td>
          <td style="text-align: left;">${(r.deskripsi_kegiatan || '').replace(/</g, '&lt;')}</td>
          <td>${r.realisasi_kegiatan || ''}</td>
          <td style="text-align: left;">${(r.kendala || '').replace(/</g, '&lt;')}</td>
          <td style="text-align: left;">${(r.rencana_minggu_depan || '').replace(/</g, '&lt;')}</td>
          <td>${r.link_artikel ? `<a href="${r.link_artikel}">${r.link_artikel}</a>` : '-'}</td>
          <td style="text-align: left;">${(r.catatan_tambahan || '').replace(/</g, '&lt;')}</td>
          <td>${r.status_sesuai || 'Menunggu'}</td>`;
          
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
    link.setAttribute('download', `Laporan_Kerja_${userName}_${new Date().getTime()}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
    
  exportCSV() {
    this.isExportOpen = false;
    if (!this.reports || this.reports.length === 0) return;
    const userName = localStorage.getItem('name')?.replace(/\s+/g, '_') || 'Employee';
    
    // Create CSV content manually
    let csvContent = "data:text/csv;charset=utf-8,";
    // Headers
    const headers = ["No", "Tanggal", "Tugas", "Judul", "Deskripsi", "Realisasi", "Kendala", "Rencana", "Status Validasi"];
    csvContent += headers.join(",") + "\n";
    
    this.reports.forEach((r, i) => {
      const row = [
        i + 1,
        new Date(r.tanggal).toISOString().split('T')[0],
        `"${(r.tugas || '').replace(/"/g, '""')}"`,
        `"${(r.judul || '').replace(/"/g, '""')}"`,
        `"${(r.deskripsi_kegiatan || '').replace(/"/g, '""')}"`,
        `"${(r.realisasi_kegiatan || '').replace(/"/g, '""')}"`,
        `"${(r.kendala || '').replace(/"/g, '""')}"`,
        `"${(r.rencana_minggu_depan || '').replace(/"/g, '""')}"`,
        `"${(r.status_sesuai || 'Menunggu').replace(/"/g, '""')}"`
      ];
      csvContent += row.join(",") + "\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Kerja_${userName}_${new Date().getTime()}.csv`);
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
    downloadAnchorNode.setAttribute("download", "laporan_kerja.json");
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
}
