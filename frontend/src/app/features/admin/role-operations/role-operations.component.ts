import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';
import { ReportExportService } from '../../../core/services/report-export.service';

@Component({
  selector: 'app-admin-role-operations',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, AdminSidebarComponent],
  templateUrl: './role-operations.component.html',
  styleUrls: ['./role-operations.component.scss']
})
export class RoleOperationsComponent implements OnInit {
  activeSection: 'internship' | 'team' = 'internship';
  internshipStats: any = {};
  logbooks: any[] = [];
  certificates: any[] = [];
  teamStats: any = { team_members: 0, hadir_hari_ini: 0, izin_pending: 0, weekly: [] };
  attendanceRows: any[] = [];
  teamReports: any[] = [];
  teamStatistics: any = { members: [] };
  leaveRequests: any[] = [];
  notes: Record<number, string> = {};
  date = new Date().toISOString().slice(0, 10);
  start = '';
  end = '';
  selectedLogbookStatus = 'submitted';
  internSearch = '';
  selectedInternId = '';
  certificateStatus = '';
  teamSearch = '';
  attendanceStatus = '';
  selectedCertificateFile: File | null = null;
  uploadingUserId: number | null = null;
  errorMessage = '';
  openExportMenu: string | null = null;
  private readonly api = 'http://localhost:8080/api/v1';

  constructor(private http: HttpClient, private auth: AuthService, private reportExport: ReportExportService) {}

  ngOnInit(): void { this.loadInternship(); }

  selectSection(section: 'internship' | 'team'): void {
    this.activeSection = section;
    this.errorMessage = '';
    if (section === 'internship') this.loadInternship(); else this.loadTeam();
  }

  loadInternship(): void {
    const headers = this.headers();
    this.http.get<any>(`${this.api}/admin/internship/dashboard`, { headers }).subscribe({ next: data => this.internshipStats = data, error: e => this.fail(e) });
    this.loadLogbooks();
    let certificateParams = new HttpParams(); if (this.certificateStatus) certificateParams = certificateParams.set('status', this.certificateStatus); if (this.internSearch) certificateParams = certificateParams.set('search', this.internSearch);
    this.http.get<any[]>(`${this.api}/admin/internship/certificates`, { params: certificateParams, headers }).subscribe({ next: data => this.certificates = data || [], error: e => this.fail(e) });
  }

  loadLogbooks(): void {
    let params = new HttpParams().set('status', this.selectedLogbookStatus);
    if (this.start) params = params.set('start_date', this.start);
    if (this.end) params = params.set('end_date', this.end);
    if (this.internSearch) params = params.set('search', this.internSearch);
    if (this.selectedInternId) params = params.set('user_id', this.selectedInternId);
    this.http.get<any[]>(`${this.api}/admin/internship/logbooks`, { params, headers: this.headers() }).subscribe({ next: data => this.logbooks = data || [], error: e => this.fail(e) });
  }

  reviewLogbook(id: number, status: 'approved' | 'rejected'): void {
    this.http.put(`${this.api}/admin/internship/logbooks/${id}/review`, { status, notes: this.notes[id] || '' }, { headers: this.headers() }).subscribe({ next: () => this.loadInternship(), error: e => this.fail(e) });
  }

  downloadCertificate(userId: number): void {
    this.http.get(`${this.api}/admin/internship/certificates/${userId}/download`, { headers: this.headers(), responseType: 'blob' }).subscribe(blob => {
      const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'sertifikat-magang.pdf'; link.click(); URL.revokeObjectURL(link.href);
    }, e => this.fail(e));
  }

  onCertificateFile(event: Event): void { const input = event.target as HTMLInputElement; this.selectedCertificateFile = input.files?.[0] || null; }
  uploadCertificate(userId: number): void {
    if (!this.selectedCertificateFile) { this.errorMessage = 'Pilih file PDF/JPG/PNG terlebih dahulu.'; return; }
    const form = new FormData(); form.append('file', this.selectedCertificateFile);
    this.uploadingUserId = userId;
    this.http.post(`${this.api}/admin/internship/certificates/${userId}/upload`, form, { headers: this.headers() }).subscribe({ next: () => { this.selectedCertificateFile = null; this.uploadingUserId = null; this.loadInternship(); }, error: e => { this.uploadingUserId = null; this.fail(e); } });
  }
  deleteCertificate(userId: number): void {
    if (!window.confirm('Hapus file sertifikat manual ini?')) return;
    this.http.delete(`${this.api}/admin/internship/certificates/${userId}/upload`, { headers: this.headers() }).subscribe({ next: () => this.loadInternship(), error: e => this.fail(e) });
  }
  exportRows(filename: string, headers: string[], rows: any[][]): void {
    this.reportExport.downloadCsv(filename, headers, rows);
  }
  exportLogbooks(): void { this.openExportMenu = null; this.exportRows('logbook-magang.csv', ['Tanggal', 'Peserta', 'Kegiatan', 'Status'], this.logbooks.map(row => [row.Tanggal, row.Employee?.User?.Nama, row.DeskripsiKegiatan || row.Tugas, row.StatusLogbook])); }
  exportAttendance(): void { this.openExportMenu = null; this.exportRows('absensi-tim.csv', ['Nama', 'Tanggal', 'Status', 'Masuk', 'Pulang'], this.attendanceRows.map(row => [row.nama, row.tanggal, row.status, row.jam_masuk, row.jam_pulang])); }
  exportReports(): void { this.openExportMenu = null; this.exportRows('laporan-tim.csv', ['Tanggal', 'Anggota', 'Tugas', 'Kegiatan', 'Status'], this.teamReports.map(row => [row.Tanggal, row.Employee?.User?.Nama, row.Tugas, row.DeskripsiKegiatan, row.StatusLogbook || row.StatusSesuai])); }
  exportCertificates(): void { this.openExportMenu = null; this.exportRows('sertifikat-magang.csv', ['Peserta', 'Institusi', 'Tanggal Selesai', 'Status', 'File'], this.certificates.map(row => [row.nama, row.institution_name, row.internship_end_date, row.uploaded ? 'Upload manual' : (row.available ? 'Tersedia otomatis' : 'Belum tersedia'), row.file_name])); }
  toggleExportDropdown(menu: string): void { this.openExportMenu = this.openExportMenu === menu ? null : menu; }
  exportLogbooksExcel(): void { this.openExportMenu = null; this.reportExport.downloadExcel('logbook-magang.xls', ['Tanggal', 'Peserta', 'Kegiatan', 'Status'], this.logbooks.map(row => [row.Tanggal, row.Employee?.User?.Nama, row.DeskripsiKegiatan || row.Tugas, row.StatusLogbook])); }
  exportLogbooksJSON(): void { this.openExportMenu = null; this.reportExport.downloadJson('logbook-magang.json', this.logbooks); }
  exportLogbooksPDF(): void { this.openExportMenu = null; this.reportExport.print(); }
  exportAttendanceExcel(): void { this.openExportMenu = null; this.reportExport.downloadExcel('absensi-tim.xls', ['Nama', 'Tanggal', 'Status', 'Masuk', 'Pulang'], this.attendanceRows.map(row => [row.nama, row.tanggal, row.status, row.jam_masuk, row.jam_pulang])); }
  exportAttendanceJSON(): void { this.openExportMenu = null; this.reportExport.downloadJson('absensi-tim.json', this.attendanceRows); }
  exportAttendancePDF(): void { this.openExportMenu = null; this.reportExport.print(); }
  exportReportsExcel(): void { this.openExportMenu = null; this.reportExport.downloadExcel('laporan-tim.xls', ['Tanggal', 'Anggota', 'Tugas', 'Kegiatan', 'Status'], this.teamReports.map(row => [row.Tanggal, row.Employee?.User?.Nama, row.Tugas, row.DeskripsiKegiatan, row.StatusLogbook || row.StatusSesuai])); }
  exportReportsJSON(): void { this.openExportMenu = null; this.reportExport.downloadJson('laporan-tim.json', this.teamReports); }
  exportReportsPDF(): void { this.openExportMenu = null; this.reportExport.print(); }
  exportCertificatesExcel(): void { this.openExportMenu = null; this.reportExport.downloadExcel('sertifikat-magang.xls', ['Peserta', 'Institusi', 'Tanggal Selesai', 'Status', 'File'], this.certificates.map(row => [row.nama, row.institution_name, row.internship_end_date, row.uploaded ? 'Upload manual' : (row.available ? 'Tersedia otomatis' : 'Belum tersedia'), row.file_name])); }
  exportCertificatesJSON(): void { this.openExportMenu = null; this.reportExport.downloadJson('sertifikat-magang.json', this.certificates); }
  exportCertificatesPDF(): void { this.openExportMenu = null; this.reportExport.print(); }
  exportTeamStatisticsExcel(): void { this.openExportMenu = null; this.reportExport.downloadExcel('statistik-kehadiran-tim.xls', ['Anggota', 'Hadir', 'Terlambat', 'Total'], (this.teamStatistics.members || []).map((row: any) => [row.Name, row.Hadir, row.Terlambat, row.Total])); }
  exportTeamStatisticsJSON(): void { this.openExportMenu = null; this.reportExport.downloadJson('statistik-kehadiran-tim.json', this.teamStatistics); }
  exportTeamStatisticsPDF(): void { this.openExportMenu = null; this.reportExport.print(); }
  printCurrent(): void { window.print(); }

  loadTeam(): void {
    const headers = this.headers();
    this.http.get<any>(`${this.api}/manager/dashboard`, { headers }).subscribe({ next: data => this.teamStats = data, error: e => this.fail(e) });
    this.loadAttendance(); this.loadReports(); this.loadStatistics();
    this.http.get<any[]>(`${this.api}/manager/leaves`, { headers }).subscribe({ next: data => this.leaveRequests = data || [], error: e => this.fail(e) });
  }

  loadAttendance(): void {
    let params = new HttpParams().set('date', this.date); if (this.teamSearch) params = params.set('search', this.teamSearch); if (this.attendanceStatus) params = params.set('status', this.attendanceStatus);
    this.http.get<any[]>(`${this.api}/manager/team/attendance`, { params, headers: this.headers() }).subscribe({ next: data => this.attendanceRows = data || [], error: e => this.fail(e) });
  }

  loadReports(): void {
    let params = new HttpParams(); if (this.start) params = params.set('start_date', this.start); if (this.end) params = params.set('end_date', this.end);
    if (this.teamSearch) params = params.set('search', this.teamSearch);
    this.http.get<any[]>(`${this.api}/manager/team/reports`, { params, headers: this.headers() }).subscribe({ next: data => this.teamReports = data || [], error: e => this.fail(e) });
  }

  loadStatistics(): void {
    let params = new HttpParams(); if (this.start) params = params.set('start_date', this.start); if (this.end) params = params.set('end_date', this.end);
    this.http.get<any>(`${this.api}/manager/team/statistics`, { params, headers: this.headers() }).subscribe({ next: data => this.teamStatistics = data, error: e => this.fail(e) });
  }

  exportTeamStatistics(): void {
    let params = new HttpParams().set('format', 'csv'); if (this.start) params = params.set('start_date', this.start); if (this.end) params = params.set('end_date', this.end);
    this.http.get(`${this.api}/manager/team/statistics`, { params, headers: this.headers(), responseType: 'blob' }).subscribe(blob => { const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'statistik-kehadiran-tim.csv'; link.click(); });
  }

  decideLeave(id: number, status: 'Approved' | 'Rejected'): void {
    this.http.put(`${this.api}/manager/leaves/${id}/approve`, { status, notes: this.notes[id] || '' }, { headers: this.headers() }).subscribe({ next: () => this.loadTeam(), error: e => this.fail(e) });
  }

  private headers(): HttpHeaders { return new HttpHeaders().set('Authorization', `Bearer ${this.auth.getToken()}`); }
  private fail(error: any): void { this.errorMessage = error.error?.error || 'Gagal memuat data operasional role.'; }
}
