import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';

@Component({
  selector: 'app-admin-backup',
  standalone: true,
  imports: [CommonModule, AdminSidebarComponent],
  templateUrl: './admin-backup.component.html',
  styleUrls: ['./admin-backup.component.scss']
})
export class AdminBackupComponent {
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  private backupUrl = 'http://localhost:8080/api/v1/admin/backup';

  constructor(private http: HttpClient, private authService: AuthService) {}

  downloadBackup() {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    
    // We expect a blob download
    this.http.get(this.backupUrl, { headers, observe: 'response', responseType: 'blob' }).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        
        let filename = 'backup_golan_db.json';
        const contentDisposition = response.headers.get('Content-Disposition');
        if (contentDisposition) {
          const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
          if (matches != null && matches[1]) {
            filename = matches[1].replace(/['"]/g, '');
          }
        }

        const blob = new Blob([response.body], { type: response.headers.get('Content-Type') || 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        window.URL.revokeObjectURL(url);
        
        this.successMessage = 'Backup berhasil diunduh!';
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = 'Gagal melakukan backup data.';
      }
    });
  }
}
