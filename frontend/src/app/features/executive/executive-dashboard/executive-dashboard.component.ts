import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { ExecutiveSidebarComponent } from '../executive-sidebar/executive-sidebar.component';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-executive-dashboard',
  standalone: true,
  imports: [CommonModule, DecimalPipe, ExecutiveSidebarComponent, RouterLink],
  templateUrl: './executive-dashboard.component.html',
  styleUrls: ['./executive-dashboard.component.scss']
})
export class ExecutiveDashboardComponent implements OnInit, OnDestroy {
  kpi: any = {
    total_employees: 0,
    present_today: 0,
    late_today: 0,
    absent_today: 0,
    attendance_rate: 0
  };
  deptStats: any[] = [];
  isLoading = true;
  errorMessage = '';
  lastUpdated = '';
  private refreshTimer?: ReturnType<typeof setInterval>;
  private socket?: WebSocket;
  private destroyed = false;
  private baseUrl = 'http://localhost:8080/api/v1/executive/dashboard';
  private deptStatsUrl = 'http://localhost:8080/api/v1/executive/departments/stats';

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit(): void {
    this.loadDashboard();
    this.loadDeptStats();
    this.refreshTimer = setInterval(() => this.refreshDashboard(), 30_000);
    this.connectLiveUpdates();
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    this.destroyed = true;
    this.socket?.close();
  }

  refreshDashboard(): void {
    this.loadDashboard();
    this.loadDeptStats();
  }

  private connectLiveUpdates(): void {
    if (this.destroyed) return;
    this.socket = new WebSocket('ws://localhost:8080/ws/dashboard');
    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.event === 'new_checkin' || message.event === 'new_checkout') this.refreshDashboard();
      } catch { /* Ignore malformed broadcast messages. */ }
    };
    this.socket.onclose = () => {
      if (!this.destroyed) setTimeout(() => this.connectLiveUpdates(), 3_000);
    };
  }

  loadDashboard(): void {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    this.http.get<any>(this.baseUrl, { headers }).subscribe({
      next: (data) => {
        if (data && data.kpi) {
          this.kpi = data.kpi;
        }
        this.lastUpdated = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Gagal memuat data dashboard: ' + (err.error?.error || 'Unknown error');
        this.isLoading = false;
      }
    });
  }

  loadDeptStats(): void {
    const today = this.toDateInput(new Date());
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    this.http.get<any[]>(`${this.deptStatsUrl}?start_date=${today}&end_date=${today}`, { headers }).subscribe({
      next: (data) => {
        this.deptStats = data || [];
      },
      error: (err) => {
        console.error('Failed to load dept stats', err);
      }
    });
  }

  private toDateInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
