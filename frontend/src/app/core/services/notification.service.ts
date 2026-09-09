import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpContext } from '@angular/common/http';
import { firstValueFrom, Observable, finalize, shareReplay } from 'rxjs';
import { AuthService } from './auth.service';
import { SKIP_PAGE_LOADING } from '../interceptors/page-loading-context';

export interface AppNotification {
  ID: number;
  Judul: string;
  Pesan: string;
  StatusBaca: boolean;
  Waktu: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly baseUrl = 'http://localhost:8080/api/v1/notifications';
  private realtimeSocket?: WebSocket;
  private realtimeCallbacks = new Set<() => void>();
  private notificationsRequest$?: Observable<AppNotification[]>;

  constructor(private http: HttpClient, private authService: AuthService) {}

  getAll(background = false) {
    // Several dashboard widgets can request notifications in response to the
    // same realtime event. Share only the in-flight request so those widgets
    // receive one HTTP response without keeping stale data cached forever.
    if (!this.notificationsRequest$) {
      const context = new HttpContext().set(SKIP_PAGE_LOADING, background);
      this.notificationsRequest$ = this.http.get<AppNotification[]>(this.baseUrl, { headers: this.headers(), context }).pipe(
        finalize(() => this.notificationsRequest$ = undefined),
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }
    return this.notificationsRequest$;
  }

  markAsRead(id: number) {
    return this.http.put(`${this.baseUrl}/${id}/read`, {}, { headers: this.headers() }).pipe(
      finalize(() => this.notificationsRequest$ = undefined)
    );
  }

  markAllAsRead() {
    return this.http.put(`${this.baseUrl}/read-all`, {}, { headers: this.headers() }).pipe(
      finalize(() => this.notificationsRequest$ = undefined)
    );
  }

  /** Refreshes an open app as soon as the backend creates a user notification. */
  connectRealtime(onNotification: () => void): () => void {
    this.realtimeCallbacks.add(onNotification);
    if (!this.realtimeSocket || this.realtimeSocket.readyState === WebSocket.CLOSED) this.openRealtimeSocket();
    // A CLOSING socket is intentionally left alone. Its close handler will
    // open the replacement after the browser has fully released it.
    let disconnected = false;
    return () => {
      if (disconnected) return;
      disconnected = true;
      this.realtimeCallbacks.delete(onNotification);
      if (!this.realtimeCallbacks.size) {
        this.realtimeSocket?.close();
        this.realtimeSocket = undefined;
      }
    };
  }

  private openRealtimeSocket(): void {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//localhost:8080/ws/dashboard`);
    this.realtimeSocket = socket;
    socket.onmessage = (event) => {
      try {
        const eventName = JSON.parse(event.data)?.event;
        if (['notification_created', 'new_checkin', 'new_checkout', 'new_work_report', 'new_logbook', 'logbook_updated', 'logbook_deleted', 'logbook_status_updated', 'new_leave', 'leave_request_created', 'leave_status_updated'].includes(eventName)) this.realtimeCallbacks.forEach(callback => callback());
      } catch { /* Ignore malformed broadcast messages. */ }
    };
    socket.onclose = () => {
      if (this.realtimeSocket !== socket) return;
      this.realtimeSocket = undefined;
      if (this.realtimeCallbacks.size) this.openRealtimeSocket();
    };
  }

  /**
   * Registers a browser Push API subscription. Prompting is opt-in so a page
   * load cannot unexpectedly show a browser permission dialog.
   */
  async enablePush(requestPermission = false): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return false;

    const config = await firstValueFrom(this.http.get<{ enabled: boolean; public_key: string }>(`${this.baseUrl}/push/config`, { headers: this.headers() }));
    if (!config.enabled || !config.public_key) return false;
    if (Notification.permission === 'denied') return false;
    if (Notification.permission === 'default' && !requestPermission) return false;
    if (Notification.permission === 'default' && await Notification.requestPermission() !== 'granted') return false;

    const registration = await navigator.serviceWorker.register('/sw.js');
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(config.public_key)
      });
    }
    await firstValueFrom(this.http.post(`${this.baseUrl}/push/subscribe`, subscription.toJSON(), { headers: this.headers() }));
    return true;
  }

  /**
   * Removes this browser/device from the current user's push recipients.
   * Browser permission cannot be revoked by a website, but the subscription
   * itself can be revoked and removed from the backend so no push is sent.
   */
  async disablePush(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

    const registration = await navigator.serviceWorker.register('/sw.js');
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return true;

    const endpoint = subscription.endpoint;
    await firstValueFrom(this.http.delete(`${this.baseUrl}/push/subscribe`, {
      headers: this.headers(),
      body: { endpoint }
    }));
    await subscription.unsubscribe();
    return true;
  }

  private headers(): HttpHeaders {
    return new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
  }

  private urlBase64ToUint8Array(value: string): Uint8Array {
    const padding = '='.repeat((4 - value.length % 4) % 4);
    const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
  }
}
