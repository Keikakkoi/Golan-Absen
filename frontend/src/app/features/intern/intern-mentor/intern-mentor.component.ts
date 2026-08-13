import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { SharedSidebarComponent } from '../../shared/shared-sidebar/shared-sidebar.component';
@Component({ selector: 'app-intern-mentor', standalone: true, imports: [CommonModule, SharedSidebarComponent], templateUrl: './intern-mentor.component.html', styleUrls: ['./intern-mentor.component.scss'] })
export class InternMentorComponent implements OnInit {
  mentor: any = {};
  loading = true;
  error = false;

  constructor(private http: HttpClient, private auth: AuthService) {}

  ngOnInit(): void {
    this.http.get<any>('http://localhost:8080/api/v1/internship/mentor', {
      headers: new HttpHeaders().set('Authorization', `Bearer ${this.auth.getToken()}`)
    }).subscribe({
      next: data => { this.mentor = data || {}; this.loading = false; },
      error: () => { this.loading = false; this.error = true; }
    });
  }

  value(value: unknown): string { return value === null || value === undefined || String(value).trim() === '' ? 'Belum tersedia' : String(value); }
  imageError(event: Event): void { (event.target as HTMLImageElement).src = 'assets/icon_golan.png'; }
}
