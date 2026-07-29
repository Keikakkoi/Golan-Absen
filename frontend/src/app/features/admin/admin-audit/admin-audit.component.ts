import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';

@Component({
  selector: 'app-admin-audit',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, AdminSidebarComponent],
  templateUrl: './admin-audit.component.html',
  styleUrls: ['./admin-audit.component.scss']
})
export class AdminAuditComponent implements OnInit {
  logs: any[] = [];
  isLoading = true;
  errorMessage = '';
  total = 0;
  page = 1;
  readonly pageSize = 25;
  isExportOpen = false;
  filters = { q: '', action: 'Semua', table_name: 'Semua', start_date: '', end_date: '' };
  readonly actions = ['Semua', 'LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE'];
  readonly tables = ['Semua', 'User', 'Employee', 'Division', 'Position', 'AttendanceRecord', 'LeaveRequest', 'NotificationSetting', 'OfficeLocation', 'WorkSchedule', 'WorkType', 'Holiday', 'LeaveQuota', 'RolePermission', 'EmployeeHomeLocation'];
  private readonly baseUrl = 'http://localhost:8080/api/v1/admin/settings/audit-logs';

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.isLoading = true;
    this.errorMessage = '';
    const token = this.authService.getToken();
    if (!token) {
      this.errorMessage = 'Sesi login tidak ditemukan.';
      this.isLoading = false;
      return;
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    let params = new HttpParams().set('page', this.page).set('limit', this.pageSize);
    Object.entries(this.filters).forEach(([key, value]) => {
      if (value) params = params.set(key, value);
    });
    this.http.get<any>(this.baseUrl, { headers, params }).subscribe({
      next: (data) => {
        this.logs = data?.data || [];
        this.total = data?.total || 0;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Gagal memuat audit log.';
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    this.page = 1;
    this.loadLogs();
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  changePage(delta: number): void {
    const next = this.page + delta;
    if (next >= 1 && next <= this.totalPages()) {
      this.page = next;
      this.loadLogs();
    }
  }

  toggleExportDropdown(): void {
    this.isExportOpen = !this.isExportOpen;
  }

  exportCSV(): void {
    const token = this.authService.getToken();
    if (!token) return;
    let params = new HttpParams();
    Object.entries(this.filters).forEach(([key, value]) => {
      if (value) params = params.set(key, value);
    });
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    this.http.get(`${this.baseUrl}/export`, { headers, params, responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'audit-log.csv';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      },
      error: () => this.errorMessage = 'Gagal mengekspor audit log.'
    });
  }

  exportExcel(): void {
    alert('Fitur Export Excel akan segera tersedia. Untuk sementara gunakan Export CSV.');
  }

  exportJSON(): void {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.logs));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", `audit-log.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }

  exportPDF(): void {
    window.print();
  }

  logout(): void {
    this.authService.logout();
  }
}
