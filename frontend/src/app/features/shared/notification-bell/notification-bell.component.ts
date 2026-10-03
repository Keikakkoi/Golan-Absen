import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AppNotification, NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink],
  templateUrl: './notification-bell.component.html',
  styleUrls: ['./notification-bell.component.scss']
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  notifications: AppNotification[] = [];
  showNotifications = false;
  private notificationsSubscription?: Subscription;
  private disconnectRealtime?: () => void;

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.notificationsSubscription = this.notificationService.notifications$.subscribe(notifications => {
      this.notifications = notifications;
    });
    this.loadNotifications();
    this.disconnectRealtime = this.notificationService.connectRealtime(() => this.loadNotifications(true));
  }

  ngOnDestroy(): void {
    this.disconnectRealtime?.();
    this.notificationsSubscription?.unsubscribe();
  }

  loadNotifications(background = false): void {
    this.notificationService.getAll(background).subscribe({
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
}
