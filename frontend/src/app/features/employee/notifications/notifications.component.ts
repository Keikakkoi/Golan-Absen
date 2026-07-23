import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { SharedSidebarComponent } from '../../shared/shared-sidebar/shared-sidebar.component';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, DatePipe, SharedSidebarComponent],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent implements OnInit, OnDestroy {
  notifications: any[] = [];
  isLoading = true;
  filterMode: 'all' | 'unread' = 'all';
  private refreshTimer?: ReturnType<typeof setInterval>;

  private baseUrl = 'http://localhost:8080/api/v1/notifications';

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit(): void {
    this.fetchNotifications();
    this.refreshTimer = setInterval(() => this.fetchNotifications(), 15_000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  fetchNotifications(): void {
    this.isLoading = true;
    const headers = this.getHeaders();
    this.http.get<any[]>(this.baseUrl, { headers }).subscribe({
      next: (data) => {
        this.notifications = data || [];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load notifications', err);
        this.isLoading = false;
      }
    });
  }

  get filteredNotifications(): any[] {
    if (this.filterMode === 'unread') {
      return this.notifications.filter(n => !n.StatusBaca);
    }
    return this.notifications;
  }

  get unreadCount(): number {
    return this.notifications.filter(n => !n.StatusBaca).length;
  }

  markAsRead(notif: any): void {
    if (notif.StatusBaca) return;

    const headers = this.getHeaders();
    this.http.put(`${this.baseUrl}/${notif.ID}/read`, {}, { headers }).subscribe({
      next: () => {
        notif.StatusBaca = true;
      },
      error: (err) => console.error('Failed to mark notification as read', err)
    });
  }

  markAllAsRead(): void {
    const unreadCount = this.notifications.filter(n => !n.StatusBaca).length;
    if (unreadCount === 0) return;

    const headers = this.getHeaders();
    this.http.put(`${this.baseUrl}/read-all`, {}, { headers }).subscribe({
      next: () => {
        this.notifications.forEach(n => n.StatusBaca = true);
      },
      error: (err) => console.error('Failed to mark all notifications as read', err)
    });
  }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }
}
