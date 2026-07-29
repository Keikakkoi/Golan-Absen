import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { SharedSidebarComponent } from '../../shared/shared-sidebar/shared-sidebar.component';
@Component({ selector: 'app-manager-dashboard', standalone: true, imports: [CommonModule, SharedSidebarComponent], templateUrl: './manager-dashboard.component.html', styleUrls: ['./manager-dashboard.component.scss'] })
export class ManagerDashboardComponent implements OnInit { stats: any = { team_members: 0, hadir_hari_ini: 0, izin_pending: 0, weekly: [] }; constructor(private http: HttpClient, private auth: AuthService) {} ngOnInit(): void { this.http.get<any>('http://localhost:8080/api/v1/manager/dashboard', { headers: this.headers() }).subscribe({ next: data => this.stats = data }); } bar(item: any): number { return Math.min(100, Number(item.hadir || 0) * 15 + Number(item.terlambat || 0) * 10); } private headers(): HttpHeaders { return new HttpHeaders().set('Authorization', `Bearer ${this.auth.getToken()}`); } }
