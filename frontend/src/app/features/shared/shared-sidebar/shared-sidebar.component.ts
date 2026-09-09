import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AppNotification, NotificationService } from '../../../core/services/notification.service';
import { ThemeService } from '../../../core/services/theme.service';
import { Subscription, filter, take } from 'rxjs';
import { UiSkeletonComponent } from '../../../shared/ui-skeleton/ui-skeleton.component';

@Component({
  selector: 'app-shared-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, UiSkeletonComponent],
  templateUrl: './shared-sidebar.component.html',
  styleUrls: ['./shared-sidebar.component.scss']
})
export class SharedSidebarComponent implements AfterViewInit, OnDestroy, OnInit {
  @ViewChild('sidebar') private sidebarElement?: ElementRef<HTMLElement>;

  userRole: string | null = null;
  isDrawerOpen = false;
  darkModeEnabled = false;
  isDarkMode = false;
  notifications: AppNotification[] = [];
  showNotifications = false;
  isMenuLoading = true;
  isNotificationsLoading = true;
  private themeSubscription = new Subscription();
  private disconnectRealtime?: () => void;
  private userSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private themeService: ThemeService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.userRole = this.authService.getRole();
    this.userSubscription = this.authService.currentUser$.pipe(
      filter(user => !!user),
      take(1)
    ).subscribe(user => {
      this.isMenuLoading = false;
      if (user) {
        this.loadNotifications();
        this.disconnectRealtime = this.notificationService.connectRealtime(() => this.loadNotifications(true));
      }
    });
    this.themeSubscription.add(this.themeService.darkModeEnabled$.subscribe(enabled => {
      this.darkModeEnabled = enabled;
    }));
    this.themeSubscription.add(this.themeService.darkMode$.subscribe(isDark => {
      this.isDarkMode = isDark;
    }));
  }

  ngAfterViewInit(): void {
    // The sidebar is recreated on every route change. Restore its previous
    // position so clicking a menu item near the bottom does not jump to the top.
    requestAnimationFrame(() => {
      const sidebar = this.sidebarElement?.nativeElement;
      const savedScrollTop = sessionStorage.getItem('golan-sidebar-scroll-top');

      if (sidebar && savedScrollTop !== null) {
        sidebar.scrollTop = Number(savedScrollTop) || 0;
      }
    });
  }

  ngOnDestroy(): void {
    this.themeSubscription.unsubscribe();
    this.disconnectRealtime?.();
    this.disconnectRealtime = undefined;
    this.userSubscription?.unsubscribe();
    this.userSubscription = undefined;
  }

  loadNotifications(background = false): void {
    this.isNotificationsLoading = true;
    this.notificationService.getAll(background).subscribe({
      next: data => { this.notifications = data || []; this.isNotificationsLoading = false; },
      error: err => { this.isNotificationsLoading = false; console.error('Failed to load notifications', err); }
    });
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
  }

  markAsRead(notification: AppNotification): void {
    if (notification.StatusBaca) return;

    this.notificationService.markAsRead(notification.ID).subscribe({
      next: () => notification.StatusBaca = true,
      error: err => console.error('Failed to mark notification as read', err)
    });
  }

  get unreadCount(): number {
    return this.notifications.filter(notification => !notification.StatusBaca).length;
  }

  get notificationsLink(): string {
    if (this.userRole === 'Karyawan' || this.userRole === 'MAGANG' || this.userRole === 'MANAJER') return '/employee/notifications';
    return '/admin/notifications';
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  toggleDrawer(): void {
    if (this.isDrawerOpen) {
      this.closeDrawer();
      return;
    }

    this.isDrawerOpen = !this.isDrawerOpen;
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isDrawerOpen) {
      this.closeDrawer();
    }
  }

  closeDrawer(): void {
    const sidebar = this.sidebarElement?.nativeElement;

    if (sidebar) {
      sessionStorage.setItem('golan-sidebar-scroll-top', String(sidebar.scrollTop));
    }

    this.isDrawerOpen = false;
  }

  logout(event: Event): void {
    event.preventDefault();
    this.isDrawerOpen = false;
    this.authService.logout();
  }

  hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission);
  }
}
