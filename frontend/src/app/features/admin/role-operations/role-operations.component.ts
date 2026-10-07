import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams, HttpContext } from '@angular/common/http';
import { finalize } from 'rxjs';
import { SKIP_PAGE_LOADING } from '../../../core/interceptors/page-loading-context';
import { AuthService } from '../../../core/services/auth.service';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';
import { ReportExportService } from '../../../core/services/report-export.service';
import Swal from 'sweetalert2';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';
import { FilePreviewComponent } from '../../../shared/file-preview/file-preview.component';
import { NotificationService } from '../../../core/services/notification.service';
import { RouterLink } from '@angular/router';
import { normalizeWorkReportContract, WORK_REPORT_NO_REPORT_LABEL } from '../../../core/utils/work-report-contract';
import { canonicalWorkReportTitle } from '../../../core/utils/work-report-title';
import { canonicalWorkReportExportRecord } from '../../../core/utils/work-report-export';

@Component({
  selector: 'app-admin-role-operations',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, AdminSidebarComponent, PaginationComponent, FilePreviewComponent, RouterLink],
  templateUrl: './role-operations.component.html',
  styleUrls: ['./role-operations.component.scss']
})
export class RoleOperationsComponent implements OnInit, OnDestroy {

  readonly canonicalWorkReportTitle = canonicalWorkReportTitle;

  activeSection: 'internship' | 'team' = 'internship';
  internshipStats: any = {};
  certificatePageSizeOptions = [10, 25, 50, 100];
  certificatePageSize = 25;
  certificateCurrentPage = 1;
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
  startDate = this.todayBusinessDate();
  endDate = this.startDate;
  start = '';
  end = '';
  internSearch = '';
  selectedInternId = '';
  certificateStatus = '';
  attendanceSearch = '';
  reportSearch = '';
  attendanceStatus = '';
  selectedCertInternId = '';
  selectedCertificateFiles: Record<number, File | null> = {};
  selectedCertificateFile: File | null = null;
  selectedDocumentFiles: Record<string, File | null> = {};
  uploadingUserId: number | null = null;
  uploadingDocumentKey: string | null = null;
  errorMessage = '';
  openExportMenu: string | null = null;
  private readonly api = 'http://localhost:8080/api/v1';
  private disconnectRealtime?: () => void;
  private statisticsRefreshHandle?: ReturnType<typeof setTimeout>;
  private statisticsRequestSequence = 0;
  private statisticsRequestInFlight = false;
  private dashboardRequestInFlight = false;
  private attendanceRequestSequence = 0;
  private reportsRequestSequence = 0;
  private leaveRequestInFlight = false;
  private destroyed = false;

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

  reportStatusClass(row: any): string {
    const status = normalizeWorkReportContract(row).status;
    return status === 'approved' ? 'status-success' : status === 'rejected' ? 'status-danger' : status === 'no_report' ? 'status-neutral' : status === 'submitted' ? 'status-warning' : 'status-pending';
  }

  reportStatusLabel(row: any): string {
    const status = normalizeWorkReportContract(row).status;
    return status === 'approved' ? 'Disetujui' : status === 'rejected' ? 'Ditolak' : status === 'draft' ? 'Draft' : status === 'no_report' ? WORK_REPORT_NO_REPORT_LABEL : 'Diajukan';
  }

  private isDraftReport(row: any): boolean {
    return normalizeWorkReportContract(row).filling_status === 'draft';
  }

  private blurActiveControl(): void {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) activeElement.blur();
  }

  ngOnInit(): void { this.loadInternship(); this.disconnectRealtime = this.notificationService.connectRealtime(eventName => { if (['new_checkin', 'new_checkout', 'new_work_report', 'work_report_status_updated', 'leave_request_created', 'leave_status_updated', 'leave_note_updated'].includes(eventName)) this.scheduleRealtimeTeamRefresh(); }); }
  ngOnDestroy(): void { this.destroyed = true; if (this.statisticsRefreshHandle) clearTimeout(this.statisticsRefreshHandle); this.disconnectRealtime?.(); }
  private scheduleRealtimeTeamRefresh(): void { if (this.destroyed || this.activeSection !== 'team' || this.statisticsRefreshHandle) return; this.statisticsRefreshHandle = setTimeout(() => { this.statisticsRefreshHandle = undefined; if (!this.destroyed && this.activeSection === 'team') this.loadTeam(true); }, 250); }

  selectSection(section: 'internship' | 'team'): void {
    this.activeSection = section;
    this.errorMessage = '';
    if (section === 'internship') this.loadInternship(); else this.loadTeam();
  }

  loadInternship(): void {
    const headers = this.headers();
    this.http.get<any>(`${this.api}/admin/internship/dashboard`, { headers }).subscribe({ next: data => this.internshipStats = {
      ...data,
      work_reports_pending: Number(data?.work_reports_pending) || 0
    }, error: e => this.fail(e) });
    this.certificateCurrentPage = 1;
    let certificateParams = new HttpParams();
    if (this.certificateStatus) certificateParams = certificateParams.set('status', this.certificateStatus);
    if (this.internSearch) certificateParams = certificateParams.set('search', this.internSearch);
    if (this.selectedCertInternId) certificateParams = certificateParams.set('user_id', this.selectedCertInternId);
    this.http.get<any[]>(`${this.api}/admin/internship/certificates`, { params: certificateParams, headers }).subscribe({
      next: data => {
        this.certificates = data || [];
        this.ensureValidCertificatePage();
      },
      error: e => this.fail(e)
    });
  }

  onCertificatePageSizeChange(): void {
    this.certificateCurrentPage = 1;
    this.ensureValidCertificatePage();
  }

  goToCertificatePage(page: number | string): void {
    if (typeof page !== 'number') return;
    this.changeCertificatePage(page);
  }

  certificateTotalPages(): number {
    return Math.max(1, Math.ceil(this.certificates.length / this.certificatePageSize));
  }

  get certificatePaginationStartIndex(): number {
    return this.certificates.length === 0 ? 0 : (this.certificateCurrentPage - 1) * this.certificatePageSize;
  }

  get certificatePaginationEndIndex(): number {
    return Math.min(this.certificatePaginationStartIndex + this.certificatePageSize, this.certificates.length);
  }

  get displayedCertificates(): any[] {
    return this.certificates.slice(this.certificatePaginationStartIndex, this.certificatePaginationEndIndex);
  }

  private ensureValidCertificatePage(): void {
    if (this.certificateCurrentPage > this.certificateTotalPages()) {
      this.certificateCurrentPage = this.certificateTotalPages();
    }
  }

  private changeCertificatePage(page: number): void {
    const target = Math.min(Math.max(page, 1), this.certificateTotalPages());
    if (target === this.certificateCurrentPage) return;

    this.blurActiveControl();
    this.certificateCurrentPage = target;
  }

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
  private attendanceExportHeaders = ['Nama', 'Tanggal', 'Status', 'Masuk', 'Pulang'];
  private attendanceExportRows(): any[][] { return this.attendanceRows.map(row => [row.nama, row.tanggal, row.checkout_missing ? 'Belum Check-out' : row.status, row.jam_masuk || '-', row.jam_pulang || '-']); }
  exportAttendance(): void { this.openExportMenu = null; this.reportExport.downloadCsv('absensi-tim.csv', this.attendanceExportHeaders, this.attendanceExportRows()); }
  private reportExportHeaders = ['Tanggal', 'Anggota', 'Judul Tugas', 'Kegiatan', 'Status'];
  private reportExportRows(reports = this.teamReports): any[][] { return reports.map(row => [row.tanggal || row.Tanggal, row.Employee?.User?.Nama || '-', canonicalWorkReportTitle(row) || '-', row.deskripsi_kegiatan || row.DeskripsiKegiatan || '-', this.reportStatusLabel(row)]); }
  exportReports(): void { this.openExportMenu = null; this.withAllExportReports(rows => this.reportExport.downloadCsv('laporan-tim.csv', this.reportExportHeaders, this.reportExportRows(rows))); }
  exportCertificates(): void { this.openExportMenu = null; this.exportRows('sertifikat-magang.csv', ['Peserta', 'Institusi', 'Tanggal Selesai', 'Status', 'File'], this.certificates.map(row => [row.nama, row.institution_name, row.internship_end_date, row.uploaded ? 'Sudah diupload' : (!this.isInternshipEnded(row) ? 'Masa magang berlangsung' : 'Belum diupload'), row.file_name])); }
  toggleExportDropdown(menu: string): void { this.openExportMenu = this.openExportMenu === menu ? null : menu; }
  exportAttendanceExcel(): void { this.openExportMenu = null; this.reportExport.downloadExcel('absensi-tim.xls', this.attendanceExportHeaders, this.attendanceExportRows()); }
  exportAttendanceJSON(): void { this.openExportMenu = null; this.reportExport.downloadJson('absensi-tim.json', this.attendanceRows); }
  exportAttendancePDF(): void {
    this.openExportMenu = null;
    void this.reportExport.downloadPdf(`laporan-absensi-tim-${this.exportDate()}.pdf`, 'Laporan Absensi Tim', this.exportDate(), this.attendanceExportHeaders, this.attendanceExportRows());
  }
  printAttendance(): void { this.openExportMenu = null; this.reportExport.printReport('Absensi Tim', this.attendanceDateRange(), this.attendanceExportHeaders, this.attendanceExportRows()); }
  exportReportsExcel(): void { this.openExportMenu = null; this.withAllExportReports(rows => this.reportExport.downloadExcel('laporan-tim.xls', this.reportExportHeaders, this.reportExportRows(rows))); }
  exportReportsJSON(): void { this.openExportMenu = null; this.withAllExportReports(rows => this.reportExport.downloadJson('laporan-tim.json', rows.map(row => canonicalWorkReportExportRecord(row, { judul_tugas: canonicalWorkReportTitle(row), status_pengisian: this.reportStatusLabel(row), status_validasi: this.reportStatusLabel(row) })))); }
  exportReportsPDF(): void {
    this.openExportMenu = null;
    this.withAllExportReports(rows => void this.reportExport.downloadPdf(`laporan-tim-magang-manejer-${this.exportDate()}.pdf`, 'Laporan Tim MAGANG & MANAJER', this.reportDateRange(), this.reportExportHeaders, this.reportExportRows(rows)));
  }
  printReports(): void { this.openExportMenu = null; this.withAllExportReports(rows => this.reportExport.printReport('Laporan Tim', this.reportDateRange(), this.reportExportHeaders, this.reportExportRows(rows))); }
  private withAllExportReports(done: (reports: any[]) => void): void {
    let params = new HttpParams();
    if (this.start) params = params.set('start_date', this.start);
    if (this.end) params = params.set('end_date', this.end);
    if (this.reportSearch) params = params.set('search', this.reportSearch);
    this.http.get<any>(`${this.api}/manager/team/reports`, { params, headers: this.headers() }).subscribe({
      next: response => {
        const rows = (Array.isArray(response) ? response : (response?.data || []))
          .filter((row: any) => !this.isDraftReport(row));
        const seen = new Set<string>();
        done(rows.filter((row: any) => {
          const id = row?.ID ?? row?.id;
          if (id === undefined || id === null || id === '') return true;
          const key = String(id);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }));
      },
      error: () => done(this.teamReports.filter(row => !this.isDraftReport(row)))
    });
  }
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

  loadTeam(background = false): void {
    const headers = this.headers();
    const context = new HttpContext().set(SKIP_PAGE_LOADING, background);
    if (!this.dashboardRequestInFlight) {
      this.dashboardRequestInFlight = true;
      this.http.get<any>(`${this.api}/manager/dashboard`, { headers, context }).pipe(finalize(() => this.dashboardRequestInFlight = false)).subscribe({ next: data => this.teamStats = data, error: e => this.fail(e) });
    }
    this.loadAttendance(undefined, false, background); this.loadReports(undefined, background); this.loadStatistics(background);
    this.loadLeaveRequests(undefined, background);
  }

  loadLeaveRequests(page?: number, background = false): void {
    if (this.leaveRequestInFlight) return;
    const requestedPage = page ?? this.leavePage;
    this.leavePage = requestedPage;
    this.leaveLoading = !background;
    const params = new HttpParams().set('page', requestedPage).set('limit', this.leavePageSize);
    const context = new HttpContext().set(SKIP_PAGE_LOADING, background);
    this.leaveRequestInFlight = true;
    this.http.get<any>(`${this.api}/manager/leaves`, { params, headers: this.headers(), context }).pipe(finalize(() => this.leaveRequestInFlight = false)).subscribe({
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
          if (!Object.prototype.hasOwnProperty.call(this.notes, request.ID)) this.notes[request.ID] = request.admin_notes || request.AdminNotes || request.Notes || request.notes || request.manager_notes || request.ManagerNotes || '';
        });
        this.leaveTotalItems = this.leaveServerPaginated ? Number(response.total || this.leaveRequests.length) : this.leaveRequests.length;
        this.leavePage = Number(response?.page || requestedPage);
        if (!background) this.leaveLoading = false;
        setTimeout(() => this.syncLeaveStatusStyles());
      },
      error: e => { if (!background) this.leaveLoading = false; this.fail(e); }
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

  applyAttendanceFilters(): void {
    const validationError = this.validateDateRange(this.startDate, this.endDate);
    if (validationError) { this.errorMessage = validationError; return; }
    this.attendancePage = 1;
    this.loadAttendance(1);
  }

  applyReportFilters(): void {
    const validationError = this.validateDateRange(this.start, this.end);
    if (validationError) { this.errorMessage = validationError; return; }
    this.reportsPage = 1;
    this.loadReports(1);
  }

  loadAttendance(page?: number, keepAttendanceVisible = false, background = false): void {
    const validationError = this.validateDateRange(this.startDate, this.endDate);
    if (validationError) { this.errorMessage = validationError; this.attendanceLoading = false; return; }
    this.errorMessage = '';
    const requestedPage = page ?? this.attendancePage;
    this.attendancePage = requestedPage;
    this.attendanceLoading = !background;
    let params = new HttpParams().set('page', requestedPage).set('limit', this.attendancePageSize);
    if (this.startDate) params = params.set('start_date', this.startDate);
    if (this.endDate) params = params.set('end_date', this.endDate);
    if (this.attendanceSearch) params = params.set('search', this.attendanceSearch);
    if (this.attendanceStatus) params = params.set('status', this.attendanceStatus);
    const requestId = ++this.attendanceRequestSequence;
    const context = new HttpContext().set(SKIP_PAGE_LOADING, background);
    this.http.get<any>(`${this.api}/manager/team/attendance`, { params, headers: this.headers(), context }).pipe(finalize(() => {
      if (requestId === this.attendanceRequestSequence) this.attendanceLoading = false;
    })).subscribe({ next: response => {
      if (requestId !== this.attendanceRequestSequence) return;
      this.attendanceServerPaginated = !Array.isArray(response) && Array.isArray(response?.data);
      this.attendanceRows = this.attendanceServerPaginated ? response.data : (response || []);
      this.attendanceTotalItems = this.attendanceServerPaginated ? Number(response.total || this.attendanceRows.length) : this.attendanceRows.length;
      this.attendancePage = Number(response?.page || requestedPage);
      setTimeout(() => { this.syncAttendanceStatusStyles(); if (keepAttendanceVisible) this.keepAttendancePanelVisible(); });
    }, error: e => {
      if (requestId !== this.attendanceRequestSequence) return;
      this.fail(e);
    } });
  }

  loadReports(page?: number, background = false): void {
    const validationError = this.validateDateRange(this.start, this.end);
    if (validationError) { this.errorMessage = validationError; this.reportsLoading = false; return; }
    const requestedPage = page ?? this.reportsPage;
    this.reportsPage = requestedPage;
    this.reportsLoading = !background;
    let params = new HttpParams().set('page', requestedPage).set('limit', this.reportsPageSize);
    if (this.start) params = params.set('start_date', this.start);
    if (this.end) params = params.set('end_date', this.end);
    if (this.reportSearch) params = params.set('search', this.reportSearch);
    const requestId = ++this.reportsRequestSequence;
    const context = new HttpContext().set(SKIP_PAGE_LOADING, background);
    this.http.get<any>(`${this.api}/manager/team/reports`, { params, headers: this.headers(), context }).pipe(finalize(() => {
      if (requestId === this.reportsRequestSequence) this.reportsLoading = false;
    })).subscribe({ next: response => {
      if (requestId !== this.reportsRequestSequence) return;
      this.reportsServerPaginated = !Array.isArray(response) && Array.isArray(response?.data);
      this.teamReports = (this.reportsServerPaginated ? response.data : (response || []))
        .filter((row: any) => !this.isDraftReport(row));
      this.reportsTotalItems = this.reportsServerPaginated ? Number(response.total || this.teamReports.length) : this.teamReports.length;
      this.reportsPage = Number(response?.page || requestedPage);
    }, error: e => {
      if (requestId !== this.reportsRequestSequence) return;
      this.fail(e);
    } });
  }

  get displayedAttendanceRows(): any[] { return this.attendanceServerPaginated ? this.attendanceRows : this.attendanceRows.slice((this.attendancePage - 1) * this.attendancePageSize, this.attendancePage * this.attendancePageSize); }
  attendanceStatusLabel(status: string): string { const normalized = String(status || '').trim().toLowerCase(); return normalized === 'tidak hadir' || normalized === 'alpha' || normalized === 'alfa' ? 'Alpha' : status; }
  attendanceStatusClass(status: string): string {
    const normalized = String(status || '').trim().toLowerCase();
    if (normalized === 'hadir') return 'status-hadir';
    if (normalized === 'izin') return 'status-izin';
    if (normalized === 'terlambat') return 'status-terlambat';
    if (normalized === 'alpha' || normalized === 'alfa' || normalized === 'tidak hadir') return 'status-alpha';
    return 'status-pending';
  }
  private syncAttendanceStatusStyles(): void {
    const panel = Array.from(document.querySelectorAll<HTMLElement>('.role-operations-page section.team-filter-panel')).find(item => item.querySelector('h3')?.textContent?.trim() === 'Absensi Tim');
    if (!panel) return;
    panel.querySelectorAll('tbody tr').forEach((row, index) => {
      const pill = row.querySelector<HTMLElement>('.status-pill');
      const data = this.displayedAttendanceRows[index];
      if (!pill || !data || data.checkout_missing) return;
      const normalized = String(data.status || '').trim().toLowerCase();
       pill.classList.remove('status-hadir', 'status-izin', 'status-alpha', 'status-tidak-hadir', 'status-terlambat', 'status-pending');
      pill.classList.add(normalized === 'hadir' ? 'status-hadir' : normalized === 'izin' ? 'status-izin' : normalized === 'terlambat' ? 'status-terlambat' : normalized === 'alpha' || normalized === 'alfa' || normalized === 'tidak hadir' ? 'status-alpha' : 'status-pending');
    });
  }
  get displayedTeamReports(): any[] {
    const visibleReports = this.teamReports.filter(row => !this.isDraftReport(row));
    return this.reportsServerPaginated ? visibleReports : visibleReports.slice((this.reportsPage - 1) * this.reportsPageSize, this.reportsPage * this.reportsPageSize);
  }
  attendancePageChanged(page: number): void { this.loadAttendance(page, true); }
  attendancePageSizeChanged(size: number): void { this.attendancePageSize = size; this.loadAttendance(1, true); }
  private keepAttendancePanelVisible(): void {
    const panel = Array.from(document.querySelectorAll<HTMLElement>('.role-operations-page section.team-filter-panel'))
      .find(item => item.querySelector('h3')?.textContent?.trim() === 'Absensi Tim');
    panel?.scrollIntoView({ behavior: 'auto', block: 'start' });
  }
  reportsPageChanged(page: number): void { this.loadReports(page); }
  reportsPageSizeChanged(size: number): void { this.reportsPageSize = size; this.loadReports(1); }

  private todayBusinessDate(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  }

  private validateDateRange(start: string, end: string): string {
    return start && end && start > end
      ? 'Sampai tanggal tidak boleh lebih kecil dari Dari tanggal.'
      : '';
  }

  loadStatistics(background = false): void {
    if (this.statisticsRequestInFlight) return; const sequence = ++this.statisticsRequestSequence; this.statisticsRequestInFlight = true;
    let params = new HttpParams(); if (this.start) params = params.set('start_date', this.start); if (this.end) params = params.set('end_date', this.end);
    const context = new HttpContext().set(SKIP_PAGE_LOADING, background);
    this.http.get<any>(`${this.api}/manager/team/statistics`, { params, headers: this.headers(), context }).pipe(finalize(() => this.statisticsRequestInFlight = false)).subscribe({ next: data => { if (sequence === this.statisticsRequestSequence) { const previousGroups = new Map(this.statisticsManagerGroups.map(group => [group.key, { expanded: group.expanded, visibleLimit: group.visibleLimit }])); this.teamStatistics = data; this.statisticsManagerGroups = this.buildStatisticsManagerGroups(data?.members || []); if (background) { for (const group of this.statisticsManagerGroups) { const previous = previousGroups.get(group.key); if (previous) { group.expanded = previous.expanded; group.visibleLimit = Math.min(previous.visibleLimit, group.members.length); this.refreshVisibleStatisticsMembers(group); } } } else { this.expandedStatisticsManagers = {}; } } }, error: e => { if (sequence === this.statisticsRequestSequence) this.fail(e); } });
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
    this.http.put(`${this.api}/manager/leaves/${id}/approve`, { status, notes: this.notes[id] || '', catatan: this.notes[id] || '', rejection_reason }, { headers: this.headers() }).subscribe({ next: () => this.loadTeam(true), error: e => this.fail(e) });
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
