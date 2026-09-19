import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';
import { ReportExportService } from '../../../core/services/report-export.service';
import Swal from 'sweetalert2';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';
import { FilePreviewComponent } from '../../../shared/file-preview/file-preview.component';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-admin-role-operations',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, AdminSidebarComponent, PaginationComponent, FilePreviewComponent],
  templateUrl: './role-operations.component.html',
  styleUrls: ['./role-operations.component.scss']
})
export class RoleOperationsComponent implements OnInit, OnDestroy {

  activeSection: 'internship' | 'team' = 'internship';
  internshipStats: any = {};
  logbooks: any[] = [];
  logbookPageSizeOptions = [10, 25, 50, 100];
  logbookPageSize = 25;
  logbookCurrentPage = 1;
  attendancePage = 1; attendancePageSize = 25; attendancePageSizeOptions = [10, 25, 50, 100]; attendanceTotalItems = 0; attendanceLoading = false;
  reportsPage = 1; reportsPageSize = 25; reportsPageSizeOptions = [10, 25, 50, 100]; reportsTotalItems = 0; reportsLoading = false;
  private attendanceServerPaginated = false; private reportsServerPaginated = false;
  certificates: any[] = [];
  teamStats: any = { team_members: 0, hadir_hari_ini: 0, belum_absen_hari_ini: 0, izin_pending: 0, weekly: [] };
  attendanceRows: any[] = [];
  teamReports: any[] = [];
  teamStatistics: any = { members: [] };
  statisticsManagerGroups: any[] = [];
  expandedStatisticsManagers: Record<string, boolean> = {};
  leaveRequests: any[] = [];
  leavePage = 1;
  leavePageSize = 25;
  leavePageSizeOptions = [10, 25, 50, 100];
  leaveTotalItems = 0;
  leaveLoading = false;
  private leaveServerPaginated = false;
  notes: Record<number, string> = {};
  startDate = new Date().toISOString().slice(0, 10);
  endDate = this.startDate;
  start = '';
  end = '';
  selectedLogbookStatus = '';
  internSearch = '';
  selectedInternId = '';
  certificateStatus = '';
  teamSearch = '';
  attendanceStatus = '';
  selectedCertInternId = '';
  selectedCertificateFiles: Record<number, File | null> = {};
  selectedCertificateFile: File | null = null;
  selectedDocumentFiles: Record<string, File | null> = {};
  uploadingUserId: number | null = null;
  uploadingDocumentKey: string | null = null;
  errorMessage = '';
  openExportMenu: string | null = null;
  selectedLogbookDetail: any = null;
  private readonly api = 'http://localhost:8080/api/v1';
  private disconnectRealtime?: () => void;
  private refreshTimer?: ReturnType<typeof setInterval>;
  private statisticsRefreshHandle?: ReturnType<typeof setTimeout>;
  private statisticsRequestSequence = 0;
  private statisticsRequestInFlight = false;

  constructor(private http: HttpClient, private auth: AuthService, private reportExport: ReportExportService, private notificationService: NotificationService) {}

  isInternshipEnded(row: any): boolean {
    if (!row) return false;
    if (row.is_ended !== undefined && row.is_ended !== null) {
      return !!row.is_ended;
    }
    if (!row.internship_end_date) return false;
    const endDateStr = typeof row.internship_end_date === 'string' ? row.internship_end_date.slice(0, 10) : new Date(row.internship_end_date).toISOString().slice(0, 10);
    const todayStr = new Date().toISOString().slice(0, 10);
    return endDateStr <= todayStr;
  }

  viewLogbookDetail(item: any): void { this.selectedLogbookDetail = item; }
  closeLogbookDetail(): void { this.selectedLogbookDetail = null; }
  logbookStatusClass(item: any): string {
    const status = String(item?.status_logbook || item?.StatusLogbook || item?.status_sesuai || item?.StatusSesuai || 'draft').trim().toLowerCase();
    return status === 'approved'
      ? 'status-success'
      : status === 'submitted'
        ? 'status-warning'
        : status === 'rejected'
          ? 'status-danger'
          : 'status-pending';
  }
  logbookStatusLabel(item: any): string {
    const status = String(item?.status_logbook || item?.StatusLogbook || item?.status_sesuai || item?.StatusSesuai || 'draft').trim().toLowerCase();
    return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Draft';
  }
  deleteLogbook(item: any): void {
    const id = item.id || item.ID;
    if (!id) return;
    if (!confirm('Apakah Anda yakin ingin menghapus logbook ini?')) return;
    this.http.delete(`${this.api}/admin/internship/logbooks/${id}`, { headers: this.headers() }).subscribe({ next: () => this.loadLogbooks(), error: e => this.fail(e) });
  }

  ngOnInit(): void { this.loadInternship(); this.disconnectRealtime = this.notificationService.connectRealtime(() => this.scheduleRealtimeTeamRefresh()); this.refreshTimer = setInterval(() => { if (this.activeSection === 'team') this.loadTeam(); }, 30_000); }
  ngOnDestroy(): void { if (this.refreshTimer) clearInterval(this.refreshTimer); if (this.statisticsRefreshHandle) clearTimeout(this.statisticsRefreshHandle); this.disconnectRealtime?.(); }
  private scheduleRealtimeTeamRefresh(): void { if (this.activeSection !== 'team' || this.statisticsRefreshHandle) return; this.statisticsRefreshHandle = setTimeout(() => { this.statisticsRefreshHandle = undefined; this.loadTeam(); }, 250); }

  selectSection(section: 'internship' | 'team'): void {
    this.activeSection = section;
    this.errorMessage = '';
    if (section === 'internship') this.loadInternship(); else this.loadTeam();
  }

  loadInternship(): void {
    const headers = this.headers();
    this.http.get<any>(`${this.api}/admin/internship/dashboard`, { headers }).subscribe({ next: data => this.internshipStats = data, error: e => this.fail(e) });
    this.loadLogbooks();
    let certificateParams = new HttpParams();
    if (this.certificateStatus) certificateParams = certificateParams.set('status', this.certificateStatus);
    if (this.internSearch) certificateParams = certificateParams.set('search', this.internSearch);
    if (this.selectedCertInternId) certificateParams = certificateParams.set('user_id', this.selectedCertInternId);
    this.http.get<any[]>(`${this.api}/admin/internship/certificates`, { params: certificateParams, headers }).subscribe({ next: data => this.certificates = data || [], error: e => this.fail(e) });
  }

  loadLogbooks(): void {
    this.logbookCurrentPage = 1;
    let params = new HttpParams();
    if (this.selectedLogbookStatus) params = params.set('status', this.selectedLogbookStatus);
    if (this.start) params = params.set('start_date', this.start);
    if (this.end) params = params.set('end_date', this.end);
    if (this.internSearch) params = params.set('search', this.internSearch);
    if (this.selectedInternId) params = params.set('user_id', this.selectedInternId);
    this.http.get<any[]>(`${this.api}/admin/internship/logbooks`, { params, headers: this.headers() }).subscribe({
      next: data => {
        this.logbooks = data || [];
        this.ensureValidLogbookPage();
        for (const row of this.logbooks) {
          const id = row.id || row.ID;
          if (id) {
            this.notes[id] = row.review_notes || row.ReviewNotes || '';
          }
        }
      },
      error: e => this.fail(e)
    });
  }

  reviewLogbook(id: number, status: 'approved' | 'rejected' | 'submitted'): void {
    this.errorMessage = 'Admin tidak memiliki akses untuk mereview logbook magang.';
  }

  onLogbookPageSizeChange(): void {
    this.logbookCurrentPage = 1;
    this.ensureValidLogbookPage();
  }

  goToLogbookPage(page: number | string): void {
    if (typeof page !== 'number') return;
    this.changeLogbookPage(page);
  }

  previousLogbookPage(): void {
    if (this.logbookCurrentPage > 1) {
      this.changeLogbookPage(this.logbookCurrentPage - 1);
    }
  }

  nextLogbookPage(): void {
    if (this.logbookCurrentPage < this.logbookTotalPages()) {
      this.changeLogbookPage(this.logbookCurrentPage + 1);
    }
  }

  logbookTotalPages(): number {
    return Math.max(1, Math.ceil(this.logbooks.length / this.logbookPageSize));
  }

  logbookPageNumbers(): Array<number | string> {
    const total = this.logbookTotalPages();
    const current = this.logbookCurrentPage;

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    if (current <= 3) {
      return [1, 2, 3, 4, '...', total];
    }

    if (current >= total - 2) {
      return [1, '...', total - 3, total - 2, total - 1, total];
    }

    const pages: Array<number | string> = [1];
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    if (start > 2) pages.push('...');
    for (let page = start; page <= end; page++) {
      pages.push(page);
    }
    if (end < total - 1) pages.push('...');
    pages.push(total);

    return pages;
  }

  get logbookPaginationStartIndex(): number {
    return this.logbooks.length === 0 ? 0 : (this.logbookCurrentPage - 1) * this.logbookPageSize;
  }

  get logbookPaginationEndIndex(): number {
    return Math.min(this.logbookPaginationStartIndex + this.logbookPageSize, this.logbooks.length);
  }

  get displayedLogbooks(): any[] {
    return this.logbooks.slice(this.logbookPaginationStartIndex, this.logbookPaginationEndIndex);
  }

  private ensureValidLogbookPage(): void {
    if (this.logbookCurrentPage > this.logbookTotalPages()) {
      this.logbookCurrentPage = this.logbookTotalPages();
    }
  }

  private changeLogbookPage(page: number): void {
    const target = Math.min(Math.max(page, 1), this.logbookTotalPages());
    if (target === this.logbookCurrentPage) return;

    this.blurActiveControl();
    this.logbookCurrentPage = target;
    this.keepLogbookPaginationVisible();
  }

  private blurActiveControl(): void {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
  }

  private keepLogbookPaginationVisible(): void {}

  downloadCertificate(userId: number): void {
    const cert = this.certificates.find(c => c.user_id === userId);
    let ext = '.pdf';
    if (cert?.file_name) {
      const match = cert.file_name.match(/\.[0-9a-z]+$/i);
      if (match) ext = match[0].toLowerCase();
    }
    const fileName = `sertifikat-magang${ext}`;
    this.http.get(`${this.api}/admin/internship/certificates/${userId}/download`, { headers: this.headers(), responseType: 'blob' }).subscribe(blob => {
      const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = fileName; link.click(); URL.revokeObjectURL(link.href);
    }, e => this.fail(e));
  }

  onCertificateFile(event: Event): void { const input = event.target as HTMLInputElement; this.selectedCertificateFile = input.files?.[0] || null; }
  onCertificateFileSelected(event: Event, userId: number): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'pdf' && file.type !== 'application/pdf') {
        this.errorMessage = 'Format file sertifikat harus berupa .pdf';
        input.value = '';
        return;
      }
      this.selectedCertificateFiles[userId] = file;
    }
  }

  uploadCertificate(userId: number): void {
    const file = this.selectedCertificateFiles[userId] || this.selectedCertificateFile;
    if (!file) { this.errorMessage = 'Pilih file PDF terlebih dahulu.'; return; }
    const form = new FormData(); form.append('file', file);
    this.uploadingUserId = userId;
    this.http.post(`${this.api}/admin/internship/certificates/${userId}/upload`, form, { headers: this.headers() }).subscribe({
      next: () => {
        delete this.selectedCertificateFiles[userId];
        this.selectedCertificateFile = null;
        this.uploadingUserId = null;
        this.loadInternship();
        void Swal.fire({ icon: 'success', title: 'Upload berhasil', text: 'Sertifikat magang berhasil disimpan.', timer: 1800, showConfirmButton: false });
      },
      error: e => { this.uploadingUserId = null; this.fail(e); }
    });
  }
  deleteCertificate(userId: number): void {
    void Swal.fire({ title: 'Hapus sertifikat?', text: 'File sertifikat akan dihapus dari daftar.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Ya, hapus', cancelButtonText: 'Batal', reverseButtons: true }).then(result => {
      if (!result.isConfirmed) return;
      this.http.delete(`${this.api}/admin/internship/certificates/${userId}/upload`, { headers: this.headers() }).subscribe({
        next: () => { this.loadInternship(); void Swal.fire({ icon: 'success', title: 'Berhasil dihapus', text: 'Sertifikat magang berhasil dihapus.', timer: 1800, showConfirmButton: false }); },
        error: e => this.fail(e)
      });
    });
  }
  onCertificatePreviewChange(files: File[], userId: number): void { this.selectedCertificateFiles[userId] = files[0] || null; }
  documentKey(userId: number, type: string): string { return `${userId}_${type}`; }
  onDocumentFileSelected(event: Event, userId: number, type: string): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'pdf' || (file.type && file.type !== 'application/pdf')) {
        input.value = '';
        this.errorMessage = 'Format file tidak valid. Nilai Magang dan Keterangan Lulus wajib berupa PDF.';
        void Swal.fire({ icon: 'error', title: 'Format file tidak valid', text: 'Silakan pilih file PDF untuk dokumen magang.' });
        return;
      }
      this.selectedDocumentFiles[this.documentKey(userId, type)] = file;
    }
  }
  uploadDocument(userId: number, type: string): void {
    const key = this.documentKey(Number(userId), type); const file = this.selectedDocumentFiles[key];
    if (!file) { this.errorMessage = 'Pilih file PDF terlebih dahulu.'; return; }
    this.errorMessage = '';
    const form = new FormData();
    form.append('file', file, file.name);
    form.append('document_type', type);
    this.uploadingDocumentKey = key;
    this.http.post<any>(`${this.api}/admin/internship/documents/${Number(userId)}/upload`, form, { headers: this.headers() }).subscribe({
      next: response => {
        const row = this.certificates.find(item => Number(item.user_id) === Number(userId));
        if (row && response?.document) row[type] = response.document;
        delete this.selectedDocumentFiles[key];
        this.uploadingDocumentKey = null;
        this.errorMessage = '';
        this.loadInternship();
        void Swal.fire({ icon: 'success', title: 'Upload berhasil', text: `${type === 'nilai_magang' ? 'Nilai magang' : 'Keterangan lulus'} berhasil disimpan.`, timer: 1800, showConfirmButton: false });
      },
      error: e => { this.uploadingDocumentKey = null; this.fail(e); }
    });
  }
  downloadDocument(userId: number, type: string): void {
    const doc = this.certificates.find(c => c.user_id === userId)?.[type];
    const ext = doc?.file_name?.match(/\.[0-9a-z]+$/i)?.[0]?.toLowerCase() || '.pdf';
    this.http.get(`${this.api}/admin/internship/documents/${userId}/${type}/download`, { headers: this.headers(), responseType: 'blob' }).subscribe(blob => {
      const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${type}${ext}`; link.click(); URL.revokeObjectURL(link.href);
    }, e => this.fail(e));
  }
  deleteDocument(userId: number, type: string): void {
    const label = type === 'nilai_magang' ? 'Nilai magang' : 'Keterangan lulus';
    void Swal.fire({ title: `Hapus ${label.toLowerCase()}?`, text: 'File ini akan dihapus dari daftar.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Ya, hapus', cancelButtonText: 'Batal', reverseButtons: true }).then(result => {
      if (!result.isConfirmed) return;
      this.http.delete(`${this.api}/admin/internship/documents/${userId}/${type}`, { headers: this.headers() }).subscribe({
        next: () => { this.loadInternship(); void Swal.fire({ icon: 'success', title: 'Berhasil dihapus', text: `${label} berhasil dihapus.`, timer: 1800, showConfirmButton: false }); },
        error: e => this.fail(e)
      });
    });
  }
  exportRows(filename: string, headers: string[], rows: any[][]): void {
    this.reportExport.downloadCsv(filename, headers, rows);
  }
  exportLogbooks(): void { this.openExportMenu = null; this.exportRows('logbook-magang.csv', ['Tanggal', 'Peserta', 'Tugas', 'Kegiatan', 'Status', 'Catatan Review'], this.logbooks.map(row => [row.tanggal || row.Tanggal, row.Employee?.User?.Nama || '-', row.tugas || row.Tugas || '-', row.deskripsi_kegiatan || row.DeskripsiKegiatan || '-', row.status_logbook || row.StatusLogbook || '-', row.review_notes || row.ReviewNotes || '-'])); }
  private attendanceExportHeaders = ['Nama', 'Tanggal', 'Status', 'Masuk', 'Pulang'];
  private attendanceExportRows(): any[][] { return this.attendanceRows.map(row => [row.nama, row.tanggal, row.checkout_missing ? 'Belum Check-out' : row.status, row.jam_masuk || '-', row.jam_pulang || '-']); }
  exportAttendance(): void { this.openExportMenu = null; this.reportExport.downloadCsv('absensi-tim.csv', this.attendanceExportHeaders, this.attendanceExportRows()); }
  private reportExportHeaders = ['Tanggal', 'Anggota', 'Tugas', 'Kegiatan', 'Status'];
  private reportExportRows(): any[][] { return this.teamReports.map(row => [row.tanggal || row.Tanggal, row.Employee?.User?.Nama || '-', row.tugas || row.Tugas || '-', row.deskripsi_kegiatan || row.DeskripsiKegiatan || '-', row.status_logbook || row.StatusLogbook || row.status_sesuai || row.StatusSesuai || '-']); }
  exportReports(): void { this.openExportMenu = null; this.reportExport.downloadCsv('laporan-tim.csv', this.reportExportHeaders, this.reportExportRows()); }
  exportCertificates(): void { this.openExportMenu = null; this.exportRows('sertifikat-magang.csv', ['Peserta', 'Institusi', 'Tanggal Selesai', 'Status', 'File'], this.certificates.map(row => [row.nama, row.institution_name, row.internship_end_date, row.uploaded ? 'Sudah diupload' : (!this.isInternshipEnded(row) ? 'Masa magang berlangsung' : 'Belum diupload'), row.file_name])); }
  toggleExportDropdown(menu: string): void { this.openExportMenu = this.openExportMenu === menu ? null : menu; }
  exportLogbooksExcel(): void { this.openExportMenu = null; this.reportExport.downloadExcel('logbook-magang.xls', ['Tanggal', 'Peserta', 'Tugas', 'Kegiatan', 'Status', 'Catatan Review'], this.logbooks.map(row => [row.tanggal || row.Tanggal, row.Employee?.User?.Nama || '-', row.tugas || row.Tugas || '-', row.deskripsi_kegiatan || row.DeskripsiKegiatan || '-', row.status_logbook || row.StatusLogbook || '-', row.review_notes || row.ReviewNotes || '-'])); }
  exportLogbooksJSON(): void { this.openExportMenu = null; this.reportExport.downloadJson('logbook-magang.json', this.logbooks); }
  exportLogbooksPDF(): void {
    this.openExportMenu = null;
    const headers = ['Tanggal', 'Peserta', 'Tugas', 'Kegiatan', 'Status', 'Catatan Review'];
    const rows = this.logbooks.map(row => [row.tanggal || row.Tanggal, row.Employee?.User?.Nama || '-', row.tugas || row.Tugas || '-', row.deskripsi_kegiatan || row.DeskripsiKegiatan || '-', row.status_logbook || row.StatusLogbook || '-', row.review_notes || row.ReviewNotes || '-']);
    void this.reportExport.downloadPdf(`laporan-logbook-magang-${this.exportDate()}.pdf`, 'Laporan Logbook Magang', this.exportDate(), headers, rows);
  }
  printLogbooks(): void {
    this.openExportMenu = null;
    const headers = ['Tanggal', 'Peserta', 'Tugas', 'Kegiatan', 'Status', 'Catatan Review'];
    const rows = this.logbooks.map(row => [row.tanggal || row.Tanggal, row.Employee?.User?.Nama || '-', row.tugas || row.Tugas || '-', row.deskripsi_kegiatan || row.DeskripsiKegiatan || '-', row.status_logbook || row.StatusLogbook || '-', row.review_notes || row.ReviewNotes || '-']);
    this.reportExport.printReport('Laporan Logbook Magang', this.exportDate(), headers, rows);
  }
  exportAttendanceExcel(): void { this.openExportMenu = null; this.reportExport.downloadExcel('absensi-tim.xls', this.attendanceExportHeaders, this.attendanceExportRows()); }
  exportAttendanceJSON(): void { this.openExportMenu = null; this.reportExport.downloadJson('absensi-tim.json', this.attendanceRows); }
  exportAttendancePDF(): void {
    this.openExportMenu = null;
    void this.reportExport.downloadPdf(`laporan-absensi-tim-${this.exportDate()}.pdf`, 'Laporan Absensi Tim', this.exportDate(), this.attendanceExportHeaders, this.attendanceExportRows());
  }
  printAttendance(): void { this.openExportMenu = null; this.reportExport.printReport('Absensi Tim', this.attendanceDateRange(), this.attendanceExportHeaders, this.attendanceExportRows()); }
  exportReportsExcel(): void { this.openExportMenu = null; this.reportExport.downloadExcel('laporan-tim.xls', this.reportExportHeaders, this.reportExportRows()); }
  exportReportsJSON(): void { this.openExportMenu = null; this.reportExport.downloadJson('laporan-tim.json', this.teamReports); }
  exportReportsPDF(): void {
    this.openExportMenu = null;
    void this.reportExport.downloadPdf(`laporan-tim-magang-manejer-${this.exportDate()}.pdf`, 'Laporan Tim MAGANG & MANAJER', this.reportDateRange(), this.reportExportHeaders, this.reportExportRows());
  }
  printReports(): void { this.openExportMenu = null; this.reportExport.printReport('Laporan Tim / Logbook', this.reportDateRange(), this.reportExportHeaders, this.reportExportRows()); }
  exportCertificatesExcel(): void { this.openExportMenu = null; this.reportExport.downloadExcel('sertifikat-magang.xls', ['Peserta', 'Institusi', 'Tanggal Selesai', 'Status', 'File'], this.certificates.map(row => [row.nama, row.institution_name, row.internship_end_date, row.uploaded ? 'Sudah diupload' : (!this.isInternshipEnded(row) ? 'Masa magang berlangsung' : 'Belum diupload'), row.file_name])); }
  exportCertificatesJSON(): void { this.openExportMenu = null; this.reportExport.downloadJson('sertifikat-magang.json', this.certificates); }
  exportCertificatesPDF(): void {
    this.openExportMenu = null;
    const headers = ['Peserta', 'Institusi', 'Tanggal Selesai', 'Status', 'File'];
    const rows = this.certificates.map(row => [row.nama, row.institution_name, row.internship_end_date, row.uploaded ? 'Sudah diupload' : (!this.isInternshipEnded(row) ? 'Masa magang berlangsung' : 'Belum diupload'), row.file_name]);
    void this.reportExport.downloadPdf(`laporan-sertifikat-magang-${this.exportDate()}.pdf`, 'Laporan Sertifikat Magang', this.exportDate(), headers, rows);
  }
  printCertificates(): void {
    this.openExportMenu = null;
    const headers = ['Peserta', 'Institusi', 'Tanggal Selesai', 'Status', 'File'];
    const rows = this.certificates.map(row => [row.nama, row.institution_name, row.internship_end_date, row.uploaded ? 'Sudah diupload' : (!this.isInternshipEnded(row) ? 'Masa magang berlangsung' : 'Belum diupload'), row.file_name]);
    this.reportExport.printReport('Laporan Sertifikat Magang', this.exportDate(), headers, rows);
  }
  private readonly statisticsInitialVisibleMembers = 100;
  private readonly statisticsVisibleStep = 100;
  private buildStatisticsManagerGroups(members: any[]): any[] { const groups = new Map<string, any>(); for (const rawMember of members || []) { const totalHariKerja = Number(rawMember.TotalHariKerja ?? rawMember.Total ?? 0); const hadir = Number(rawMember.Hadir || 0); const terlambat = Number(rawMember.Terlambat || 0); const izinCuti = Number(rawMember.IzinCuti || 0); const alpha = Number(rawMember.Alpha || 0); const belumAbsen = Number(rawMember.BelumAbsen || 0); const percent = (value: number) => totalHariKerja ? value / totalHariKerja * 100 : 0; const member = { ...rawMember, totalHariKerja, hadirPercentage: percent(hadir), terlambatPercentage: percent(terlambat), izinCutiPercentage: percent(izinCuti), alphaPercentage: percent(alpha), belumAbsenPercentage: percent(belumAbsen), attendancePercentage: Number(rawMember.PersentaseKehadiran ?? (totalHariKerja ? Math.round((hadir + terlambat) / totalHariKerja * 100) : 0)) }; const name = member.manager_name?.trim() || 'Belum Ada Manajer'; const managerId = member.manager_id; const key = managerId !== null && managerId !== undefined && String(managerId).trim() !== '' ? `manager-${managerId}` : 'unassigned'; let group = groups.get(key); if (!group) { group = { key, name, members: [], visibleMembers: [], totalMembers: 0, hadir: 0, terlambat: 0, izinCuti: 0, alpha: 0, belumAbsen: 0, total: 0, percentage: 0, expanded: false, visibleLimit: this.statisticsInitialVisibleMembers }; groups.set(key, group); } group.members.push(member); group.totalMembers++; group.hadir += hadir; group.terlambat += terlambat; group.izinCuti += izinCuti; group.alpha += alpha; group.belumAbsen += belumAbsen; group.total += totalHariKerja; } for (const group of groups.values()) { group.percentage = group.total ? Math.round((group.hadir + group.terlambat) / group.total * 100) : 0; this.refreshVisibleStatisticsMembers(group); } return Array.from(groups.values()); }
  private refreshVisibleStatisticsMembers(group: any): void { group.visibleMembers = group.members.slice(0, group.visibleLimit); }
  get showStatisticsManagerControls(): boolean { return this.statisticsManagerGroups.length > 1; }
  toggleStatisticsManager(key: string): void { const group = this.statisticsManagerGroups.find(item => item.key === key); if (!group) return; group.expanded = !group.expanded; this.expandedStatisticsManagers = { ...this.expandedStatisticsManagers, [key]: group.expanded }; }
  expandStatisticsManagers(): void { for (const group of this.statisticsManagerGroups) { group.expanded = true; group.visibleLimit = this.statisticsInitialVisibleMembers; this.refreshVisibleStatisticsMembers(group); } this.expandedStatisticsManagers = Object.fromEntries(this.statisticsManagerGroups.map(group => [group.key, true])); }
  collapseStatisticsManagers(): void { for (const group of this.statisticsManagerGroups) group.expanded = false; this.expandedStatisticsManagers = {}; }
  showMoreStatisticsMembers(group: any): void { group.visibleLimit = Math.min(group.visibleLimit + this.statisticsVisibleStep, group.members.length); this.refreshVisibleStatisticsMembers(group); }
  statisticsTrackBy(_: number, item: any): string { return item.key; }
  statisticsMemberTrackBy(_: number, item: any): number | string { return item.ID ?? item.employee_id ?? item.Name; }
  private teamStatisticsExportRows(): unknown[][] { return this.statisticsManagerGroups.flatMap(group => [[`Manajer: ${group.name}`, '', '', '', '', '', '', ''], ...group.members.map((row: any) => [group.name, row.Name || '-', row.Hadir || 0, row.Terlambat || 0, row.IzinCuti || 0, row.Alpha || 0, row.BelumAbsen || 0, row.TotalHariKerja ?? row.Total ?? 0, row.attendancePercentage])]); }
  private teamStatisticsPrintableRows(): unknown[][] { return this.statisticsManagerGroups.flatMap(group => [[`${group.name} (${group.totalMembers} anggota)`, '', '', '', '', '', '', '', ''], ...group.members.map((row: any) => [group.name, row.Name || '-', row.Hadir || 0, row.Terlambat || 0, row.IzinCuti || 0, row.Alpha || 0, row.BelumAbsen || 0, row.TotalHariKerja ?? row.Total ?? 0, `${row.attendancePercentage}%`])]); }
  exportTeamStatisticsExcel(): void { this.openExportMenu = null; this.reportExport.downloadExcel('statistik-kehadiran-tim.xls', ['Manajer', 'Anggota', 'Hadir', 'Terlambat', 'Izin/Cuti', 'Alpha', 'Belum Absen', 'Total Hari Kerja', 'Persentase'], this.teamStatisticsExportRows()); }
  exportTeamStatisticsJSON(): void { this.openExportMenu = null; this.reportExport.downloadJson('statistik-kehadiran-tim.json', this.teamStatistics); }
  exportTeamStatisticsPDF(): void {
    this.openExportMenu = null;
    const headers = ['Manajer', 'Anggota', 'Hadir', 'Terlambat', 'Persentase Kehadiran'];
    const rows = this.teamStatisticsPrintableRows();
    void this.reportExport.downloadPdf(`laporan-statistik-tim-${this.exportDate()}.pdf`, 'Laporan Statistik Kehadiran Tim', this.exportDate(), headers, rows);
  }
  printTeamStatistics(): void {
    this.openExportMenu = null;
    const headers = ['Manajer', 'Anggota', 'Hadir', 'Terlambat', 'Izin/Cuti', 'Alpha', 'Belum Absen', 'Total Hari Kerja', 'Persentase Kehadiran'];
    this.reportExport.printReport('Laporan Statistik Kehadiran Tim', this.exportDate(), headers, this.teamStatisticsPrintableRows());
  }
  printCurrent(): void { window.print(); }

  private exportDate(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  }

  private reportDateRange(): string {
    if (!this.start && !this.end) return 'Semua tanggal';
    return `${this.start || 'Awal'} - ${this.end || 'Sekarang'}`;
  }

  private attendanceDateRange(): string {
    if (!this.startDate && !this.endDate) return 'Semua tanggal';
    return `${this.startDate || 'Awal'} - ${this.endDate || 'Sekarang'}`;
  }

  loadTeam(): void {
    const headers = this.headers();
    this.http.get<any>(`${this.api}/manager/dashboard`, { headers }).subscribe({ next: data => this.teamStats = data, error: e => this.fail(e) });
    this.loadAttendance(); this.loadReports(); this.loadStatistics();
    this.loadLeaveRequests();
  }

  loadLeaveRequests(page = 1): void {
    this.leavePage = page;
    this.leaveLoading = true;
    const params = new HttpParams().set('page', page).set('limit', this.leavePageSize);
    this.http.get<any>(`${this.api}/manager/leaves`, { params, headers: this.headers() }).subscribe({
      next: response => {
        this.leaveServerPaginated = !Array.isArray(response) && Array.isArray(response?.data);
        const requests = this.leaveServerPaginated ? response.data : (response || []);
        this.leaveRequests = requests.map((request: any) => ({
          ...request,
          Status: this.leaveStatusLabel(request.Status)
        }));
        this.leaveRequests.forEach((request: any) => {
          // The operational overview uses one compact Catatan column. Admin
          // approval notes are the authoritative value there; retain manager
          // and legacy fields as fallbacks for older requests.
          // The operational overview uses one compact Catatan column. Admin
          // approval notes are the authoritative value there; retain manager
          // and legacy fields as fallbacks for older requests.
          this.notes[request.ID] = request.admin_notes
            || request.AdminNotes
            || request.Notes
            || request.notes
            || request.manager_notes
            || request.ManagerNotes
            || '';
        });
        this.leaveTotalItems = this.leaveServerPaginated ? Number(response.total || this.leaveRequests.length) : this.leaveRequests.length;
        this.leavePage = Number(response?.page || page);
        this.leaveLoading = false;
        setTimeout(() => this.syncLeaveStatusStyles());
      },
      error: e => { this.leaveLoading = false; this.fail(e); }
    });
  }

  get displayedLeaveRequests(): any[] {
    return this.leaveServerPaginated
      ? this.leaveRequests
      : this.leaveRequests.slice((this.leavePage - 1) * this.leavePageSize, this.leavePage * this.leavePageSize);
  }

  leavePageChanged(page: number): void { this.loadLeaveRequests(page); }
  leavePageSizeChanged(size: number): void { this.leavePageSize = size; this.loadLeaveRequests(1); }

  leaveStatusLabel(status: string): string {
    return ({
      pending_manager_approval: 'Menunggu Persetujuan Manajer',
      manager_approved: 'Disetujui Manajer',
      manager_rejected: 'Ditolak Manajer',
      pending_hrd_approval: 'Menunggu Persetujuan HRD',
      hrd_approved: 'Disetujui HRD',
      hrd_rejected: 'Ditolak HRD',
      Pending: 'Menunggu Persetujuan Manajer',
      Approved: 'Disetujui',
      Rejected: 'Ditolak'
    } as Record<string, string>)[status] || status || '-';
  }

  private syncLeaveStatusStyles(): void {
    const section = Array.from(document.querySelectorAll<HTMLElement>('.role-operations-page section'))
      .find(item => item.querySelector('h3')?.textContent?.trim() === 'Persetujuan Izin Tim');
    if (!section) return;
    section.querySelectorAll('tbody tr').forEach((row, index) => {
      const pill = row.querySelector<HTMLElement>('.status-pill');
      const request = this.displayedLeaveRequests[index];
      if (!pill || !request) return;
      const status = String(request.Status || '').toLowerCase();
      pill.classList.remove('leave-status-success', 'leave-status-warning', 'leave-status-danger', 'leave-status-pending');
      pill.classList.add(status.includes('disetujui') ? 'leave-status-success' : status.includes('ditolak') || status.includes('cancel') ? 'leave-status-danger' : status.includes('menunggu') ? 'leave-status-warning' : 'leave-status-pending');
    });
  }

  loadAttendance(page = 1, keepAttendanceVisible = false): void {
    if (this.startDate && this.endDate && this.endDate < this.startDate) { this.errorMessage = 'Sampai tanggal tidak boleh lebih kecil dari Dari tanggal.'; return; }
    this.errorMessage = '';
    this.attendancePage = page; this.attendanceLoading = true; let params = new HttpParams().set('page', page).set('limit', this.attendancePageSize); if (this.startDate) params = params.set('start_date', this.startDate); if (this.endDate) params = params.set('end_date', this.endDate); if (this.teamSearch) params = params.set('search', this.teamSearch); if (this.attendanceStatus) params = params.set('status', this.attendanceStatus);
    this.http.get<any>(`${this.api}/manager/team/attendance`, { params, headers: this.headers() }).subscribe({ next: response => { this.attendanceServerPaginated = !Array.isArray(response) && Array.isArray(response?.data); this.attendanceRows = this.attendanceServerPaginated ? response.data : (response || []); this.attendanceTotalItems = this.attendanceServerPaginated ? Number(response.total || this.attendanceRows.length) : this.attendanceRows.length; this.attendancePage = Number(response?.page || 1); this.attendanceLoading = false; setTimeout(() => { this.syncAttendanceStatusStyles(); if (keepAttendanceVisible) this.keepAttendancePanelVisible(); }); }, error: e => { this.attendanceLoading = false; this.fail(e); } });
  }

  loadReports(page = 1): void {
    this.reportsPage = page; this.reportsLoading = true; let params = new HttpParams().set('page', page).set('limit', this.reportsPageSize); if (this.start) params = params.set('start_date', this.start); if (this.end) params = params.set('end_date', this.end);
    if (this.teamSearch) params = params.set('search', this.teamSearch);
    this.http.get<any>(`${this.api}/manager/team/reports`, { params, headers: this.headers() }).subscribe({ next: response => { this.reportsServerPaginated = !Array.isArray(response) && Array.isArray(response?.data); this.teamReports = this.reportsServerPaginated ? response.data : (response || []); this.reportsTotalItems = this.reportsServerPaginated ? Number(response.total || this.teamReports.length) : this.teamReports.length; this.reportsPage = Number(response?.page || 1); this.reportsLoading = false; }, error: e => { this.reportsLoading = false; this.fail(e); } });
  }

  get displayedAttendanceRows(): any[] { return this.attendanceServerPaginated ? this.attendanceRows : this.attendanceRows.slice((this.attendancePage - 1) * this.attendancePageSize, this.attendancePage * this.attendancePageSize); }
  attendanceStatusLabel(status: string): string { const normalized = String(status || '').trim().toLowerCase(); return normalized === 'tidak hadir' || normalized === 'alpha' || normalized === 'alfa' ? 'Alpha' : status; }
  attendanceStatusClass(status: string): string { const normalized = String(status || '').trim().toLowerCase(); return normalized === 'izin' ? 'status-izin' : ''; }
  private syncAttendanceStatusStyles(): void {
    const panel = Array.from(document.querySelectorAll<HTMLElement>('.role-operations-page section.team-filter-panel')).find(item => item.querySelector('h3')?.textContent?.trim() === 'Absensi Tim');
    if (!panel) return;
    panel.querySelectorAll('tbody tr').forEach((row, index) => {
      const pill = row.querySelector<HTMLElement>('.status-pill');
      const data = this.displayedAttendanceRows[index];
      if (!pill || !data || data.checkout_missing) return;
      const normalized = String(data.status || '').trim().toLowerCase();
      pill.classList.remove('status-hadir', 'status-alpha', 'status-tidak-hadir', 'status-terlambat', 'status-pending');
      pill.classList.add(normalized === 'hadir' ? 'status-hadir' : normalized === 'izin' ? 'status-izin' : normalized === 'terlambat' ? 'status-terlambat' : normalized === 'alpha' || normalized === 'alfa' || normalized === 'tidak hadir' ? 'status-alpha' : 'status-pending');
    });
  }
  get displayedTeamReports(): any[] { return this.reportsServerPaginated ? this.teamReports : this.teamReports.slice((this.reportsPage - 1) * this.reportsPageSize, this.reportsPage * this.reportsPageSize); }
  attendancePageChanged(page: number): void { this.loadAttendance(page, true); }
  attendancePageSizeChanged(size: number): void { this.attendancePageSize = size; this.loadAttendance(1, true); }
  private keepAttendancePanelVisible(): void {
    const panel = Array.from(document.querySelectorAll<HTMLElement>('.role-operations-page section.team-filter-panel'))
      .find(item => item.querySelector('h3')?.textContent?.trim() === 'Absensi Tim');
    panel?.scrollIntoView({ behavior: 'auto', block: 'start' });
  }
  reportsPageChanged(page: number): void { this.loadReports(page); }
  reportsPageSizeChanged(size: number): void { this.reportsPageSize = size; this.loadReports(1); }

  loadStatistics(): void {
    if (this.statisticsRequestInFlight) return; const sequence = ++this.statisticsRequestSequence; this.statisticsRequestInFlight = true;
    let params = new HttpParams(); if (this.start) params = params.set('start_date', this.start); if (this.end) params = params.set('end_date', this.end);
    this.http.get<any>(`${this.api}/manager/team/statistics`, { params, headers: this.headers() }).subscribe({ next: data => { if (sequence === this.statisticsRequestSequence) { this.teamStatistics = data; this.statisticsManagerGroups = this.buildStatisticsManagerGroups(data?.members || []); this.expandedStatisticsManagers = {}; } this.statisticsRequestInFlight = false; }, error: e => { this.statisticsRequestInFlight = false; if (sequence === this.statisticsRequestSequence) this.fail(e); } });
  }

  exportTeamStatistics(): void {
    let params = new HttpParams().set('format', 'csv'); if (this.start) params = params.set('start_date', this.start); if (this.end) params = params.set('end_date', this.end);
    this.http.get(`${this.api}/manager/team/statistics`, { params, headers: this.headers(), responseType: 'blob' }).subscribe(blob => { const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'statistik-kehadiran-tim.csv'; link.click(); });
  }

  async decideLeave(id: number, status: 'Approved' | 'Rejected'): Promise<void> {
    let rejection_reason = '';
    if (status === 'Rejected') {
      const result = await Swal.fire({ title: 'Alasan Ditolak', input: 'textarea', inputLabel: 'Alasan Ditolak', inputPlaceholder: 'Wajib diisi', showCancelButton: true, confirmButtonText: 'Tolak Pengajuan', cancelButtonText: 'Batal', inputValidator: value => !String(value || '').trim() ? 'Alasan Ditolak wajib diisi' : undefined });
      if (!result.isConfirmed) return;
      rejection_reason = String(result.value || '').trim();
    } else {
      const result = await Swal.fire({ title: 'Setujui pengajuan?', icon: 'question', showCancelButton: true, confirmButtonText: 'Setujui', cancelButtonText: 'Batal' });
      if (!result.isConfirmed) return;
    }
    this.http.put(`${this.api}/manager/leaves/${id}/approve`, { status, notes: this.notes[id] || '', catatan: this.notes[id] || '', rejection_reason }, { headers: this.headers() }).subscribe({ next: () => this.loadTeam(), error: e => this.fail(e) });
  }

  managerNote(request: any): string { return request?.manager_notes || request?.ManagerNotes || '-'; }
  adminNote(request: any): string { return request?.admin_notes || request?.AdminNotes || '-'; }
  leaveNote(request: any): string {
    const admin = String(request?.admin_notes || request?.AdminNotes || '').trim();
    const manager = String(request?.manager_notes || request?.ManagerNotes || '').trim();
    const legacy = String(request?.Notes || request?.notes || request?.catatan || request?.Catatan || '').trim();
    const notes: string[] = [];

    if (admin) notes.push(`Catatan Admin: ${admin}`);
    if (manager) notes.push(`Catatan Manajer: ${manager}`);
    // Older records may only have the shared note field. Keep it visible
    // without attributing it to the wrong approver.
    if (!admin && !manager && legacy) notes.push(`Catatan: ${legacy}`);

    return notes.join(' | ') || '-';
  }
  rejectionReason(request: any): string { return request?.RejectionReason || request?.rejection_reason || '-'; }

  private headers(): HttpHeaders { return new HttpHeaders().set('Authorization', `Bearer ${this.auth.getToken()}`); }
  private fail(error: any): void {
    const serverError = typeof error?.error === 'string' ? error.error : error?.error?.error;
    this.errorMessage = serverError || error?.message || 'Gagal memuat data operasional role.';
  }
}
