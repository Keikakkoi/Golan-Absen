import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface CheckInResponse {
  message: string;
  status: string;
  time: string;
}

export interface AttendanceLocationSelection {
  canonicalType?: string;
  alternativeLocationId?: number | null;
  fieldLocationId?: number | null;
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

  checkIn(latitude: number, longitude: number, accuracy: number, selfieBlob: Blob | null, tipeKerja: string = 'WFO', selection: AttendanceLocationSelection = {}): Observable<CheckInResponse> {
    const formData = new FormData();
    this.appendLocation(formData, latitude, longitude, accuracy);
    formData.append('location_timestamp', new Date().toISOString());
    formData.append('location_source', 'browser-geolocation');
    if (selfieBlob) {
      formData.append('selfie', selfieBlob, 'selfie.jpg');
    }
    formData.append('tipe_kerja', tipeKerja);
    this.appendLocationSelection(formData, selection);

    return this.http.post<CheckInResponse>(`${this.apiUrl}/checkin`, formData, {
      headers: this.getHeaders()
    });
  }

  checkOut(latitude: number, longitude: number, accuracy: number, selfieBlob: Blob | null, tipeKerja: string = 'WFO', selection: AttendanceLocationSelection = {}): Observable<any> {
    const formData = new FormData();
    this.appendLocation(formData, latitude, longitude, accuracy);
    formData.append('location_timestamp', new Date().toISOString());
    formData.append('location_source', 'browser-geolocation');
    if (selfieBlob) {
      formData.append('selfie', selfieBlob, 'selfie.jpg');
    }
    formData.append('tipe_kerja', tipeKerja);
    this.appendLocationSelection(formData, selection);

    return this.http.post<any>(`${this.apiUrl}/checkout`, formData, {
      headers: this.getHeaders()
    });
  }

  private appendLocation(formData: FormData, latitude: number, longitude: number, accuracy: number): void {
    // No-validation work types may be submitted without a GPS fix. When a
    // fix exists, keep all metadata for attendance audit purposes.
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || (latitude === 0 && longitude === 0)) return;
    formData.append('latitude', latitude.toString());
    formData.append('longitude', longitude.toString());
    if (Number.isFinite(accuracy) && accuracy >= 0) {
      formData.append('accuracy', accuracy.toString());
    }
  }

  private appendLocationSelection(formData: FormData, selection: AttendanceLocationSelection): void {
    if (selection.canonicalType) formData.append('tipe_kerja_canonical', selection.canonicalType);
    if (selection.alternativeLocationId != null) formData.append('alternative_location_id', String(selection.alternativeLocationId));
    if (selection.fieldLocationId != null) formData.append('field_location_id', String(selection.fieldLocationId));
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

  getHistory(startDate?: string, endDate?: string): Observable<any[]> {
    let params = new HttpParams();
    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);

    return this.http.get<any[]>(`${this.apiUrl}/history`, {
      headers: this.getHeaders(),
      params
    });
  }
}
