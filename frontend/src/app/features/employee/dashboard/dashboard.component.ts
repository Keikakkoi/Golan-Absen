import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SharedSidebarComponent } from '../../shared/shared-sidebar/shared-sidebar.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, SharedSidebarComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  userName = '';
  
  stats: any = {
    hadir_bulan_ini: 0,
    terlambat_bulan_ini: 0,
    sisa_cuti: 0,
    today_status: 'Belum Absen',
    today_check_in: '',
    today_check_out: '',
    can_check_in: false,
    can_check_out: false,
    attendance_message: ''
  };

  notifications: any[] = [];
  showNotifications = false;
  private refreshTimer?: ReturnType<typeof setInterval>;

  constructor(private authService: AuthService, private http: HttpClient) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.userName = user.name;
        this.loadStats();
        this.loadNotifications();
        this.refreshTimer = setInterval(() => this.refreshData(), 30_000);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  private refreshData(): void {
    this.loadStats();
    this.loadNotifications();
  }

  loadStats(): void {
    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    this.http.get<any>('http://localhost:8080/api/v1/dashboard/employee/stats', { headers }).subscribe({
      next: (data) => {
        this.stats = data;
      },
      error: (err) => {
        console.error('Failed to load stats', err);
      }
    });
  }

  loadNotifications(): void {
    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    this.http.get<any[]>('http://localhost:8080/api/v1/notifications', { headers }).subscribe({
      next: (data) => {
        this.notifications = data || [];
      },
      error: (err) => {
        console.error('Failed to load notifications', err);
      }
    });
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
  }

  get unreadCount(): number {
    return this.notifications.filter(n => !n.StatusBaca).length;
  }

  logout(): void {
    this.authService.logout();
  }
}
