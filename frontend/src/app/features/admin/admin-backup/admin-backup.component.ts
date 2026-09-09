import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';
import { FilePreviewComponent } from '../../../shared/file-preview/file-preview.component';

interface BackupHistory { name: string; type: string; modules: number; size: string; createdBy: string; createdAt: string; status: string; }
interface BackupPreview { version?: string; type?: string; modules: string[]; tables: string[]; counts: Record<string, number>; files: number; includeFiles: boolean; createdAt?: string; }

@Component({ selector: 'app-admin-backup', standalone: true, imports: [CommonModule, FormsModule, AdminSidebarComponent, FilePreviewComponent], templateUrl: './admin-backup.component.html', styleUrls: ['./admin-backup.component.scss'] })
export class AdminBackupComponent {
  isLoading = false; isValidating = false; errorMessage = ''; successMessage = '';
  backupName = `backup-lengkap-${new Date().toISOString().slice(0, 10)}`;
  backupType: 'full' | 'selected' = 'full'; search = ''; selectedFile: File | null = null;
  backupFormat: 'json' | 'zip' = 'json';
  validationMessage = ''; validationState: 'empty' | 'valid' | 'invalid' = 'empty';
  restoreMode: 'add' | 'overwrite' | 'full' = 'add'; restoreLoading = false; restoreMessage = '';
  restoreResult: { restored?: Record<string, number>; added?: number; updated?: number; skipped?: number; failed?: number; errors?: string[]; file_errors?: string[] } | null = null;
  showRestoreFailures = false;
  preview: any = null;
  history: BackupHistory[] = this.readHistory();
  readonly modules = ['Karyawan', 'Organisasi & jabatan', 'Project', 'Presensi', 'Pengajuan izin/cuti', 'Lokasi WFH', 'Jadwal & shift', 'Work Report/Logbook', 'Agenda & Hari Libur', 'Sertifikat & Dokumen Magang', 'Pengaturan Aplikasi', 'Notifikasi & Perangkat', 'Audit & Sistem'];
  selectedModules = new Set<string>();
  private readonly moduleKeys: Record<string, string> = {
    'Karyawan': 'karyawan', 'Organisasi & jabatan': 'organisasi_jabatan', 'Project': 'project', 'Presensi': 'presensi', 'Pengajuan izin/cuti': 'pengajuan_izin_cuti', 'Lokasi WFH': 'lokasi_wfh', 'Jadwal & shift': 'jadwal_shift', 'Work Report/Logbook': 'work_report', 'Agenda & Hari Libur': 'agenda_event', 'Sertifikat & Dokumen Magang': 'sertifikat_dokumen_magang', 'Pengaturan Aplikasi': 'pengaturan_aplikasi', 'Notifikasi & Perangkat': 'notifikasi_perangkat', 'Audit & Sistem': 'audit_sistem'
  };
  private backupUrl = 'http://localhost:8080/api/v1/admin/settings/backup';
  constructor(private http: HttpClient, private authService: AuthService, private alert: AlertService) {}
  get lastBackup(): BackupHistory | undefined { return this.history[0]; }
  get previewTables(): string[] { return this.preview?.tables || []; }
  get previewCounts(): Record<string, number> { return this.preview?.counts || {}; }
  get filteredHistory(): BackupHistory[] { return this.history.filter(item => item.name.toLowerCase().includes(this.search.toLowerCase())); }
  get restoreFailureCount(): number { return Math.max(this.restoreResult?.failed || 0, this.restoreResult?.file_errors?.length || 0, this.restoreResult?.errors?.length || 0); }
  get restoreErrors(): string[] { const fileErrors = this.restoreResult?.file_errors || []; return fileErrors.length ? fileErrors : (this.restoreResult?.errors || []); }
  get restoreTableCount(): number { return Object.keys(this.restoreResult?.restored || {}).length; }
  setBackupType(type: 'full' | 'selected'): void {
    this.backupType = type;
    this.backupName = type === 'full' ? `backup-lengkap-${new Date().toISOString().slice(0, 10)}` : `backup-${new Date().toISOString().slice(0, 10)}`;
  }
  toggleModule(module: string): void { this.selectedModules.has(module) ? this.selectedModules.delete(module) : this.selectedModules.add(module); }
  isSelected(module: string): boolean { return this.selectedModules.has(module); }
  async downloadBackup(): Promise<void> {
    if (this.isLoading) return;
    if (!await this.alert.confirm('Buat backup sekarang?', 'Backup akan membuat salinan data sistem saat ini. Lanjutkan?', 'Ya, buat backup')) return;
    if (this.backupType === 'selected' && this.selectedModules.size === 0) { this.errorMessage = 'Pilih minimal satu modul untuk membuat backup tertentu.'; return; }
    this.isLoading = true; this.errorMessage = ''; this.successMessage = '';
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    const keys = this.backupType === 'selected' ? [...new Set([...this.selectedModules].map(module => this.moduleKeys[module]).filter(Boolean))].join(',') : '';
    const query = `name=${encodeURIComponent(this.safeName())}&format=${this.backupFormat}${keys ? `&modules=${encodeURIComponent(keys)}` : ''}`;
    this.http.get(`${this.backupUrl}?${query}`, { headers, observe: 'response', responseType: 'blob' }).subscribe({ next: response => {
      const filename = this.getFilename(response.headers.get('Content-Disposition')) || `${this.safeName()}.${this.backupFormat}`, blob = new Blob([response.body!], { type: this.backupFormat === 'zip' ? 'application/zip' : 'application/json' });
      const url = window.URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = filename; link.style.display = 'none'; document.body.appendChild(link); link.click();
      // Keep the object URL alive until the browser has started the download.
      window.setTimeout(() => { window.URL.revokeObjectURL(url); link.remove(); }, 1500);
      const item: BackupHistory = { name: filename, type: this.backupType === 'full' ? 'Lengkap' : 'Terpilih', modules: this.backupType === 'full' ? this.modules.length : this.selectedModules.size, size: this.formatBytes(blob.size), createdBy: localStorage.getItem('name') || 'Admin', createdAt: new Date().toISOString(), status: 'Berhasil' };
      this.history = [item, ...this.history].slice(0, 20); localStorage.setItem('golan-backup-history', JSON.stringify(this.history)); this.successMessage = 'Backup berhasil dibuat dan telah diunduh.'; this.isLoading = false;
    }, error: err => { this.isLoading = false; this.errorMessage = err.status === 403 ? 'Anda tidak memiliki izin untuk membuat backup.' : 'Backup gagal dibuat. Silakan coba lagi.'; } });
  }
  onFileSelected(event: Event): void { const input = event.target as HTMLInputElement; if (input.files?.[0]) this.validateFile(input.files[0]); }
  onBackupFilesChange(files: File[]): void { if (files[0]) this.validateFile(files[0]); else { this.selectedFile = null; this.validationState = 'empty'; this.preview = null; } }
  onDrop(event: DragEvent): void { event.preventDefault(); const file = event.dataTransfer?.files?.[0]; if (file) this.validateFile(file); }
  validateFile(file: File): void {
    this.selectedFile = file; this.preview = null; this.validationState = 'empty'; this.isValidating = true; this.validationMessage = 'Memvalidasi file backup…';
    if (!/\.(json|zip)$/i.test(file.name)) return this.invalidFile('Format file tidak didukung. Gunakan file JSON atau ZIP.');
    if (file.size > 20 * 1024 * 1024) return this.invalidFile('Ukuran file melebihi batas maksimum 20 MB.');
    if (/\.zip$/i.test(file.name)) { this.preview = { version: '2.0', type: 'ZIP', modules: [], tables: [], counts: {}, files: 0, includeFiles: true }; this.validationState = 'valid'; this.validationMessage = 'Arsip ZIP valid secara ukuran. Detail JSON akan diperiksa server saat restore.'; this.isValidating = false; return; }
    const reader = new FileReader(); reader.onload = () => { try { const data = JSON.parse(String(reader.result)), meta = data.backup_meta || data.metadata; if (!meta || !data.data || typeof data.data !== 'object') return this.invalidFile('Struktur file backup tidak valid.'); const tables = Object.keys(data.data); const counts = Object.fromEntries(tables.map(table => [table, Array.isArray(data.data[table]) ? data.data[table].length : 0])); this.preview = { version: meta.backup_format_version || meta.version, type: meta.backup_type || 'full', createdAt: meta.created_at || meta.timestamp, modules: meta.modules || [], tables, counts, files: Array.isArray(data.files) ? data.files.length : 0, includeFiles: meta.include_files === true }; this.validationState = 'valid'; this.validationMessage = this.preview.includeFiles ? 'File backup valid dan siap ditinjau.' : 'Backup valid, tetapi hanya berisi metadata file. Gunakan ZIP untuk membackup file fisik.'; this.isValidating = false; } catch { this.invalidFile('File backup rusak atau bukan JSON yang valid.'); } }; reader.onerror = () => this.invalidFile('File tidak dapat dibaca.'); reader.readAsText(file);
  }
  async restoreBackup(): Promise<void> {
    if (!this.selectedFile || this.validationState !== 'valid' || this.restoreLoading) return;
    const confirmed = await this.alert.confirm(
      'Restore backup?',
      this.restoreMode === 'full' ? 'Restore penuh dapat mengubah data sistem. Proses akan dibatalkan seluruhnya jika terjadi kesalahan.' : 'Data dari file backup akan dipulihkan ke sistem. Lanjutkan?',
      'Ya, restore'
    );
    if (!confirmed) return;
    const confirmation = this.restoreMode === 'full'
      ? await this.alert.input('Konfirmasi restore penuh', 'Ketik RESTORE DATA untuk mengonfirmasi restore penuh:', 'Oke', 'RESTORE DATA')
      : '';
    if (this.restoreMode === 'full' && confirmation !== 'RESTORE DATA') { await this.alert.info('Restore dibatalkan', 'Konfirmasi RESTORE DATA tidak sesuai.'); return; }
    const form = new FormData(); form.append('file', this.selectedFile); form.append('mode', this.restoreMode); if (confirmation) form.append('confirmation', confirmation);
    this.restoreLoading = true; this.restoreMessage = ''; this.restoreResult = null; this.showRestoreFailures = false;
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    this.http.post<{ message: string; restored: Record<string, number>; rollback?: boolean }>(`${this.backupUrl}/restore`, form, { headers }).subscribe({
      next: async response => { this.restoreLoading = false; this.restoreResult = response as any; this.restoreMessage = response.message || 'Restore berhasil.'; await this.alert.success('Restore berhasil', this.restoreMessage); },
      error: async err => { this.restoreLoading = false; this.restoreMessage = ''; await this.alert.error('Restore gagal', err.error?.error || 'Tidak ada perubahan data yang diterapkan.'); }
    });
  }
  toggleRestoreFailures(): void { this.showRestoreFailures = !this.showRestoreFailures; }
  private invalidFile(message: string): void { this.validationState = 'invalid'; this.validationMessage = message; this.isValidating = false; }
  private safeName(): string { return (this.backupName.trim() || 'backup-absensi-golan').replace(/[^a-zA-Z0-9_-]/g, '-'); }
  private getFilename(header: string | null): string | null { const match = header?.match(/filename[^;=]*=(?:"([^"]+)"|([^;]+))/i); return match ? (match[1] || match[2]).trim() : null; }
  private formatBytes(bytes: number): string { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`; }
  private readHistory(): BackupHistory[] { try { return JSON.parse(localStorage.getItem('golan-backup-history') || '[]'); } catch { return []; } }
}
