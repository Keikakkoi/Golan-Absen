import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';

@Component({
  selector: 'app-admin-alpha-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, AdminSidebarComponent, PaginationComponent],
  templateUrl: './admin-alpha-reports.component.html',
  styleUrls: ['./admin-alpha-reports.component.scss']
})
export class AdminAlphaReportsComponent implements OnInit {
  @ViewChild('paginationBar') paginationBar?: ElementRef<HTMLElement>;

  summaries: any[] = [];
  departments: any[] = [];
  projects: any[] = [];
  isLoading = true;
  errorMessage = '';
  expandedEmployeeId: number | null = null;
  pageSizeOptions = [10, 25, 50, 100];
  pageSize = 25;
  currentPage = 1;

  filters = {
    department_id: '',
    project_id: '',
    name: '',
    sort_order: 'name_asc'
  };

  isExportOpen = false;

  private baseUrl = 'http://localhost:8080/api/v1/admin/reports/alpha';

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit(): void {
    this.loadDepartments();
    this.loadReports();
  }

  loadReports(): void {
    this.currentPage = 1;
    this.isLoading = true;
    this.errorMessage = '';
    const headers = this.getHeaders();
    let params = new HttpParams();
    if (this.filters.department_id) params = params.set('division_id', this.filters.department_id);
    if (this.filters.project_id) params = params.set('project_id', this.filters.project_id);
    if (this.filters.name) params = params.set('name', this.filters.name);

    this.http.get<any[]>(this.baseUrl, { headers, params }).subscribe({
      next: (data) => {
        this.summaries = data || [];
        this.applySorting();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load alpha reports summary', err);
        this.errorMessage = 'Gagal memuat data karyawan: ' + (err.error?.error || 'Gagal memuat data.');
        this.isLoading = false;
      }
    });
  }

  applySorting(): void {
    if (!this.summaries) return;

    this.currentPage = 1;
    
    if (this.filters.sort_order === 'name_asc') {
      this.summaries.sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
    } else if (this.filters.sort_order === 'name_desc') {
      this.summaries.sort((a, b) => (b.nama || '').localeCompare(a.nama || ''));
    } else if (this.filters.sort_order === 'count_desc') {
      this.summaries.sort((a, b) => (b.total || 0) - (a.total || 0));
    } else if (this.filters.sort_order === 'count_asc') {
      this.summaries.sort((a, b) => (a.total || 0) - (b.total || 0));
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.ensureValidPage();
  }

  goToPage(page: number | string): void {
    if (typeof page !== 'number') return;

    const target = Math.min(Math.max(page, 1), this.totalPages());
    if (target === this.currentPage) return;

    this.blurActiveControl();
    this.currentPage = target;
    this.keepPaginationVisible();
  }

  get paginationStartIndex(): number {
    return this.summaries.length === 0 ? 0 : (this.currentPage - 1) * this.pageSize;
  }

  get paginationEndIndex(): number {
    return Math.min(this.paginationStartIndex + this.pageSize, this.summaries.length);
  }

  get displayedSummaries(): any[] {
    return this.summaries.slice(this.paginationStartIndex, this.paginationEndIndex);
  }

  private totalPages(): number {
    return Math.max(1, Math.ceil(this.summaries.length / this.pageSize));
  }

  private ensureValidPage(): void {
    if (this.currentPage > this.totalPages()) {
      this.currentPage = this.totalPages();
    }
  }

  private blurActiveControl(): void {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
  }

  private keepPaginationVisible(): void {
    if (typeof window === 'undefined') return;

    const scrollToPagination = () => {
      this.paginationBar?.nativeElement.scrollIntoView({
        behavior: 'auto',
        block: 'center',
        inline: 'nearest'
      });
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToPagination);
    });
    window.setTimeout(scrollToPagination, 80);
  }

  loadDepartments(): void {
    this.http.get<any[]>('http://localhost:8080/api/v1/organization/divisions', { headers: this.getHeaders() }).subscribe({
      next: data => this.departments = data || [],
      error: () => this.departments = []
    });
    this.http.get<any[]>('http://localhost:8080/api/v1/organization/projects', { headers: this.getHeaders() }).subscribe({
      next: data => this.projects = data || [],
      error: () => this.projects = []
    });
  }

  toggleDetails(employeeId: number): void {
    this.expandedEmployeeId = this.expandedEmployeeId === employeeId ? null : employeeId;
  }

  totalOccurrences(): number { return this.summaries.reduce((sum, item) => sum + Number(item.total || 0), 0); }

  toggleExportDropdown(): void {
    this.isExportOpen = !this.isExportOpen;
  }

  exportCSV(): void {
    let params = new HttpParams();
    if (this.filters.department_id) params = params.set('division_id', this.filters.department_id);
    if (this.filters.project_id) params = params.set('project_id', this.filters.project_id);
    if (this.filters.name) params = params.set('name', this.filters.name);
    this.http.get(`${this.baseUrl}/export`, { headers: this.getHeaders(), params, responseType: 'blob' }).subscribe({
      next: blob => this.download(blob, 'laporan-alpha.csv'),
      error: err => this.errorMessage = err.error?.error || 'Gagal mengekspor laporan ketidakhadiran.'
    });
  }

  exportExcel(): void {
    alert('Fitur Export Excel akan segera tersedia. Untuk sementara gunakan Export CSV.');
  }

  exportJSON(): void {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.summaries));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", `laporan-alpha.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }

  exportPDF(): void {
    window.print();
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

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }
}
