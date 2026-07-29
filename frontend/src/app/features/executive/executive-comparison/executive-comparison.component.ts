import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ExecutiveSidebarComponent } from '../executive-sidebar/executive-sidebar.component';

interface DivisionComparison {
  division_id: number;
  division_name: string;
  total_employees: number;
  present_count: number;
  late_count: number;
  absent_count: number;
  attendance_rate: number;
}

@Component({
  selector: 'app-executive-comparison',
  standalone: true,
  imports: [CommonModule, DecimalPipe, FormsModule, RouterLink, ExecutiveSidebarComponent],
  templateUrl: './executive-comparison.component.html',
  styleUrls: ['./executive-comparison.component.scss']
})
export class ExecutiveComparisonComponent implements OnInit {
  comparisons: DivisionComparison[] = [];
  filters = { start_date: '', end_date: '' };
  isExportOpen = false;
  isLoading = false;
  errorMessage = '';

  private readonly baseUrl = 'http://localhost:8080/api/v1/executive/divisions/comparison';

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit(): void {
    this.setMonthFilter();
  }

  setMonthFilter(): void {
    const now = new Date();
    this.filters.start_date = this.toDateInput(new Date(now.getFullYear(), now.getMonth(), 1));
    this.filters.end_date = this.toDateInput(now);
    this.loadComparison();
  }

  setTodayFilter(): void {
    const today = this.toDateInput(new Date());
    this.filters.start_date = today;
    this.filters.end_date = today;
    this.loadComparison();
  }

  loadComparison(): void {
    this.isLoading = true;
    this.errorMessage = '';
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    const params = `?start_date=${this.filters.start_date}&end_date=${this.filters.end_date}`;

    this.http.get<DivisionComparison[]>(`${this.baseUrl}${params}`, { headers }).subscribe({
      next: (data) => {
        this.comparisons = [...(data || [])].sort((a, b) => b.attendance_rate - a.attendance_rate);
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Gagal memuat perbandingan divisi.';
        this.isLoading = false;
      }
    });
  }

  maxRate(): number {
    return Math.max(...this.comparisons.map(item => item.attendance_rate), 1);
  }

  private toDateInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  toggleExportDropdown(): void {
    this.isExportOpen = !this.isExportOpen;
  }

  exportCSV(): void {
    const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent("Fitur CSV belum diimplementasikan untuk perbandingan divisi");
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `perbandingan-divisi.csv`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }

  exportExcel(): void {
    alert('Fitur Export Excel akan segera tersedia. Untuk sementara gunakan Export CSV.');
  }

  exportJSON(): void {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.comparisons));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", `perbandingan-divisi.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }

  exportPDF(): void {
    window.print();
  }
}
