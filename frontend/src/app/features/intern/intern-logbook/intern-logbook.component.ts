import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { SharedSidebarComponent } from '../../shared/shared-sidebar/shared-sidebar.component';
import { ReportExportService } from '../../../core/services/report-export.service';

@Component({ selector: 'app-intern-logbook', standalone: true, imports: [CommonModule, FormsModule, DatePipe, SharedSidebarComponent], templateUrl: './intern-logbook.component.html', styleUrls: ['./intern-logbook.component.scss'] })
export class InternLogbookComponent implements OnInit {
  logbooks: any[] = []; message = ''; error = ''; saving = false;
  editingId: number | null = null; start = ''; end = ''; statusFilter = ''; isExportOpen = false;
  selectedLogbookDetail: any = null;
  deadlineInfo: any = null; deadlineError = '';
  form = { tanggal: new Date().toISOString().slice(0, 10), tugas: '', deskripsi_kegiatan: '', kendala: '', status: 'draft' };
  selectedScreenshots: File[] = []; screenshotPreviews: string[] = [];
  constructor(private http: HttpClient, private auth: AuthService, private reportExport: ReportExportService) {}
  ngOnInit(): void { this.load(); this.loadDeadline(); }
  loadDeadline(): void { this.deadlineInfo = null; this.deadlineError = ''; if (!this.form.tanggal) return; this.http.get<any>('http://localhost:8080/api/v1/work-reports/deadline', { params: new HttpParams().set('date', this.form.tanggal), headers: this.headers() }).subscribe({ next: data => this.deadlineInfo = data, error: e => this.deadlineError = e.error?.error || 'Informasi batas waktu tidak tersedia.' }); }
  load(): void { let params = new HttpParams(); if (this.start) params = params.set('start_date', this.start); if (this.end) params = params.set('end_date', this.end); if (this.statusFilter) params = params.set('status', this.statusFilter); this.http.get<any[]>('http://localhost:8080/api/v1/internship/logbooks', { params, headers: this.headers() }).subscribe({ next: data => this.logbooks = data || [], error: e => this.error = 'Gagal memuat logbook: ' + (e.error?.error || 'Unknown error') }); }
  save(targetStatus?: string): void {
    if (!this.form.tanggal || !this.form.deskripsi_kegiatan.trim()) {
      this.error = 'Tanggal dan kegiatan wajib diisi.';
      return;
    }
    if (targetStatus) {
      this.form.status = targetStatus;
    }
    this.saving = true;
    this.error = '';
    const fd = new FormData();
    Object.entries(this.form).forEach(([key, value]) => fd.append(key, value));
    fd.append('status_logbook', this.form.status);
    this.selectedScreenshots.forEach(file => fd.append('screenshots', file, file.name));
    const request = this.editingId ? this.http.put(`http://localhost:8080/api/v1/internship/logbooks/${this.editingId}`, fd, { headers: this.headers() }) : this.http.post('http://localhost:8080/api/v1/internship/logbooks', fd, { headers: this.headers() });
    request.subscribe({
      next: () => {
        this.message = this.editingId ? 'Logbook diperbarui.' : (this.form.status === 'submitted' ? 'Logbook berhasil dikirim.' : 'Logbook tersimpan sebagai draft.');
        this.saving = false;
        this.cancelEdit();
        this.load();
      },
      error: e => {
        this.error = e.error?.error || 'Gagal menyimpan logbook';
        this.saving = false;
      }
    });
  }
  onScreenshotsSelected(event: Event): void { const input = event.target as HTMLInputElement; const files = Array.from(input.files || []); if (files.length > 3 || files.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) { this.error = 'Maksimal 3 screenshot JPG/PNG/WEBP, masing-masing 5MB.'; input.value = ''; return; } this.selectedScreenshots = files; this.screenshotPreviews = files.map(file => URL.createObjectURL(file)); }
  edit(item: any): void { const status = item.status_logbook || item.StatusLogbook || 'draft'; if (status === 'approved' || status === 'submitted') return; this.editingId = item.id || item.ID; this.form = { tanggal: String(item.tanggal || item.Tanggal || '').slice(0, 10), tugas: item.tugas || item.Tugas || '', deskripsi_kegiatan: item.deskripsi_kegiatan || item.DeskripsiKegiatan || '', kendala: item.kendala || item.Kendala || '', status: status }; this.loadDeadline(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  cancelEdit(): void { this.editingId = null; this.form = { tanggal: new Date().toISOString().slice(0, 10), tugas: '', deskripsi_kegiatan: '', kendala: '', status: 'draft' }; this.screenshotPreviews.forEach(url => URL.revokeObjectURL(url)); this.selectedScreenshots = []; this.screenshotPreviews = []; this.loadDeadline(); }
  viewDetail(item: any): void { this.selectedLogbookDetail = item; }
  closeDetail(): void { this.selectedLogbookDetail = null; }
  deleteLogbook(item: any): void { const id = item.id || item.ID; const status = item.status_logbook || item.StatusLogbook; if (status === 'approved' || status === 'submitted') return; if (!confirm('Apakah Anda yakin ingin menghapus logbook ini?')) return; this.http.delete(`http://localhost:8080/api/v1/internship/logbooks/${id}`, { headers: this.headers() }).subscribe({ next: () => { this.message = 'Logbook berhasil dihapus.'; this.load(); }, error: e => { this.error = e.error?.error || 'Gagal menghapus logbook'; } }); }
  toggleExportDropdown(): void { this.isExportOpen = !this.isExportOpen; }
  exportCSV(): void { this.isExportOpen = false; this.reportExport.downloadCsv('logbook-harian.csv', ['Tanggal', 'Tugas', 'Kegiatan', 'Status'], this.logbooks.map(item => [item.tanggal || item.Tanggal, item.tugas || item.Tugas, item.deskripsi_kegiatan || item.DeskripsiKegiatan, item.status_logbook || item.StatusLogbook])); }
  exportExcel(): void { this.isExportOpen = false; this.reportExport.downloadExcel('logbook-harian.xls', ['Tanggal', 'Tugas', 'Kegiatan', 'Status'], this.logbooks.map(item => [item.tanggal || item.Tanggal, item.tugas || item.Tugas, item.deskripsi_kegiatan || item.DeskripsiKegiatan, item.status_logbook || item.StatusLogbook])); }
  exportJSON(): void { this.isExportOpen = false; this.reportExport.downloadJson('logbook-harian.json', this.logbooks); }
  exportPDF(): void { this.isExportOpen = false; this.reportExport.print(); }
  private headers(): HttpHeaders { return new HttpHeaders().set('Authorization', `Bearer ${this.auth.getToken()}`); }
}
