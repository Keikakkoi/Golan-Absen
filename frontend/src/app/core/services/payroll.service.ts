import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export const PAYROLL_COMPANY_NAME = 'PT Golan Digital Kreatif';
export const PAYROLL_COMPANY_CONTACT = {
  phone: '6281324937038/+6285319094079',
  email: 'info@golandigital.com',
  website: 'golandigital.com',
  address: 'Jalan Manyar II RT.002 RW.011, Tegal Alur, Kalideres, Jakarta Barat, DKI Jakarta'
} as const;
export const PAYROLL_TAKE_HOME_PAY_SUBTITLE = 'Total pendapatan - Total pengurangan';

export interface PayrollItem { ID?: number; type: 'income' | 'deduction'; name: string; amount: number; sort_order?: number; }
export interface Payroll {
  ID: number; employee_id: number; user_id: number; periode_bulan: string; payroll_cutoff_start: string; payroll_cutoff_end: string; payment_date: string;
  employee_name_snapshot: string; employee_code_snapshot: string; nik_snapshot?: string; position_snapshot?: string; division_snapshot?: string;
  total_hari_kerja: number; company_name_snapshot: string; company_phone_snapshot?: string; uang_transportasi: number; bpjs_ketenagakerjaan: number; total_income: number; total_deduction: number; take_home_pay: number;
  notes?: string; approved_by_name?: string; approved_by_position?: string; received_by_name?: string; received_by_position?: string; status: 'Draft' | 'Published' | 'Dibatalkan'; published_at?: string; items: PayrollItem[];
}
export interface PayrollPage { data: Payroll[]; total: number; page: number; limit: number; per_page?: number; total_pages: number; }

@Injectable({ providedIn: 'root' })
export class PayrollService {
  private readonly adminUrl = `${environment.apiUrl}/admin/payroll`;
  private readonly employeeUrl = `${environment.apiUrl}/employee/payroll`;
  constructor(private http: HttpClient, private auth: AuthService) {}
  private headers(): HttpHeaders { return new HttpHeaders().set('Authorization', `Bearer ${this.auth.getToken()}`); }
  list(filters: Record<string, string | number | undefined>): Observable<PayrollPage> {
    let params = new HttpParams(); Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value)); });
    return this.http.get<PayrollPage>(this.adminUrl, { headers: this.headers(), params });
  }
  detail(id: number): Observable<Payroll> { return this.http.get<Payroll>(`${this.adminUrl}/${id}`, { headers: this.headers() }); }
  attendanceDays(employeeID: number, startDate: string, endDate: string): Observable<{ total_hari_kerja: number }> {
    const params = new HttpParams().set('employee_id', String(employeeID)).set('start_date', startDate).set('end_date', endDate);
    return this.http.get<{ total_hari_kerja: number }>(`${this.adminUrl}/attendance-days`, { headers: this.headers(), params });
  }
  create(payload: unknown): Observable<Payroll> { return this.http.post<Payroll>(this.adminUrl, payload, { headers: this.headers() }); }
  update(id: number, payload: unknown): Observable<Payroll> { return this.http.put<Payroll>(`${this.adminUrl}/${id}`, payload, { headers: this.headers() }); }
  remove(id: number): Observable<unknown> { return this.http.delete(`${this.adminUrl}/${id}`, { headers: this.headers() }); }
  publish(id: number): Observable<Payroll> { return this.http.post<Payroll>(`${this.adminUrl}/${id}/publish`, {}, { headers: this.headers() }); }
  pdf(id: number, employee = false): Observable<Blob> { const base = employee ? this.employeeUrl : this.adminUrl; return this.http.get(`${base}/${id}/pdf`, { headers: this.headers(), responseType: 'blob' }); }
  mine(page = 1, limit = 10): Observable<PayrollPage> {
    const params = new HttpParams().set('page', String(page)).set('limit', String(limit));
    return this.http.get<PayrollPage>(this.employeeUrl, { headers: this.headers(), params });
  }
}
