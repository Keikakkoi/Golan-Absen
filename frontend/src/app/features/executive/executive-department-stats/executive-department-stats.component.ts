import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { ExecutiveSidebarComponent } from '../executive-sidebar/executive-sidebar.component';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-executive-department-stats',
  standalone: true,
  imports: [CommonModule, DecimalPipe, ExecutiveSidebarComponent, FormsModule, RouterLink],
  templateUrl: './executive-department-stats.component.html',
  styleUrls: ['./executive-department-stats.component.scss']
})
export class ExecutiveDepartmentStatsComponent implements OnInit {
  stats: any[] = [];
  isLoading = true;
  errorMessage = '';

  filters = {
    start_date: '',
    end_date: ''
  };

  isExportOpen = false;

  private baseUrl = 'http://localhost:8080/api/v1/executive/departments/stats';

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit(): void {
    this.setMonthFilter();
  }

  setMonthFilter(): void {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    this.filters.start_date = this.toDateInput(firstDay);
    this.filters.end_date = this.toDateInput(today);
    this.loadStats();
  }

  setTodayFilter(): void {
    const todayStr = this.toDateInput(new Date());
    this.filters.start_date = todayStr;
    this.filters.end_date = todayStr;
    this.loadStats();
  }

  loadStats(): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    const queryParams = `?start_date=${this.filters.start_date}&end_date=${this.filters.end_date}`;

    this.http.get<any[]>(`${this.baseUrl}${queryParams}`, { headers }).subscribe({
      next: (data) => {
        this.stats = data || [];
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Gagal memuat statistik departemen: ' + (err.error?.error || 'Unknown error');
        this.isLoading = false;
      }
    });
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
    const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent("Fitur CSV belum diimplementasikan untuk statistik divisi");
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `statistik-divisi.csv`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }

  exportExcel(): void {
    alert('Fitur Export Excel akan segera tersedia. Untuk sementara gunakan Export CSV.');
  }

  exportJSON(): void {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.stats));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", `statistik-divisi.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }

  exportPDF(): void {
    window.print();
  }
}
