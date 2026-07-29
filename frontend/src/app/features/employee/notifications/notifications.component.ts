import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { SharedSidebarComponent } from '../../shared/shared-sidebar/shared-sidebar.component';
import { AppNotification, NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, DatePipe, SharedSidebarComponent],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent implements OnInit, OnDestroy {
  notifications: AppNotification[] = [];
  isLoading = true;
  filterMode: 'all' | 'unread' = 'all';
  private refreshTimer?: ReturnType<typeof setInterval>;
  private disconnectRealtime?: () => void;
  pushEnabled = false;
  pushBusy = false;
  pushError = '';

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.fetchNotifications();
    this.refreshTimer = setInterval(() => this.fetchNotifications(), 15_000);
    this.notificationService.enablePush(false).then(enabled => this.pushEnabled = enabled).catch(() => undefined);
    this.disconnectRealtime = this.notificationService.connectRealtime(() => this.fetchNotifications());
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.disconnectRealtime?.();
  }

  fetchNotifications(): void {
    this.isLoading = true;
    this.notificationService.getAll().subscribe({
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

    this.notificationService.markAsRead(notif.ID).subscribe({
      next: () => {
        notif.StatusBaca = true;
      },
      error: (err) => console.error('Failed to mark notification as read', err)
    });
  }

  markAllAsRead(): void {
    const unreadCount = this.notifications.filter(n => !n.StatusBaca).length;
    if (unreadCount === 0) return;

    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.forEach(n => n.StatusBaca = true);
      },
      error: (err) => console.error('Failed to mark all notifications as read', err)
    });
  }

  enablePush(): void {
    this.pushError = '';
    this.pushBusy = true;
    this.notificationService.enablePush(true).then(enabled => {
      this.pushEnabled = enabled;
      if (!enabled) this.pushError = 'Push belum aktif. Izinkan notifikasi browser lalu coba lagi.';
      this.pushBusy = false;
    }).catch(() => {
      this.pushBusy = false;
      this.pushError = 'Push tidak dapat diaktifkan. Pastikan backend sudah direstart dan browser memakai localhost atau HTTPS.';
    });
  }
}
