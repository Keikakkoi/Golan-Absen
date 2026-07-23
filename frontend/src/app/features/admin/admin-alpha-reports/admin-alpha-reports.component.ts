import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';

@Component({
  selector: 'app-admin-alpha-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, AdminSidebarComponent],
  templateUrl: './admin-alpha-reports.component.html',
  styleUrls: ['./admin-alpha-reports.component.scss']
})
export class AdminAlphaReportsComponent implements OnInit {
  summaries: any[] = [];
  departments: any[] = [];
  isLoading = true;
  errorMessage = '';
  expandedEmployeeId: number | null = null;

  filters = {
    start_date: '',
    end_date: '',
    department_id: ''
  };

  private baseUrl = 'http://localhost:8080/api/v1/admin/reports/alpha';

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit(): void {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    this.filters.start_date = this.toDateInput(firstDay);
    this.filters.end_date = this.toDateInput(today);

    this.loadDepartments();
    this.loadReports();
  }

  loadReports(): void {
    this.isLoading = true;
    this.errorMessage = '';
    const headers = this.getHeaders();
    let params = new HttpParams()
      .set('start_date', this.filters.start_date)
      .set('end_date', this.filters.end_date);
    if (this.filters.department_id) params = params.set('department_id', this.filters.department_id);

    this.http.get<any[]>(this.baseUrl, { headers, params }).subscribe({
      next: (data) => {
        this.summaries = data || [];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load alpha reports summary', err);
        this.errorMessage = err.error?.error || 'Gagal memuat laporan ketidakhadiran.';
        this.isLoading = false;
      }
    });
  }

  loadDepartments(): void {
    this.http.get<any[]>('http://localhost:8080/api/v1/organization/departments', { headers: this.getHeaders() }).subscribe({
      next: data => this.departments = data || [],
      error: () => this.departments = []
    });
  }

  toggleDetails(employeeId: number): void {
    this.expandedEmployeeId = this.expandedEmployeeId === employeeId ? null : employeeId;
  }

  totalOccurrences(): number { return this.summaries.reduce((sum, item) => sum + Number(item.total || 0), 0); }

  exportCsv(): void {
    let params = new HttpParams().set('start_date', this.filters.start_date).set('end_date', this.filters.end_date);
    if (this.filters.department_id) params = params.set('department_id', this.filters.department_id);
    this.http.get(`${this.baseUrl}/export`, { headers: this.getHeaders(), params, responseType: 'blob' }).subscribe({
      next: blob => this.download(blob, `laporan-alpha_${this.filters.start_date}_${this.filters.end_date}.csv`),
      error: err => this.errorMessage = err.error?.error || 'Gagal mengekspor laporan ketidakhadiran.'
    });
  }

  private download(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  private toDateInput(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }
}
