import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';

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

  constructor(private http: HttpClient, private authService: AuthService) {}

  getAll() {
    return this.http.get<AppNotification[]>(this.baseUrl, { headers: this.headers() });
  }

  markAsRead(id: number) {
    return this.http.put(`${this.baseUrl}/${id}/read`, {}, { headers: this.headers() });
  }

  markAllAsRead() {
    return this.http.put(`${this.baseUrl}/read-all`, {}, { headers: this.headers() });
  }

  /** Refreshes an open app as soon as the backend creates a user notification. */
  connectRealtime(onNotification: () => void): () => void {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//localhost:8080/ws/dashboard`);
    socket.onmessage = (event) => {
      try {
        if (JSON.parse(event.data)?.event === 'notification_created') onNotification();
      } catch { /* Ignore malformed realtime messages. */ }
    };
    return () => socket.close();
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
