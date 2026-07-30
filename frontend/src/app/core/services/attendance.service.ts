import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface CheckInResponse {
  message: string;
  status: string;
  time: string;
}

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  private apiUrl = 'http://localhost:8080/api/v1/attendance';

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  checkIn(latitude: number, longitude: number, accuracy: number, selfieBlob: Blob | null, tipeKerja: string = 'WFO'): Observable<CheckInResponse> {
    const formData = new FormData();
    formData.append('latitude', latitude.toString());
    formData.append('longitude', longitude.toString());
    formData.append('accuracy', accuracy.toString());
    if (selfieBlob) {
      formData.append('selfie', selfieBlob, 'selfie.jpg');
    }
    formData.append('tipe_kerja', tipeKerja);

    return this.http.post<CheckInResponse>(`${this.apiUrl}/checkin`, formData, {
      headers: this.getHeaders()
    });
  }

  checkOut(latitude: number, longitude: number, accuracy: number, selfieBlob: Blob | null): Observable<any> {
    const formData = new FormData();
    formData.append('latitude', latitude.toString());
    formData.append('longitude', longitude.toString());
    formData.append('accuracy', accuracy.toString());
    if (selfieBlob) {
      formData.append('selfie', selfieBlob, 'selfie.jpg');
    }

    return this.http.post<any>(`${this.apiUrl}/checkout`, formData, {
      headers: this.getHeaders()
    });
  }

  getOfficeInfo(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/office`, {
      headers: this.getHeaders()
    });
  }

  getDashboardStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl.replace('/attendance', '/dashboard/employee/stats')}`, {
      headers: this.getHeaders()
    });
  }

  getHistory(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/history`, {
      headers: this.getHeaders()
    });
  }
}
