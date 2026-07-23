import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-pimpinan-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './pimpinan-dashboard.component.html',
  styleUrls: ['./pimpinan-dashboard.component.scss']
})
export class PimpinanDashboardComponent implements OnInit, OnDestroy {
  stats = {
    totalEmployees: 0,
    presentWFO: 0,
    presentWFH: 0,
    late: 0,
    onLeave: 0
  };

  recentCheckins: any[] = [];
  isLoading = true;
  private ws!: WebSocket;

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit(): void {
    this.fetchInitialStats();
    this.connectWebSocket();
  }

  ngOnDestroy(): void {
    if (this.ws) {
      this.ws.close();
    }
  }

  private fetchInitialStats(): void {
    const token = this.authService.getToken();
    if (!token) return;

    // We can fetch today's stats from the report endpoint or create a new summary endpoint
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    // For now, let's fetch all records for today to calculate stats
    const today = new Date().toISOString().split('T')[0];
    this.http.get<any[]>(`http://localhost:8080/api/v1/admin/reports?start_date=${today}&end_date=${today}`, { headers }).subscribe({
      next: (data) => {
        this.processStats(data);
        this.recentCheckins = data.slice(0, 10); // top 10
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  private processStats(records: any[]): void {
    this.stats.presentWFO = records.filter(r => r.Status === 'Hadir' && r.TipeKerja === 'WFO').length;
    this.stats.presentWFH = records.filter(r => r.Status === 'Hadir' && r.TipeKerja === 'WFH').length;
    this.stats.late = records.filter(r => r.Status === 'Terlambat').length;
    // Assuming onLeave is calculated elsewhere or we just show 0 for now if not in this list
  }

  private connectWebSocket(): void {
    this.ws = new WebSocket('ws://localhost:8080/ws/dashboard');

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.event === 'new_checkin') {
        const record = message.data;
        
        // Add visual blink effect or just update
        if (record.Status === 'Hadir' && record.TipeKerja === 'WFO') this.stats.presentWFO++;
        if (record.Status === 'Hadir' && record.TipeKerja === 'WFH') this.stats.presentWFH++;
        if (record.Status === 'Terlambat') this.stats.late++;

        // Unshift to recent checkins
        this.recentCheckins.unshift(record);
        if (this.recentCheckins.length > 10) this.recentCheckins.pop();
        
        // Optional: Trigger change detection or animation class
      }
    };

    this.ws.onclose = () => {
      console.log('WS connection closed. Reconnecting...');
      setTimeout(() => this.connectWebSocket(), 3000);
    };
  }

  logout(): void {
    this.authService.logout();
  }
}
