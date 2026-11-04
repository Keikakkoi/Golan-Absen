import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Subject } from 'rxjs';
import { finalize, takeUntil, timeout } from 'rxjs/operators';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';
import { AlertService } from '../../../core/services/alert.service';
import { AuthService } from '../../../core/services/auth.service';
import { extractGoogleMapsCoordinates } from '../../../core/utils/google-maps';

@Component({
  selector: 'app-location-management',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, AdminSidebarComponent, PaginationComponent],
  templateUrl: './location-management.component.html',
  styleUrls: ['./location-management.component.scss']
})
export class LocationManagementComponent implements OnInit, OnDestroy {
  alternativeRequests: any[] = [];
  alternativeTotal = 0;
  alternativePage = 1;
  alternativePageSize = 20;
  alternativeSearch = '';
  alternativeStatusFilter = '';
  alternativeLoading = false;
  alternativeError = '';
  alternativeDetailOpen = false;
  selectedAlternativeRequest: any = null;
  alternativeActingId: number | null = null;

  fieldLocations: any[] = [];
  fieldTotal = 0;
  fieldPage = 1;
  fieldPageSize = 20;
  fieldSearch = '';
  fieldStatus = '';
  fieldLoading = false;
  fieldError = '';
  fieldModalOpen = false;
  fieldDetailOpen = false;
  selectedFieldLocation: any = null;
  editingFieldLocationId: number | null = null;
  fieldSaving = false;
  fieldMapResolving = false;
  fieldForm = this.emptyFieldForm();

  readonly pageSizeOptions = [10, 20, 50, 100];
  private readonly api = 'http://localhost:8080/api/v1/admin/locations';
  private readonly destroy$ = new Subject<void>();

  constructor(private http: HttpClient, private auth: AuthService, private alert: AlertService) {}

  ngOnInit(): void {
    this.loadAlternativeRequests();
    this.loadFieldLocations();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private headers(): HttpHeaders {
    return new HttpHeaders().set('Authorization', `Bearer ${this.auth.getToken()}`);
  }

  private apiError(error: any, fallback: string): string {
    if (error?.status === 401) return 'Sesi login telah kedaluwarsa. Silakan login kembali.';
    return error?.error?.error || error?.error?.message || error?.message || fallback;
  }

  private queryParams(page: number, limit: number, search: string, status: string, sort: string): HttpParams {
    let params = new HttpParams().set('page', page).set('limit', limit).set('sort', sort).set('order', 'desc');
    if (search.trim()) params = params.set('search', search.trim());
    if (status) params = params.set('status', status);
    return params;
  }

  loadAlternativeRequests(): void {
    this.alternativeLoading = true;
    this.alternativeError = '';
    const params = this.queryParams(this.alternativePage, this.alternativePageSize, this.alternativeSearch, this.alternativeStatusFilter, 'created_at');
    this.http.get<any>(`${this.api}/alternative-requests`, { headers: this.headers(), params }).pipe(
      timeout(15000), takeUntil(this.destroy$), finalize(() => this.alternativeLoading = false)
    ).subscribe({
      next: response => {
        this.alternativeRequests = Array.isArray(response) ? response : (response?.data || []);
        this.alternativeTotal = Number(response?.total ?? this.alternativeRequests.length) || 0;
        this.keepPageInRange(this.alternativeTotal, 'alternative');
      },
      error: error => this.alternativeError = this.apiError(error, 'Gagal memuat pengajuan lokasi alternatif.')
    });
  }

  loadFieldLocations(): void {
    this.fieldLoading = true;
    this.fieldError = '';
    const params = this.queryParams(this.fieldPage, this.fieldPageSize, this.fieldSearch, this.fieldStatus, 'updated_at');
    this.http.get<any>(`${this.api}/field`, { headers: this.headers(), params }).pipe(
      timeout(15000), takeUntil(this.destroy$), finalize(() => this.fieldLoading = false)
    ).subscribe({
      next: response => {
        this.fieldLocations = Array.isArray(response) ? response : (response?.data || []);
        this.fieldTotal = Number(response?.total ?? this.fieldLocations.length) || 0;
        this.keepPageInRange(this.fieldTotal, 'field');
      },
      error: error => this.fieldError = this.apiError(error, 'Gagal memuat lokasi lapangan.')
    });
  }

  private keepPageInRange(total: number, resource: 'alternative' | 'field'): void {
    const size = resource === 'alternative' ? this.alternativePageSize : this.fieldPageSize;
    const page = Math.max(1, Math.ceil(total / size));
    if (resource === 'alternative' && this.alternativePage > page && total > 0) {
      this.alternativePage = page;
      this.loadAlternativeRequests();
    }
    if (resource === 'field' && this.fieldPage > page && total > 0) {
      this.fieldPage = page;
      this.loadFieldLocations();
    }
  }

  alternativeFiltersChanged(): void { this.applyAlternativeFilters(); }
  fieldFiltersChanged(): void { this.applyFieldFilters(); }
  applyAlternativeFilters(): void { this.alternativePage = 1; this.loadAlternativeRequests(); }
  applyFieldFilters(): void { this.fieldPage = 1; this.loadFieldLocations(); }
  alternativePageChanged(page: number): void { this.alternativePage = page; this.loadAlternativeRequests(); }
  alternativePageSizeChanged(size: number): void { this.alternativePageSize = size; this.alternativePage = 1; this.loadAlternativeRequests(); }
  fieldPageChanged(page: number): void { this.fieldPage = page; this.loadFieldLocations(); }
  fieldPageSizeChanged(size: number): void { this.fieldPageSize = size; this.fieldPage = 1; this.loadFieldLocations(); }

  alternativeId(row: any): number { return Number(row?.id ?? row?.ID ?? 0); }
  fieldId(row: any): number { return Number(row?.id ?? row?.ID ?? 0); }
  ownerName(row: any): string { return row?.owner?.nama || row?.Owner?.Nama || row?.user?.nama || row?.User?.Nama || '-'; }
  ownerRole(row: any): string { return row?.owner?.role || row?.Owner?.Role || row?.user?.role || row?.User?.Role || '-'; }
  alternativeName(row: any): string { return row?.nama_lokasi || row?.NamaLokasi || row?.label || '-'; }
  alternativeStatus(row: any): string { return String(row?.status || row?.status_approval || row?.StatusApproval || '').toLowerCase(); }
  alternativeStatusLabel(row: any): string {
    return row?.status_label || row?.StatusLabel || (this.alternativeStatus(row) === 'approved' ? 'Disetujui' : this.alternativeStatus(row) === 'rejected' ? 'Ditolak' : 'Menunggu persetujuan');
  }
  fieldStatusValue(row: any): string { return String(row?.status_aktif || row?.StatusAktif || '').toLowerCase(); }
  fieldStatusLabel(row: any): string { return this.fieldStatusValue(row) === 'active' ? 'Aktif' : 'Tidak aktif'; }
  rejectionReason(row: any): string {
    if (this.alternativeStatus(row) !== 'rejected') return '';
    return row?.rejection_reason || row?.RejectionReason || row?.alasan_penolakan || row?.AlasanPenolakan || '';
  }
  isPending(row: any): boolean { return this.alternativeStatus(row) === 'pending'; }
  fieldIsActive(row: any): boolean { return this.fieldStatusValue(row) === 'active'; }

  openAlternativeDetail(row: any): void {
    const id = this.alternativeId(row);
    if (!id) return;
    this.http.get<any>(`${this.api}/alternative-requests/${id}`, { headers: this.headers() }).pipe(timeout(10000), takeUntil(this.destroy$)).subscribe({
      next: detail => { this.selectedAlternativeRequest = detail; this.alternativeDetailOpen = true; },
      error: async error => await this.alert.error('Detail tidak tersedia', this.apiError(error, 'Gagal memuat detail pengajuan.'))
    });
  }

  closeAlternativeDetail(): void { this.alternativeDetailOpen = false; this.selectedAlternativeRequest = null; }

  async approveAlternative(row: any): Promise<void> {
    if (!this.isPending(row)) { await this.alert.error('Keputusan tidak valid', 'Pengajuan ini sudah diproses.'); return; }
    const id = this.alternativeId(row);
    if (!await this.alert.confirm('Setujui pengajuan lokasi?', 'Lokasi akan menjadi approved dan aktif untuk check-in user.')) return;
    this.alternativeActingId = id;
    this.http.post<any>(`${this.api}/alternative-requests/${id}/approve`, {}, { headers: this.headers() }).pipe(
      timeout(15000), takeUntil(this.destroy$), finalize(() => this.alternativeActingId = null)
    ).subscribe({
      next: async () => { this.closeAlternativeDetail(); await this.alert.success('Pengajuan disetujui'); this.loadAlternativeRequests(); },
      error: async error => await this.alert.error('Persetujuan gagal', this.apiError(error, 'Gagal menyetujui pengajuan.'))
    });
  }

  async rejectAlternative(row: any): Promise<void> {
    if (!this.isPending(row)) { await this.alert.error('Keputusan tidak valid', 'Pengajuan ini sudah diproses.'); return; }
    const reason = await this.alert.textarea('Tolak pengajuan lokasi?', 'Masukkan alasan penolakan yang akan terlihat oleh user.', 'Tolak Pengajuan', 'Contoh: koordinat tidak sesuai area kerja');
    if (!reason) return;
    const id = this.alternativeId(row);
    this.alternativeActingId = id;
    this.http.post<any>(`${this.api}/alternative-requests/${id}/reject`, { rejection_reason: reason }, { headers: this.headers() }).pipe(
      timeout(15000), takeUntil(this.destroy$), finalize(() => this.alternativeActingId = null)
    ).subscribe({
      next: async () => { this.closeAlternativeDetail(); await this.alert.success('Pengajuan ditolak'); this.loadAlternativeRequests(); },
      error: async error => await this.alert.error('Penolakan gagal', this.apiError(error, 'Gagal menolak pengajuan.'))
    });
  }

  private emptyFieldForm(): any {
    return { nama_lokasi: '', deskripsi: '', latitude: null, longitude: null, radius_meter: 100, metode_validasi: 'radius', status_aktif: 'active', google_maps_url: '' };
  }

  openFieldModal(row?: any): void {
    this.editingFieldLocationId = row ? this.fieldId(row) : null;
    this.fieldError = '';
    this.fieldForm = row ? {
      nama_lokasi: row.nama_lokasi || row.NamaLokasi || '',
      deskripsi: row.deskripsi || row.Deskripsi || '',
      latitude: row.latitude == null ? null : Number(row.latitude),
      longitude: row.longitude == null ? null : Number(row.longitude),
      radius_meter: Number(row.radius_meter ?? row.RadiusMeter ?? 100) || 100,
      metode_validasi: row.metode_validasi || row.MetodeValidasi || 'radius',
      status_aktif: this.fieldStatusValue(row) || 'active',
      google_maps_url: row.google_maps_url || row.GoogleMapsURL || ''
    } : this.emptyFieldForm();
    this.fieldModalOpen = true;
  }

  closeFieldModal(): void { this.fieldModalOpen = false; this.editingFieldLocationId = null; }

  onFieldGoogleMapsUrlChange(): void {
    const coordinates = extractGoogleMapsCoordinates(this.fieldForm.google_maps_url);
    this.fieldForm.latitude = coordinates?.latitude ?? null;
    this.fieldForm.longitude = coordinates?.longitude ?? null;
    this.fieldError = '';
  }

  resolveFieldGoogleMapsUrl(): void {
    const url = String(this.fieldForm.google_maps_url || '').trim();
    if (!url || (this.fieldForm.latitude !== null && this.fieldForm.longitude !== null)) return;
    this.fieldMapResolving = true;
    this.http.get<any>('http://localhost:8080/api/v1/google-maps/resolve', { headers: this.headers(), params: { url } }).pipe(
      timeout(12000), takeUntil(this.destroy$), finalize(() => this.fieldMapResolving = false)
    ).subscribe({
      next: result => {
        this.fieldForm.latitude = Number(result.latitude);
        this.fieldForm.longitude = Number(result.longitude);
      },
      error: error => this.fieldError = this.apiError(error, 'Link Google Maps tidak berisi koordinat yang valid.')
    });
  }

  openFieldDetail(row: any): void {
    const id = this.fieldId(row);
    if (!id) return;
    this.http.get<any>(`${this.api}/field/${id}`, { headers: this.headers() }).pipe(timeout(10000), takeUntil(this.destroy$)).subscribe({
      next: detail => { this.selectedFieldLocation = detail; this.fieldDetailOpen = true; },
      error: async error => await this.alert.error('Detail tidak tersedia', this.apiError(error, 'Gagal memuat detail lokasi lapangan.'))
    });
  }

  closeFieldDetail(): void { this.fieldDetailOpen = false; this.selectedFieldLocation = null; }

  private validateFieldForm(): string | null {
    const f = this.fieldForm;
    if (!String(f.nama_lokasi || '').trim()) return 'Nama lokasi wajib diisi.';
    if (String(f.nama_lokasi).trim().length > 100) return 'Nama lokasi maksimal 100 karakter.';
    const latitude = Number(f.latitude), longitude = Number(f.longitude), radius = Number(f.radius_meter);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 || (latitude === 0 && longitude === 0)) return f.google_maps_url ? 'Koordinat belum berhasil dibaca dari link Google Maps.' : 'Koordinat harus diisi melalui link Google Maps yang valid.';
    if (!Number.isFinite(radius) || radius < 1 || radius > 10000) return 'Radius harus antara 1 sampai 10.000 meter.';
    if (!['active', 'inactive'].includes(String(f.status_aktif))) return 'Status lokasi tidak valid.';
    return null;
  }

  async saveFieldLocation(): Promise<void> {
    if (this.fieldMapResolving) {
      this.fieldError = 'Tunggu sampai koordinat selesai dibaca dari link Google Maps.';
      await this.alert.error('Koordinat belum siap', this.fieldError);
      return;
    }
    const validationError = this.validateFieldForm();
    if (validationError) { this.fieldError = validationError; await this.alert.error('Data lokasi tidak valid', validationError); return; }
    const editing = this.editingFieldLocationId !== null;
    if (!await this.alert.confirm(editing ? 'Simpan perubahan lokasi lapangan?' : 'Tambah lokasi lapangan?', 'Lokasi lapangan akan menjadi bagian dari master lokasi admin.')) return;
    const id = this.editingFieldLocationId;
    const url = editing ? `${this.api}/field/${id}` : `${this.api}/field`;
    const body = { ...this.fieldForm, nama_lokasi: String(this.fieldForm.nama_lokasi).trim(), latitude: Number(this.fieldForm.latitude), longitude: Number(this.fieldForm.longitude), radius_meter: Number(this.fieldForm.radius_meter) };
    this.fieldSaving = true;
    const request = editing ? this.http.put<any>(url, body, { headers: this.headers() }) : this.http.post<any>(url, body, { headers: this.headers() });
    request.pipe(timeout(15000), takeUntil(this.destroy$), finalize(() => this.fieldSaving = false)).subscribe({
      next: async () => { this.closeFieldModal(); await this.alert.success(editing ? 'Lokasi lapangan diperbarui' : 'Lokasi lapangan ditambahkan'); this.loadFieldLocations(); },
      error: async error => { this.fieldError = this.apiError(error, 'Gagal menyimpan lokasi lapangan.'); await this.alert.error('Penyimpanan gagal', this.fieldError); }
    });
  }

  async toggleFieldLocation(row: any): Promise<void> {
    const id = this.fieldId(row);
    const active = !this.fieldIsActive(row);
    if (!await this.alert.confirm(active ? 'Aktifkan lokasi lapangan?' : 'Nonaktifkan lokasi lapangan?', active ? 'Lokasi dapat dipilih untuk konfigurasi tipe kerja.' : 'Tipe kerja dan histori tetap aman, tetapi lokasi tidak ditawarkan untuk check-in baru.')) return;
    this.http.patch<any>(`${this.api}/field/${id}/status`, { active }, { headers: this.headers() }).pipe(timeout(15000), takeUntil(this.destroy$)).subscribe({
      next: async () => { await this.alert.success(active ? 'Lokasi lapangan diaktifkan' : 'Lokasi lapangan dinonaktifkan'); this.loadFieldLocations(); },
      error: async error => await this.alert.error('Perubahan status gagal', this.apiError(error, 'Gagal mengubah status lokasi lapangan.'))
    });
  }

  async deleteFieldLocation(row: any): Promise<void> {
    const id = this.fieldId(row);
    if (!await this.alert.confirm('Arsipkan lokasi lapangan?', 'Lokasi yang sudah dipakai histori akan tetap aman melalui soft delete.')) return;
    this.http.delete<any>(`${this.api}/field/${id}`, { headers: this.headers() }).pipe(timeout(15000), takeUntil(this.destroy$)).subscribe({
      next: async () => { await this.alert.success('Lokasi lapangan diarsipkan'); this.loadFieldLocations(); },
      error: async error => await this.alert.error('Pengarsipan gagal', this.apiError(error, 'Gagal mengarsipkan lokasi lapangan.'))
    });
  }
}
