import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { SharedSidebarComponent } from '../../shared/shared-sidebar/shared-sidebar.component';

interface ManagerInfo {
  has_manager: boolean;
  manager_id: number | null;
  name: string;
  photo_url: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  position: string;
  department: string;
  shift: string;
  home_location: string;
}

@Component({
  selector: 'app-manager',
  standalone: true,
  imports: [CommonModule, SharedSidebarComponent],
  templateUrl: './manager.component.html',
  styleUrls: ['./manager.component.scss']
})
export class ManagerComponent implements OnInit {
  manager: ManagerInfo | null = null;
  loading = true;
  error = false;

  constructor(private http: HttpClient, private auth: AuthService) {}

  ngOnInit(): void {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.auth.getToken()}`);
    this.http.get<ManagerInfo>('http://localhost:8080/api/v1/employee/manager', { headers }).subscribe({
      next: data => {
        this.manager = data?.has_manager ? data : null;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = true;
      }
    });
  }

  value(value: unknown): string {
    return value === null || value === undefined || String(value).trim() === '' ? 'Belum tersedia' : String(value);
  }

  imageError(event: Event): void {
    const image = event.target as HTMLImageElement;
    if (!image.src.endsWith('/assets/icon_golan.png')) image.src = 'assets/icon_golan.png';
  }
}
