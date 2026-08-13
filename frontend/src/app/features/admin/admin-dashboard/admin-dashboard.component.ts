import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';
import { RouterLink } from '@angular/router';
import { AppNotification, NotificationService } from '../../../core/services/notification.service';
import { DashboardChartsComponent } from '../../shared/dashboard-charts/dashboard-charts.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, AdminSidebarComponent, RouterLink, DashboardChartsComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  stats: any = {
    total_karyawan: 0,
    hadir_hari_ini: 0,
    belum_absen_hari_ini: 0,
    izin_cuti_hari_ini: 0,
    total_magang: 0,
    magang_aktif: 0,
    logbook_pending: 0,
    sertifikat_terbit: 0
  };

  adminName = '';
  isLoading = true;
  skeletonItems = [1, 2, 3, 4, 5, 6];
  lastUpdated = '';
  private refreshTimer?: ReturnType<typeof setInterval>;
  notifications: AppNotification[] = [];
  showNotifications = false;
  private disconnectRealtime?: () => void;
  private userSubscription?: Subscription;
  private initialized = false;

  constructor(private http: HttpClient, private authService: AuthService, private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      // This component can only be used by HRD. Without this guard, a stale
      // component instance can repeatedly call the HRD-only endpoint and get
      // 403 responses for employee/intern/manager sessions.
      if (user?.role !== 'HRD' || this.initialized) return;
      this.initialized = true;
      if (user) {
        this.adminName = user.name;
        this.loadStats();
        this.loadNotifications();
        this.notificationService.enablePush(false).catch(() => undefined);
        this.disconnectRealtime = this.notificationService.connectRealtime(() => { this.loadStats(); this.loadNotifications(); });
        this.startLiveUpdates();
      }
    });
  }

  loadStats(): void {
    if (this.authService.getRole() !== 'HRD') return;
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
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.disconnectRealtime?.();
    this.userSubscription?.unsubscribe();
    this.initialized = false;
  }

  loadNotifications(): void {
    this.notificationService.getAll().subscribe({
      next: data => this.notifications = data || [],
      error: err => console.error('Failed to load notifications', err)
    });
  }

  toggleNotifications(): void { this.showNotifications = !this.showNotifications; }

  markAsRead(notification: AppNotification): void {
    if (notification.StatusBaca) return;
    this.notificationService.markAsRead(notification.ID).subscribe({
      next: () => notification.StatusBaca = true,
      error: err => console.error('Failed to mark notification as read', err)
    });
  }

  get unreadCount(): number { return this.notifications.filter(item => !item.StatusBaca).length; }

  private startLiveUpdates(): void {
    this.refreshTimer = setInterval(() => this.loadStats(), 30_000);
  }
}
