import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { ThemeService } from './theme.service';
import { environment } from '../../../environments/environment';

export interface LoginResponse {
  token: string;
  role: string;
  name: string;
  divisi?: string;
  jabatan?: string;
  permissions?: string[];
}

export interface ForgotPasswordResponse {
  message: string;
  email?: string;
  mock_otp?: string;
}

export interface ResetPasswordResponse {
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  constructor(private http: HttpClient, private router: Router, private themeService: ThemeService) {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const name = localStorage.getItem('name');
    const divisi = localStorage.getItem('divisi');
    const jabatan = localStorage.getItem('jabatan');
    const permissionsStr = localStorage.getItem('permissions');
    const permissions = permissionsStr ? JSON.parse(permissionsStr) : [];
    if (token) {
      this.currentUserSubject.next({ token, role, name, divisi, jabatan, permissions });
    }
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, {
      email: email.trim(),
      password
    })
      .pipe(
        tap(response => {
          localStorage.setItem('token', response.token);
          localStorage.setItem('role', response.role);
          localStorage.setItem('name', response.name);
          if (response.divisi) {
            localStorage.setItem('divisi', response.divisi);
          }
          if (response.jabatan) {
            localStorage.setItem('jabatan', response.jabatan);
          }
          if (response.permissions) {
            localStorage.setItem('permissions', JSON.stringify(response.permissions));
          } else {
            localStorage.setItem('permissions', JSON.stringify([]));
          }
          this.currentUserSubject.next(response);
          this.themeService.applyStoredTheme();
        })
      );
  }

  requestPasswordReset(email: string): Observable<ForgotPasswordResponse> {
    return this.http.post<ForgotPasswordResponse>(`${this.apiUrl}/forgot-password`, {
      email: email.trim()
    });
  }

  resendPasswordOTP(email: string): Observable<ForgotPasswordResponse> {
    return this.http.post<ForgotPasswordResponse>(`${this.apiUrl}/forgot-password/resend`, { email: email.trim() });
  }

  verifyPasswordOTP(email: string, otp: string): Observable<{ message: string; reset_token: string }> {
    return this.http.post<{ message: string; reset_token: string }>(`${this.apiUrl}/verify-password-otp`, { email: email.trim(), otp });
  }

  resetPassword(token: string, newPassword: string): Observable<ResetPasswordResponse> {
    return this.http.post<ResetPasswordResponse>(`${this.apiUrl}/reset-password`, {
      reset_token: token,
      new_password: newPassword
    });
  }

  logout(): void {
    // Do not let the authenticated dark palette leak into the login page.
    this.themeService.clearActiveTheme();
    const token = this.getToken();
    if (token) {
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
      this.http.post(`${this.apiUrl}/logout`, {}, { headers }).subscribe({
        next: () => this.clearSession(),
        error: () => this.clearSession()
      });
    } else {
      this.clearSession();
    }
  }

  private clearSession(): void {
    this.themeService.clearActiveTheme();
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('name');
    localStorage.removeItem('divisi');
    localStorage.removeItem('jabatan');
    localStorage.removeItem('permissions');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  refreshProfile(): Observable<any> {
    const token = this.getToken();
    if (!token) return new Observable(sub => sub.complete());

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get<any>(`http://localhost:8080/api/v1/employee/profile`, { headers }).pipe(
      tap(profile => {
        if (profile.permissions) {
          localStorage.setItem('permissions', JSON.stringify(profile.permissions));
          
          const current = this.currentUserSubject.value;
          if (current) {
            this.currentUserSubject.next({ ...current, permissions: profile.permissions });
          }
        }
      })
    );
  }

  getRole(): string | null {
    return localStorage.getItem('role');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  hasPermission(permission: string): boolean {
    const permissionsStr = localStorage.getItem('permissions');
    if (!permissionsStr) return false;
    try {
      const permissions = JSON.parse(permissionsStr);
      return Array.isArray(permissions) && permissions.includes(permission);
    } catch (e) {
      return false;
    }
  }
}
