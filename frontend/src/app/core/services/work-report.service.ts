import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface WorkReportColumn {
  ID: number;
  nama_kolom: string;
  tipe_input: string; // 'text', 'textarea', 'dropdown'
  opsi: string; // JSON string of options
  aktif: boolean;
  wajib_diisi: boolean;
  urutan: number;
}

export interface WorkReport {
  ID?: number;
  EmployeeID?: number;
  Employee?: any; // For nested employee data
  tanggal: string;
  tugas: string;
  judul: string;
  deskripsi_kegiatan: string;
  realisasi_kegiatan: string;
  kendala: string;
  rencana_minggu_depan: string;
  link_artikel: string;
  catatan_tambahan: string;
  status_sesuai?: string;
  validasi_oleh_hr?: boolean;
  custom_fields: string; // JSON string
  CreatedAt?: string;
  attachments?: WorkReportAttachment[];
  is_late_submission?: boolean;
}

export interface WorkReportAttachment {
  file_url: string;
  file_name: string;
  mime_type: string;
  file_size: number;
}

export interface ComplianceResult {
  employee_id: number;
  tanggal: string;
  has_report: boolean;
  is_attended?: boolean;
}

export interface WorkReportDeadline {
  work_date: string;
  shift_name: string;
  shift_end: string;
  tolerance_minutes: number;
  deadline: string;
  deadline_label: string;
  status: 'tepat_waktu' | 'terlambat';
}

export interface PaginatedWorkReports {
  data: WorkReport[];
  total: number;
  page: number;
  limit: number;
  per_page: number;
  total_pages: number;
}

@Injectable({
  providedIn: 'root'
})
export class WorkReportService {
  private apiUrl = 'http://localhost:8080/api/v1/work-reports';

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  // Work Reports
  getWorkReports(employeeId?: string, startDate?: string, endDate?: string, projectId?: string, forceRefresh?: false): Observable<WorkReport[]>;
  getWorkReports(employeeId?: string, startDate?: string, endDate?: string, projectId?: string, forceRefresh?: boolean, page?: number, limit?: number): Observable<WorkReport[] | PaginatedWorkReports>;
  getWorkReports(employeeId?: string, startDate?: string, endDate?: string, projectId?: string, forceRefresh = false, page?: number, limit?: number): Observable<WorkReport[] | PaginatedWorkReports> {
    let params = new HttpParams();
    if (employeeId) params = params.set('employee_id', employeeId);
    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);
    if (projectId) params = params.set('project_id', projectId);
    if (forceRefresh) params = params.set('_refresh', Date.now().toString());
    if (page !== undefined) params = params.set('page', page);
    if (limit !== undefined) params = params.set('limit', limit);
    
    return this.http.get<WorkReport[] | PaginatedWorkReports>(this.apiUrl, { params, headers: this.getHeaders() });
  }

  createWorkReport(report: WorkReport | FormData): Observable<WorkReport> {
    return this.http.post<WorkReport>(this.apiUrl, report, { headers: this.getHeaders() });
  }

  updateWorkReport(id: number, report: Partial<WorkReport> | FormData): Observable<WorkReport> {
    return this.http.put<WorkReport>(`${this.apiUrl}/${id}`, report, { headers: this.getHeaders() });
  }

  deleteWorkReport(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  getCompliance(startDate?: string, endDate?: string, employeeId?: string, forceRefresh = false): Observable<ComplianceResult[]> {
    let params = new HttpParams();
    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);
    if (employeeId) params = params.set('employee_id', employeeId);
    if (forceRefresh) params = params.set('_refresh', Date.now().toString());

    return this.http.get<ComplianceResult[]>(`${this.apiUrl}/compliance`, { params, headers: this.getHeaders() });
  }

  getDeadline(date: string): Observable<WorkReportDeadline> {
    return this.http.get<WorkReportDeadline>(`${this.apiUrl}/deadline`, {
      params: new HttpParams().set('date', date), headers: this.getHeaders()
    });
  }

  // Work Report Columns
  getColumns(forceRefresh = false): Observable<WorkReportColumn[]> {
    let params = new HttpParams();
    if (forceRefresh) params = params.set('_refresh', Date.now().toString());
    return this.http.get<WorkReportColumn[]>(`${this.apiUrl}/columns`, { params, headers: this.getHeaders() });
  }

  createColumn(column: Partial<WorkReportColumn>): Observable<WorkReportColumn> {
    return this.http.post<WorkReportColumn>(`${this.apiUrl}/columns`, column, { headers: this.getHeaders() });
  }

  updateColumn(id: number, column: Partial<WorkReportColumn>): Observable<WorkReportColumn> {
    return this.http.put<WorkReportColumn>(`${this.apiUrl}/columns/${id}`, column, { headers: this.getHeaders() });
  }

  deleteColumn(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/columns/${id}`, { headers: this.getHeaders() });
  }
}
