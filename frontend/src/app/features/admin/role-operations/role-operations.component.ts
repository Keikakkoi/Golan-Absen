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
  teamStats: any = { team_members: 0, hadir_hari_ini: 0, belum_absen_hari_ini: 0, izin_pending: 0, weekly: [] };
  attendanceRows: any[] = [];
  teamReports: any[] = [];
  teamStatistics: any = { members: [] };
  leaveRequests: any[] = [];
  notes: Record<number, string> = {};
  date = new Date().toISOString().slice(0, 10);
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

  constructor(private http: HttpClient, private auth: AuthService, private reportExport: ReportExportService) {}

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
  deleteLogbook(item: any): void {
    const id = item.id || item.ID;
    if (!id) return;
    if (!confirm('Apakah Anda yakin ingin menghapus logbook ini?')) return;
    this.http.delete(`${this.api}/admin/internship/logbooks/${id}`, { headers: this.headers() }).subscribe({ next: () => this.loadLogbooks(), error: e => this.fail(e) });
  }

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
    let certificateParams = new HttpParams();
    if (this.certificateStatus) certificateParams = certificateParams.set('status', this.certificateStatus);
    if (this.internSearch) certificateParams = certificateParams.set('search', this.internSearch);
    if (this.selectedCertInternId) certificateParams = certificateParams.set('user_id', this.selectedCertInternId);
    this.http.get<any[]>(`${this.api}/admin/internship/certificates`, { params: certificateParams, headers }).subscribe({ next: data => this.certificates = data || [], error: e => this.fail(e) });
  }

  loadLogbooks(): void {
    let params = new HttpParams();
    if (this.selectedLogbookStatus) params = params.set('status', this.selectedLogbookStatus);
    if (this.start) params = params.set('start_date', this.start);
    if (this.end) params = params.set('end_date', this.end);
    if (this.internSearch) params = params.set('search', this.internSearch);
    if (this.selectedInternId) params = params.set('user_id', this.selectedInternId);
    this.http.get<any[]>(`${this.api}/admin/internship/logbooks`, { params, headers: this.headers() }).subscribe({
      next: data => {
        this.logbooks = data || [];
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
      },
      error: e => { this.uploadingUserId = null; this.fail(e); }
    });
  }
  deleteCertificate(userId: number): void {
    if (!window.confirm('Hapus file sertifikat manual ini?')) return;
    this.http.delete(`${this.api}/admin/internship/certificates/${userId}/upload`, { headers: this.headers() }).subscribe({ next: () => this.loadInternship(), error: e => this.fail(e) });
  }
  documentKey(userId: number, type: string): string { return `${userId}_${type}`; }
  onDocumentFileSelected(event: Event, userId: number, type: string): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'pdf' || (file.type && file.type !== 'application/pdf')) {
        input.value = '';
        this.errorMessage = 'Format file tidak valid. Nilai Magang dan Keterangan Lulus wajib berupa PDF.';
        window.alert('Format file tidak valid. Silakan pilih file PDF untuk dokumen magang.');
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
    if (!window.confirm(`Hapus ${type === 'nilai_magang' ? 'nilai magang' : 'keterangan lulus'} ini?`)) return;
    this.http.delete(`${this.api}/admin/internship/documents/${userId}/${type}`, { headers: this.headers() }).subscribe({ next: () => this.loadInternship(), error: e => this.fail(e) });
  }
  exportRows(filename: string, headers: string[], rows: any[][]): void {
    this.reportExport.downloadCsv(filename, headers, rows);
  }
  exportLogbooks(): void { this.openExportMenu = null; this.exportRows('logbook-magang.csv', ['Tanggal', 'Peserta', 'Tugas', 'Kegiatan', 'Status', 'Catatan Review'], this.logbooks.map(row => [row.tanggal || row.Tanggal, row.Employee?.User?.Nama || '-', row.tugas || row.Tugas || '-', row.deskripsi_kegiatan || row.DeskripsiKegiatan || '-', row.status_logbook || row.StatusLogbook || '-', row.review_notes || row.ReviewNotes || '-'])); }
  exportAttendance(): void { this.openExportMenu = null; this.exportRows('absensi-tim.csv', ['Nama', 'Tanggal', 'Status', 'Masuk', 'Pulang'], this.attendanceRows.map(row => [row.nama, row.tanggal, row.status, row.jam_masuk, row.jam_pulang])); }
  exportReports(): void { this.openExportMenu = null; this.exportRows('laporan-tim.csv', ['Tanggal', 'Anggota', 'Tugas', 'Kegiatan', 'Status'], this.teamReports.map(row => [row.tanggal || row.Tanggal, row.Employee?.User?.Nama, row.tugas || row.Tugas, row.deskripsi_kegiatan || row.DeskripsiKegiatan, row.status_logbook || row.StatusLogbook || row.status_sesuai || row.StatusSesuai])); }
  exportCertificates(): void { this.openExportMenu = null; this.exportRows('sertifikat-magang.csv', ['Peserta', 'Institusi', 'Tanggal Selesai', 'Status', 'File'], this.certificates.map(row => [row.nama, row.institution_name, row.internship_end_date, row.uploaded ? 'Sudah diupload' : (!this.isInternshipEnded(row) ? 'Masa magang berlangsung' : 'Belum diupload'), row.file_name])); }
  toggleExportDropdown(menu: string): void { this.openExportMenu = this.openExportMenu === menu ? null : menu; }
  exportLogbooksExcel(): void { this.openExportMenu = null; this.reportExport.downloadExcel('logbook-magang.xls', ['Tanggal', 'Peserta', 'Tugas', 'Kegiatan', 'Status', 'Catatan Review'], this.logbooks.map(row => [row.tanggal || row.Tanggal, row.Employee?.User?.Nama || '-', row.tugas || row.Tugas || '-', row.deskripsi_kegiatan || row.DeskripsiKegiatan || '-', row.status_logbook || row.StatusLogbook || '-', row.review_notes || row.ReviewNotes || '-'])); }
  exportLogbooksJSON(): void { this.openExportMenu = null; this.reportExport.downloadJson('logbook-magang.json', this.logbooks); }
  exportLogbooksPDF(): void { this.openExportMenu = null; this.reportExport.print(); }
  exportAttendanceExcel(): void { this.openExportMenu = null; this.reportExport.downloadExcel('absensi-tim.xls', ['Nama', 'Tanggal', 'Status', 'Masuk', 'Pulang'], this.attendanceRows.map(row => [row.nama, row.tanggal, row.status, row.jam_masuk, row.jam_pulang])); }
  exportAttendanceJSON(): void { this.openExportMenu = null; this.reportExport.downloadJson('absensi-tim.json', this.attendanceRows); }
  exportAttendancePDF(): void { this.openExportMenu = null; this.reportExport.print(); }
  exportReportsExcel(): void { this.openExportMenu = null; this.reportExport.downloadExcel('laporan-tim.xls', ['Tanggal', 'Anggota', 'Tugas', 'Kegiatan', 'Status'], this.teamReports.map(row => [row.tanggal || row.Tanggal, row.Employee?.User?.Nama, row.tugas || row.Tugas, row.deskripsi_kegiatan || row.DeskripsiKegiatan, row.status_logbook || row.StatusLogbook || row.status_sesuai || row.StatusSesuai])); }
  exportReportsJSON(): void { this.openExportMenu = null; this.reportExport.downloadJson('laporan-tim.json', this.teamReports); }
  exportReportsPDF(): void { this.openExportMenu = null; this.reportExport.print(); }
  exportCertificatesExcel(): void { this.openExportMenu = null; this.reportExport.downloadExcel('sertifikat-magang.xls', ['Peserta', 'Institusi', 'Tanggal Selesai', 'Status', 'File'], this.certificates.map(row => [row.nama, row.institution_name, row.internship_end_date, row.uploaded ? 'Sudah diupload' : (!this.isInternshipEnded(row) ? 'Masa magang berlangsung' : 'Belum diupload'), row.file_name])); }
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
  private fail(error: any): void {
    const serverError = typeof error?.error === 'string' ? error.error : error?.error?.error;
    this.errorMessage = serverError || error?.message || 'Gagal memuat data operasional role.';
  }
}
