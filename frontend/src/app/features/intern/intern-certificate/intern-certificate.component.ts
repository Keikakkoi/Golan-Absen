import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { SharedSidebarComponent } from '../../shared/shared-sidebar/shared-sidebar.component';

@Component({
  selector: 'app-intern-certificate',
  standalone: true,
  imports: [CommonModule, SharedSidebarComponent],
  templateUrl: './intern-certificate.component.html',
  styleUrls: ['./intern-certificate.component.scss']
})
export class InternCertificateComponent implements OnInit {
  certificate: any = null;
  documents: any = {};
  error = '';

  constructor(private http: HttpClient, private auth: AuthService) {}

  ngOnInit(): void {
    this.http.get<any>('http://localhost:8080/api/v1/internship/certificate', { headers: this.headers() }).subscribe({
      next: data => this.certificate = data,
      error: e => this.error = 'Gagal memuat sertifikat: ' + (e.error?.error || 'Unknown error')
    });
    this.http.get<any>('http://localhost:8080/api/v1/internship/documents', { headers: this.headers() }).subscribe({
      next: data => this.documents = data || {},
      error: e => this.error = 'Gagal memuat dokumen magang: ' + (e.error?.error || 'Unknown error')
    });
  }

  downloadDocument(type: string): void {
    this.http.get(`http://localhost:8080/api/v1/internship/documents/${type}/download`, { headers: this.headers(), observe: 'response', responseType: 'blob' }).subscribe({
      next: response => this.saveBlob(response, `${type}.pdf`),
      error: e => {
        // Existing uploads may still be available at the public storage URL
        // even if the API cannot stream them through its MinIO connection.
        const fileUrl = this.documents[type]?.file_url;
        if (fileUrl) {
          this.downloadPublicFile(fileUrl, `${type}.pdf`);
          return;
        }
        this.error = 'Gagal mengunduh dokumen: ' + (e.error?.error || 'File tidak ditemukan');
      }
    });
  }

  download(): void {
    this.error = '';
    this.http.get('http://localhost:8080/api/v1/internship/certificate/download', { headers: this.headers(), observe: 'response', responseType: 'blob' }).subscribe({
      next: (response) => {
        let ext = '.pdf';
        if (this.certificate?.file_name) {
          const match = this.certificate.file_name.match(/\.[0-9a-z]+$/i);
          if (match) ext = match[0].toLowerCase();
        }
        this.saveBlob(response, `sertifikat-magang${ext}`);
      },
      error: (e) => {
        if (this.certificate?.file_url) {
          this.downloadPublicFile(this.certificate.file_url, 'sertifikat-magang.pdf');
        } else {
          this.error = 'Gagal mengunduh file sertifikat: ' + (e.error?.error || 'File tidak ditemukan');
        }
      }
    });
  }

  private saveBlob(response: HttpResponse<Blob>, filename: string): void {
    if (!response.body) {
      this.error = 'File sertifikat kosong atau tidak ditemukan';
      return;
    }
    const url = URL.createObjectURL(response.body);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private downloadPublicFile(url: string, filename: string): void {
    this.http.get(url, { observe: 'response', responseType: 'blob' }).subscribe({
      next: response => this.saveBlob(response, filename),
      error: () => this.error = 'Gagal mengunduh file. Silakan coba lagi.'
    });
  }

  private headers(): HttpHeaders {
    return new HttpHeaders().set('Authorization', `Bearer ${this.auth.getToken()}`);
  }
}
