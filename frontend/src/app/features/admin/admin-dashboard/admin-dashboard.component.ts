import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, AdminSidebarComponent, RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  stats: any = {
    total_karyawan: 0,
    hadir_hari_ini: 0,
    terlambat_hari_ini: 0,
    izin_cuti_hari_ini: 0
  };

  adminName = '';
  isLoading = true;
  lastUpdated = '';
  private refreshTimer?: ReturnType<typeof setInterval>;
  private socket?: WebSocket;
  private destroyed = false;

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.adminName = user.name;
        this.loadStats();
        this.startLiveUpdates();
      }
    });
  }

  loadStats(): void {
    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    this.http.get<any>('http://localhost:8080/api/v1/admin/reports/stats', { headers }).subscribe({
      next: (data) => {
        this.stats = data;
        this.lastUpdated = new Date().toLocaleTimeString('id-ID');
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load admin stats', err);
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.socket?.close();
  }

  private startLiveUpdates(): void {
    this.refreshTimer = setInterval(() => this.loadStats(), 30_000);
    this.connectLiveSocket();
  }

  private connectLiveSocket(): void {
    if (this.destroyed) return;
    this.socket = new WebSocket('ws://localhost:8080/ws/dashboard');
    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.event === 'new_checkin' || message.event === 'new_checkout') this.loadStats();
      } catch { /* Ignore malformed broadcast messages. */ }
    };
    this.socket.onclose = () => {
      if (!this.destroyed) setTimeout(() => this.connectLiveSocket(), 3_000);
    };
  }
}
