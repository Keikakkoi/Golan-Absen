import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { ExecutiveSidebarComponent } from '../executive-sidebar/executive-sidebar.component';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-executive-reports',
  standalone: true,
  imports: [CommonModule, ExecutiveSidebarComponent, FormsModule],
  templateUrl: './executive-reports.component.html',
  styleUrls: ['./executive-reports.component.scss']
})
export class ExecutiveReportsComponent implements OnInit {
  reports: any[] = [];
  divisions: any[] = [];
  isLoading = false;
  isExporting = false;
  errorMessage = '';

  filters = {
    start_date: '',
    end_date: '',
    division_id: '',
    search: ''
  };
  isExportOpen = false;

  private baseUrl = 'http://localhost:8080/api/v1/executive/reports/employees';
  private exportUrl = 'http://localhost:8080/api/v1/executive/reports/export';
  private depsUrl = 'http://localhost:8080/api/v1/organization/divisions';

  constructor(
    private http: HttpClient, 
    private authService: AuthService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    this.filters.start_date = this.toDateInput(firstDay);
    this.filters.end_date = this.toDateInput(today);

    this.loadDivisions();

    this.route.queryParams.subscribe(params => {
      if (params['division_id']) {
        this.filters.division_id = params['division_id'];
      }
      this.loadReports();
    });
  }

  loadDivisions(): void {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    this.http.get<any[]>(this.depsUrl, { headers }).subscribe({
      next: (data) => this.divisions = data || [],
      error: (err) => console.error('Gagal memuat divisi', err)
    });
  }

  loadReports(): void {
    this.isLoading = true;
    this.errorMessage = '';
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    
    let queryParams = `?start_date=${this.filters.start_date}&end_date=${this.filters.end_date}`;
    if (this.filters.division_id) {
      queryParams += `&division_id=${this.filters.division_id}`;
    }
    if (this.filters.search) {
      queryParams += `&search=${encodeURIComponent(this.filters.search)}`;
    }

    this.http.get<any[]>(`${this.baseUrl}${queryParams}`, { headers }).subscribe({
      next: (data) => {
        this.reports = data || [];
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Gagal memuat laporan kehadiran: ' + (err.error?.error || 'Unknown error');
        this.isLoading = false;
      }
    });
  }

  toggleExportDropdown(): void {
    this.isExportOpen = !this.isExportOpen;
  }

  exportCSV(): void {
    this.isExporting = true;
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    let query = `?start_date=${this.filters.start_date}&end_date=${this.filters.end_date}`;
    if (this.filters.division_id) query += `&division_id=${this.filters.division_id}`;
    if (this.filters.search) query += `&search=${encodeURIComponent(this.filters.search)}`;

    this.http.get(`${this.exportUrl}${query}`, { headers, observe: 'response', responseType: 'blob' }).subscribe({
      next: (response) => {
        if (!response.body) {
          this.isExporting = false;
          alert('Server tidak mengembalikan berkas laporan.');
          return;
        }
        const blob = new Blob([response.body], { type: 'text/csv;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Laporan_Kehadiran_${this.filters.start_date}_to_${this.filters.end_date}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.isExporting = false;
      },
      error: (err) => {
        this.isExporting = false;
        alert(err.error?.error || 'Gagal mengekspor laporan.');
      }
    });
  }

  exportExcel(): void {
    alert('Fitur Export Excel akan segera tersedia. Untuk sementara gunakan Export CSV.');
  }

  exportJSON(): void {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.reports));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", `laporan-kehadiran.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }

  exportPDF(): void {
    window.print();
  }

  private toDateInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
