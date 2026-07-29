import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { SharedSidebarComponent } from '../../shared/shared-sidebar/shared-sidebar.component';

@Component({ selector: 'app-intern-dashboard', standalone: true, imports: [CommonModule, DatePipe, RouterLink, SharedSidebarComponent], templateUrl: './intern-dashboard.component.html', styleUrls: ['./intern-dashboard.component.scss'] })
export class InternDashboardComponent implements OnInit {
  userName = localStorage.getItem('name') || 'Peserta Magang';
  stats: any = { days_remaining: 0, progress_percent: 0, logbooks_submitted: 0, logbooks_approved: 0 };
  constructor(private http: HttpClient, private auth: AuthService) {}
  ngOnInit(): void { this.http.get<any>('http://localhost:8080/api/v1/internship/dashboard', { headers: this.headers() }).subscribe({ next: data => this.stats = data }); }
  private headers(): HttpHeaders { return new HttpHeaders().set('Authorization', `Bearer ${this.auth.getToken()}`); }
}
