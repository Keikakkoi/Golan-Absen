import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';

interface BackupHistory { name: string; type: string; modules: number; size: string; createdBy: string; createdAt: string; status: string; }

@Component({ selector: 'app-admin-backup', standalone: true, imports: [CommonModule, FormsModule, AdminSidebarComponent], templateUrl: './admin-backup.component.html', styleUrls: ['./admin-backup.component.scss'] })
export class AdminBackupComponent {
  isLoading = false; isValidating = false; errorMessage = ''; successMessage = '';
  backupName = `backup-absensi-golan-${new Date().toISOString().slice(0, 10)}`;
  backupType: 'full' | 'selected' = 'full'; search = ''; selectedFile: File | null = null;
  backupFormat: 'json' | 'zip' = 'json';
  validationMessage = ''; validationState: 'empty' | 'valid' | 'invalid' = 'empty';
  restoreMode: 'add' | 'overwrite' | 'full' = 'add'; restoreLoading = false; restoreMessage = '';
  preview: { version?: string; type?: string; modules: string[]; createdAt?: string } | null = null;
  history: BackupHistory[] = this.readHistory();
  readonly modules = ['Karyawan', 'Pengguna & role', 'Organisasi & jabatan', 'Project', 'Presensi', 'Pengajuan izin/cuti', 'Jadwal & shift', 'Agenda event', 'Sertifikat & dokumen magang', 'Pengaturan aplikasi', 'Audit log'];
  selectedModules = new Set(this.modules);
  private backupUrl = 'http://localhost:8080/api/v1/admin/settings/backup';
  constructor(private http: HttpClient, private authService: AuthService, private alert: AlertService) {}
  get lastBackup(): BackupHistory | undefined { return this.history[0]; }
  get filteredHistory(): BackupHistory[] { return this.history.filter(item => item.name.toLowerCase().includes(this.search.toLowerCase())); }
  toggleModule(module: string): void { this.selectedModules.has(module) ? this.selectedModules.delete(module) : this.selectedModules.add(module); }
  isSelected(module: string): boolean { return this.selectedModules.has(module); }
  async downloadBackup(): Promise<void> {
    if (this.isLoading) return;
    if (!await this.alert.confirm('Buat backup sekarang?', 'Backup akan membuat salinan data sistem saat ini. Lanjutkan?', 'Ya, buat backup')) return;
    if (this.backupType === 'selected') { this.errorMessage = 'Backup berdasarkan modul tertentu belum didukung oleh endpoint server saat ini. Pilih Backup lengkap.'; return; }
    this.isLoading = true; this.errorMessage = ''; this.successMessage = '';
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    this.http.get(`${this.backupUrl}?name=${encodeURIComponent(this.safeName())}&format=${this.backupFormat}`, { headers, observe: 'response', responseType: 'blob' }).subscribe({ next: response => {
      const filename = this.getFilename(response.headers.get('Content-Disposition')) || `${this.safeName()}.${this.backupFormat}`, blob = new Blob([response.body!], { type: this.backupFormat === 'zip' ? 'application/zip' : 'application/json' });
      const url = window.URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = filename; link.style.display = 'none'; document.body.appendChild(link); link.click();
      // Keep the object URL alive until the browser has started the download.
      window.setTimeout(() => { window.URL.revokeObjectURL(url); link.remove(); }, 1500);
      const item: BackupHistory = { name: filename, type: this.backupType === 'full' ? 'Lengkap' : 'Terpilih', modules: this.selectedModules.size, size: this.formatBytes(blob.size), createdBy: localStorage.getItem('name') || 'Admin', createdAt: new Date().toISOString(), status: 'Berhasil' };
      this.history = [item, ...this.history].slice(0, 20); localStorage.setItem('golan-backup-history', JSON.stringify(this.history)); this.successMessage = 'Backup berhasil dibuat dan telah diunduh.'; this.isLoading = false;
    }, error: err => { this.isLoading = false; this.errorMessage = err.status === 403 ? 'Anda tidak memiliki izin untuk membuat backup.' : 'Backup gagal dibuat. Silakan coba lagi.'; } });
  }
  onFileSelected(event: Event): void { const input = event.target as HTMLInputElement; if (input.files?.[0]) this.validateFile(input.files[0]); }
  onDrop(event: DragEvent): void { event.preventDefault(); const file = event.dataTransfer?.files?.[0]; if (file) this.validateFile(file); }
  validateFile(file: File): void {
    this.selectedFile = file; this.preview = null; this.validationState = 'empty'; this.isValidating = true; this.validationMessage = 'Memvalidasi file backup…';
    if (!/\.json$/i.test(file.name)) return this.invalidFile('Format file tidak didukung. Gunakan file JSON.');
    if (file.size > 20 * 1024 * 1024) return this.invalidFile('Ukuran file melebihi batas maksimum 20 MB.');
    const reader = new FileReader(); reader.onload = () => { try { const data = JSON.parse(String(reader.result)), meta = data.backup_meta || data.metadata; if (!meta || !data.data || typeof data.data !== 'object') return this.invalidFile('Struktur file backup tidak valid.'); this.preview = { version: meta.backup_format_version || meta.version, type: meta.backup_type || 'full', createdAt: meta.created_at || meta.timestamp, modules: Object.keys(data.data) }; this.validationState = 'valid'; this.validationMessage = 'File backup valid dan siap ditinjau.'; this.isValidating = false; } catch { this.invalidFile('File backup rusak atau bukan JSON yang valid.'); } }; reader.onerror = () => this.invalidFile('File tidak dapat dibaca.'); reader.readAsText(file);
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
    this.restoreLoading = true; this.restoreMessage = '';
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    this.http.post<{ message: string; restored: Record<string, number>; rollback?: boolean }>(`${this.backupUrl}/restore`, form, { headers }).subscribe({
      next: async response => { this.restoreLoading = false; this.restoreMessage = ''; await this.alert.success('Restore berhasil', 'Data backup berhasil dipulihkan ke sistem.'); },
      error: async err => { this.restoreLoading = false; this.restoreMessage = ''; await this.alert.error('Restore gagal', err.error?.error || 'Tidak ada perubahan data yang diterapkan.'); }
    });
  }
  private invalidFile(message: string): void { this.validationState = 'invalid'; this.validationMessage = message; this.isValidating = false; }
  private safeName(): string { return (this.backupName.trim() || 'backup-absensi-golan').replace(/[^a-zA-Z0-9_-]/g, '-'); }
  private getFilename(header: string | null): string | null { const match = header?.match(/filename[^;=]*=(?:"([^"]+)"|([^;]+))/i); return match ? (match[1] || match[2]).trim() : null; }
  private formatBytes(bytes: number): string { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`; }
  private readHistory(): BackupHistory[] { try { return JSON.parse(localStorage.getItem('golan-backup-history') || '[]'); } catch { return []; } }
}
