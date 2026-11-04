import { Component, OnInit, OnDestroy, Optional } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { EmployeePreferences, ThemeService } from '../../../core/services/theme.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import * as L from 'leaflet';
import { SharedSidebarComponent } from '../../shared/shared-sidebar/shared-sidebar.component';
import { UiSkeletonComponent } from '../../../shared/ui-skeleton/ui-skeleton.component';
import { FilePreviewComponent } from '../../../shared/file-preview/file-preview.component';
import { DatePickerComponent } from '../../../shared/date-picker/date-picker.component';
import { validateProfilePhoto } from '../../../shared/profile-photo-validation';
import { Subject } from 'rxjs';
import { finalize, takeUntil, timeout } from 'rxjs/operators';
import { extractGoogleMapsCoordinates } from '../../../core/utils/google-maps';

interface WeeklyShiftRow {
  tanggal: string;
  namaShift: string;
  hariKerja: string;
  jamMulai: string;
  jamSelesai: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe, SharedSidebarComponent, UiSkeletonComponent, FilePreviewComponent, DatePickerComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit, OnDestroy {
  readonly workDayLabels: {[key: string]: string} = { '1':'Senin', '2':'Selasa', '3':'Rabu', '4':'Kamis', '5':'Jumat', '6':'Sabtu', '7':'Minggu' };
  readonly weeklyDayNumbers = [1, 2, 3, 4, 5, 6, 7];
  profileData: any = null;
  weeklyShiftRows: WeeklyShiftRow[] = [];
  isLoading = true;
  activeTab = 'profile'; // 'profile' | 'settings' | 'email' | 'security'

  updateForm = {
    nama: '',
    email: '',
    email_password: '',
    old_password: '',
    password: '',
    confirm_password: '',
    alamat_rumah: '',
    google_maps_url: ''
  };

  homeLocation: any = null;
  homeLocationRequests: any[] = [];
  homeLocationLoading = false;
  homeLocationSubmitting = false;
  homeLocationAttachment: File | null = null;
  homeLocationAttachmentName = '';
  homeLocationForm = {
    alamat_rumah: '', latitude: null as number | null, longitude: null as number | null,
    radius_meter: 100, tanggal_mulai_berlaku: '', alasan: '', google_maps_url: ''
  };

  alternativeLocations: any[] = [];
  alternativeLocationUsed = 0;
  alternativeLocationLimit = 3;
  alternativeLocationRadius = 100;
  alternativeLocationLoading = false;
  alternativeLocationSubmitting = false;
  alternativeLocationMapResolving = false;
  alternativeLocationError = '';
  alternativeLocationModalOpen = false;
  alternativeLocationDetailOpen = false;
  selectedAlternativeLocation: any = null;
  editingAlternativeLocationId: number | null = null;
  alternativeLocationForm = {
    nama_lokasi: '', deskripsi: '', latitude: null as number | null,
    longitude: null as number | null, radius_meter: 100, google_maps_url: ''
  };

  preferences: EmployeePreferences = {
    darkMode: false,
    emailNotification: true,
    inAppNotification: true
  };

  isSubmitting = false;
  isUploadingPhoto = false;
  showEmailPassword = false;
  showOldPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  selectedPhoto: File | null = null;
  photoPreviewFile: File | null = null;
  profilePhotoPreviewUrl = '';
  photoError = '';
  successMessage = '';
  errorMessage = '';
  private readonly destroy$ = new Subject<void>();
  private profileRequestId = 0;
  private homeLocationRequestId = 0;
  private alternativeLocationRequestId = 0;
  private destroyed = false;

  // Leaflet Home base map
  private map!: L.Map;
  private homeCircle!: L.Circle;
  private homeMarker!: L.Marker;
  private alternativeMap!: L.Map;
  private alternativeCircle!: L.Circle;
  private alternativeMarker!: L.CircleMarker;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private alert: AlertService,
    private themeService: ThemeService,
    @Optional() private route: ActivatedRoute | null
  ) {}

  ngOnInit(): void {
    this.loadProfile();
    this.preferences = this.themeService.getPreferences();
    this.route?.queryParamMap.subscribe(params => {
      if (params.get('tab') === 'email') {
        this.activeTab = 'email';
      }
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyMap();
    this.destroyAlternativeMap();
    if (this.profilePhotoPreviewUrl) URL.revokeObjectURL(this.profilePhotoPreviewUrl);
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    this.successMessage = '';
    this.errorMessage = '';
    if (tab === 'profile') {
      this.initHomeMap();
    }
    if (tab === 'settings' && this.profileData) {
      // Re-read the list when returning to settings so an admin decision made
      // in another session is visible without requiring a full page reload.
      this.loadAlternativeLocations();
    }
  }

  loadProfile(): void {
    const requestId = ++this.profileRequestId;
    const token = this.authService.getToken();
    if (!token) {
      this.profileData = null;
      this.isLoading = false;
      this.errorMessage = 'Sesi login tidak ditemukan. Silakan login kembali.';
      return;
    }
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    this.isLoading = true;
    this.http.get<any>('http://localhost:8080/api/v1/employee/profile', { headers }).pipe(
      timeout(15000), takeUntil(this.destroy$), finalize(() => {
        if (requestId === this.profileRequestId) this.isLoading = false;
      })
    ).subscribe({
      next: (data) => {
        if (requestId !== this.profileRequestId || this.destroyed) return;
        // Keep one profile source for every role, while accepting the direct
        // response and the common {data: ...}/{profile: ...} API envelopes.
        const profile = this.normalizeProfile(data);
        if (!profile) {
          this.errorMessage = 'Data profil belum tersedia.';
          return;
        }
        this.profileData = profile;
        this.weeklyShiftRows = this.buildWeeklyShiftRows(profile.WorkSchedules);
        this.updateForm.nama = profile.Nama || profile.nama || '';
        this.updateForm.email = profile.Email || profile.email || '';
        const employee = profile.Employee || profile.employee || {};
        const homeLoc = employee.HomeLocation || employee.home_location;
        this.updateForm.alamat_rumah = homeLoc?.AlamatRumah || homeLoc?.alamat_rumah || '';
        this.updateForm.google_maps_url = homeLoc?.GoogleMapsURL || homeLoc?.google_maps_url || '';
        this.errorMessage = '';
        this.loadHomeLocationWorkflow();
        this.loadAlternativeLocations();
        
        if (this.activeTab === 'profile') {
          this.initHomeMap();
        }
      },
      error: (error) => {
        if (requestId !== this.profileRequestId || this.destroyed) return;
        this.errorMessage = this.apiError(error, 'Gagal memuat profil.');
      }
    });
  }

  private normalizeProfile(response: any): any | null {
    let value = response?.data ?? response?.profile ?? response?.user ?? response;
    if (value?.data || value?.profile || value?.user) value = value.data ?? value.profile ?? value.user;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const employee = value.Employee ?? value.employee ?? {};
    const division = employee.Division ?? employee.division ?? {};
    const position = employee.Position ?? employee.position ?? {};
    const home = employee.HomeLocation ?? employee.home_location ?? null;
    return {
      ...value,
      Employee: { ...employee, Division: division, Position: position, HomeLocation: home },
      WorkSchedules: Array.isArray(value.WorkSchedules) ? value.WorkSchedules :
        (Array.isArray(value.work_schedules) ? value.work_schedules : []),
      Nama: value.Nama ?? value.nama ?? '',
      Email: value.Email ?? value.email ?? '',
      Role: value.Role ?? value.role ?? '',
      Status: value.Status ?? value.status ?? ''
    };
  }

  private authHeaders(): HttpHeaders {
    return new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
  }

  private apiError(error: any, fallback: string): string {
    if (error?.status === 401) return 'Sesi login telah kedaluwarsa. Silakan login kembali.';
    return error?.error?.error || error?.error?.message || error?.message || fallback;
  }

  get today(): string { return new Date().toISOString().slice(0, 10); }
  get hasPendingHomeLocationRequest(): boolean {
    return this.homeLocationRequests.some(request =>
      (request.Status || request.status) === 'Menunggu Persetujuan'
    );
  }

  formatProcessedAt(value: string | Date | null | undefined): string {
    if (!value) return '-';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';

    const parts = new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Jakarta'
    }).formatToParts(date);
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value || '';
    return `${part('day')} ${part('month')} ${part('year')} ${part('hour')}:${part('minute')}`;
  }

  private loadHomeLocationWorkflow(): void {
    const requestId = ++this.homeLocationRequestId;
    this.homeLocationLoading = true;
    this.http.get<any>('http://localhost:8080/api/v1/employee/profile/home-location', { headers: this.authHeaders() }).pipe(
      timeout(10000), takeUntil(this.destroy$), finalize(() => {
        if (requestId === this.homeLocationRequestId) this.homeLocationLoading = false;
      })
    ).subscribe({
      next: response => {
        if (requestId !== this.homeLocationRequestId || this.destroyed) return;
        this.homeLocation = response?.active || response?.data?.active || null;
        if (this.homeLocation) {
          this.homeLocationForm.alamat_rumah = this.homeLocation.AlamatRumah || this.homeLocation.alamat_rumah || '';
          this.homeLocationForm.google_maps_url = this.homeLocation.GoogleMapsURL || this.homeLocation.google_maps_url || '';
          this.homeLocationForm.latitude = Number(this.homeLocation.LatitudeRumah ?? this.homeLocation.latitude_rumah ?? 0) || null;
          this.homeLocationForm.longitude = Number(this.homeLocation.LongitudeRumah ?? this.homeLocation.longitude_rumah ?? 0) || null;
          this.homeLocationForm.radius_meter = Number(this.homeLocation.RadiusMeter ?? this.homeLocation.radius_meter ?? 100) || 100;
        } else {
          this.homeLocationForm.alamat_rumah = '';
          this.homeLocationForm.google_maps_url = '';
          this.homeLocationForm.latitude = null;
          this.homeLocationForm.longitude = null;
        }
        this.http.get<any>('http://localhost:8080/api/v1/employee/profile/home-location/requests', { headers: this.authHeaders() }).pipe(
          timeout(10000), takeUntil(this.destroy$), finalize(() => {
            if (requestId === this.homeLocationRequestId) this.homeLocationLoading = false;
          })
        ).subscribe({
          next: requests => {
            const rows = Array.isArray(requests) ? requests : requests?.data;
            this.homeLocationRequests = Array.isArray(rows) ? rows : [];
          },
          error: error => this.homeLocationError(error)
        });
      },
      error: error => this.homeLocationError(error)
    });
  }

  private homeLocationError(error: any): void {
    this.homeLocationLoading = false;
    this.errorMessage = this.apiError(error, 'Gagal memuat data lokasi WFH.');
  }

  loadAlternativeLocations(): void {
    const requestId = ++this.alternativeLocationRequestId;
    this.alternativeLocationLoading = true;
    this.alternativeLocationError = '';
    this.http.get<any>('http://localhost:8080/api/v1/employee/alternative-locations', { headers: this.authHeaders() }).pipe(
      timeout(10000), takeUntil(this.destroy$), finalize(() => {
        if (requestId === this.alternativeLocationRequestId) this.alternativeLocationLoading = false;
      })
    ).subscribe({
      next: response => {
        if (requestId !== this.alternativeLocationRequestId || this.destroyed) return;
        const rows = Array.isArray(response) ? response : response?.data;
        this.alternativeLocations = Array.isArray(rows) ? rows : [];
        this.alternativeLocationUsed = Number(response?.used ?? response?.meta?.used ?? this.alternativeLocations.length) || 0;
        this.alternativeLocationLimit = Number(response?.limit ?? response?.meta?.limit ?? 3) || 3;
        this.alternativeLocationRadius = Number(response?.radius_meter ?? 100) || 100;
      },
      error: error => {
        if (requestId !== this.alternativeLocationRequestId || this.destroyed) return;
        this.alternativeLocationError = this.apiError(error, 'Gagal memuat lokasi alternatif.');
      }
    });
  }

  alternativeLocationId(location: any): number {
    return Number(location?.id ?? location?.ID ?? 0);
  }

  alternativeLocationName(location: any): string {
    return location?.nama_lokasi ?? location?.NamaLokasi ?? '-';
  }

  alternativeLocationDescription(location: any): string {
    return location?.deskripsi ?? location?.Deskripsi ?? '-';
  }

  alternativeApprovalStatus(location: any): string {
    return String(location?.status_approval ?? location?.StatusApproval ?? location?.status ?? '').toLowerCase();
  }

  alternativeApprovalLabel(location: any): string {
    const label = location?.status_label;
    if (label) return label;
    const status = this.alternativeApprovalStatus(location);
    return status === 'approved' ? 'Disetujui' : status === 'rejected' ? 'Ditolak' : 'Menunggu persetujuan';
  }

  alternativeUsageStatus(location: any): string {
    return String(location?.status_aktif ?? location?.StatusAktif ?? '').toLowerCase();
  }

  alternativeUsageLabel(location: any): string {
    const label = location?.status_aktif_label;
    if (label) return label;
    return this.alternativeUsageStatus(location) === 'active' ? 'Aktif' : 'Nonaktif';
  }

  alternativeLocationActive(location: any): boolean {
    return this.alternativeUsageStatus(location) === 'active';
  }

  alternativeCanToggle(location: any): boolean {
    return this.alternativeApprovalStatus(location) === 'approved' && location?.can_toggle !== false;
  }

  alternativeRejectionReason(location: any): string {
    return location?.rejection_reason ?? location?.alasan_penolakan ?? location?.AlasanPenolakan ?? '';
  }

  alternativeLocationQuotaLabel(): string {
    return `${this.alternativeLocationUsed} dari ${this.alternativeLocationLimit} lokasi digunakan`;
  }

  openAlternativeLocationModal(location?: any): void {
    this.editingAlternativeLocationId = location ? this.alternativeLocationId(location) : null;
    this.alternativeLocationError = '';
    this.alternativeLocationForm = {
      nama_lokasi: location ? this.alternativeLocationName(location) : '',
      deskripsi: location ? this.alternativeLocationDescription(location) : '',
      latitude: location?.latitude == null ? null : Number(location.latitude),
      longitude: location?.longitude == null ? null : Number(location.longitude),
      radius_meter: Number(location?.radius_meter ?? location?.RadiusMeter ?? this.alternativeLocationRadius) || this.alternativeLocationRadius,
      google_maps_url: location?.google_maps_url || location?.GoogleMapsURL || ''
    };
    this.alternativeLocationModalOpen = true;
    setTimeout(() => this.initAlternativeMap(), 0);
  }

  closeAlternativeLocationModal(): void {
    this.alternativeLocationModalOpen = false;
    this.editingAlternativeLocationId = null;
    this.destroyAlternativeMap();
  }

  openAlternativeLocationDetail(location: any): void {
    this.selectedAlternativeLocation = location;
    this.alternativeLocationDetailOpen = true;
  }

  closeAlternativeLocationDetail(): void {
    this.alternativeLocationDetailOpen = false;
    this.selectedAlternativeLocation = null;
  }

  onAlternativeCoordinatesChange(): void {
    setTimeout(() => this.updateAlternativeMap(), 0);
  }

  onAlternativeGoogleMapsUrlChange(): void {
    const coordinates = extractGoogleMapsCoordinates(this.alternativeLocationForm.google_maps_url);
    this.alternativeLocationForm.latitude = coordinates?.latitude ?? null;
    this.alternativeLocationForm.longitude = coordinates?.longitude ?? null;
    this.alternativeLocationError = '';
    this.onAlternativeCoordinatesChange();
  }

  resolveAlternativeGoogleMapsUrl(): void {
    const url = this.alternativeLocationForm.google_maps_url.trim();
    if (!url || (this.alternativeLocationForm.latitude !== null && this.alternativeLocationForm.longitude !== null)) return;
    this.alternativeLocationMapResolving = true;
    this.http.get<any>('http://localhost:8080/api/v1/google-maps/resolve', {
      headers: this.authHeaders(), params: { url }
    }).pipe(timeout(12000), takeUntil(this.destroy$), finalize(() => this.alternativeLocationMapResolving = false)).subscribe({
      next: result => {
        this.alternativeLocationForm.latitude = Number(result.latitude);
        this.alternativeLocationForm.longitude = Number(result.longitude);
        this.onAlternativeCoordinatesChange();
      },
      error: error => this.alternativeLocationError = this.apiError(error, 'Link Google Maps tidak berisi koordinat yang valid.')
    });
  }

  private validateAlternativeLocationForm(): string | null {
    const form = this.alternativeLocationForm;
    if (!form.nama_lokasi.trim()) return 'Nama lokasi wajib diisi.';
    if (form.nama_lokasi.trim().length > 100) return 'Nama lokasi maksimal 100 karakter.';
    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return 'Latitude dan longitude harus berupa koordinat bumi yang valid.';
    }
    if (latitude === 0 && longitude === 0) return 'Koordinat 0,0 tidak dapat digunakan.';
    return null;
  }

  async saveAlternativeLocation(): Promise<void> {
    if (this.alternativeLocationSubmitting) return;
    this.alternativeLocationError = '';
    const validationError = this.validateAlternativeLocationForm();
    if (validationError) {
      this.alternativeLocationError = validationError;
      await this.alert.error('Data lokasi tidak valid', validationError);
      return;
    }
    if (!this.authService.getToken()) {
      this.alternativeLocationError = 'Sesi login tidak ditemukan. Silakan login kembali.';
      await this.alert.error('Sesi berakhir', this.alternativeLocationError);
      return;
    }
    if (this.alternativeLocationMapResolving) {
      this.alternativeLocationError = 'Tunggu sampai koordinat selesai dibaca dari link Google Maps.';
      await this.alert.error('Koordinat belum siap', this.alternativeLocationError);
      return;
    }
    const editing = this.editingAlternativeLocationId !== null;
    if (!await this.alert.confirm(editing ? 'Simpan perubahan lokasi?' : 'Kirim pengajuan lokasi alternatif?', 'Lokasi baru atau hasil edit akan berstatus menunggu persetujuan admin.')) return;
    const id = this.editingAlternativeLocationId;
    const url = editing ? `http://localhost:8080/api/v1/employee/alternative-locations/${id}` : 'http://localhost:8080/api/v1/employee/alternative-locations';
    const { radius_meter: _legacyRadius, ...locationForm } = this.alternativeLocationForm;
    const body = { ...locationForm, nama_lokasi: this.alternativeLocationForm.nama_lokasi.trim(), metode_validasi: 'radius' };
    this.alternativeLocationSubmitting = true;
    const request = editing
      ? this.http.put<any>(url, body, { headers: this.authHeaders() })
      : this.http.post<any>(url, body, { headers: this.authHeaders() });
    request.pipe(timeout(15000), takeUntil(this.destroy$), finalize(() => this.alternativeLocationSubmitting = false)).subscribe({
      next: () => {
        this.closeAlternativeLocationModal();
        this.successMessage = editing ? 'Lokasi alternatif berhasil diperbarui.' : 'Pengajuan lokasi alternatif berhasil dikirim.';
        this.alert.success(editing ? 'Lokasi alternatif diperbarui' : 'Pengajuan lokasi alternatif berhasil dikirim');
        this.loadAlternativeLocations();
      },
      error: async error => {
        this.alternativeLocationError = this.apiError(error, 'Gagal menyimpan lokasi alternatif.');
        await this.alert.error('Penyimpanan gagal', this.alternativeLocationError);
      }
    });
  }

  async deleteAlternativeLocation(location: any): Promise<void> {
    const id = this.alternativeLocationId(location);
    if (!id || !await this.alert.confirm('Hapus lokasi alternatif?', 'Lokasi akan diarsipkan dan histori absensi tetap aman.')) return;
    this.alternativeLocationError = '';
    this.http.delete<any>(`http://localhost:8080/api/v1/employee/alternative-locations/${id}`, { headers: this.authHeaders() }).pipe(
      timeout(15000), takeUntil(this.destroy$)
    ).subscribe({
      next: () => { this.alert.success('Lokasi alternatif dihapus'); this.loadAlternativeLocations(); },
      error: async error => {
        this.alternativeLocationError = this.apiError(error, 'Gagal menghapus lokasi alternatif.');
        await this.alert.error('Penghapusan gagal', this.alternativeLocationError);
      }
    });
  }

  async toggleAlternativeLocation(location: any): Promise<void> {
    if (!this.alternativeCanToggle(location)) {
      await this.alert.error('Lokasi belum tersedia', 'Lokasi pending atau ditolak belum dapat digunakan untuk check-in.');
      return;
    }
    const id = this.alternativeLocationId(location);
    const active = !this.alternativeLocationActive(location);
    if (!await this.alert.confirm(active ? 'Aktifkan lokasi alternatif?' : 'Nonaktifkan lokasi alternatif?', active ? 'Lokasi approved akan tersedia untuk check-in.' : 'Lokasi tidak akan ditawarkan untuk check-in baru.')) return;
    this.http.patch<any>(`http://localhost:8080/api/v1/employee/alternative-locations/${id}/status`, { active }, { headers: this.authHeaders() }).pipe(
      timeout(15000), takeUntil(this.destroy$)
    ).subscribe({
      next: () => { this.alert.success(active ? 'Lokasi diaktifkan' : 'Lokasi dinonaktifkan'); this.loadAlternativeLocations(); },
      error: async error => {
        this.alternativeLocationError = this.apiError(error, 'Gagal mengubah status lokasi alternatif.');
        await this.alert.error('Perubahan status gagal', this.alternativeLocationError);
      }
    });
  }

  initAlternativeMap(): void {
    const container = document.getElementById('profile-alternative-map');
    if (!container || this.destroyed || !this.alternativeLocationModalOpen) return;
    this.destroyAlternativeMap();
    const latitude = Number(this.alternativeLocationForm.latitude);
    const longitude = Number(this.alternativeLocationForm.longitude);
    const centerLat = Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 && latitude !== 0 ? latitude : -6.1202471;
    const centerLng = Number.isFinite(longitude) && longitude >= -180 && longitude <= 180 && longitude !== 0 ? longitude : 106.7118952;
    try {
      this.alternativeMap = L.map(container).setView([centerLat, centerLng], 16);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(this.alternativeMap);
      this.alternativeMap.on('click', event => {
        this.alternativeLocationForm.latitude = Number(event.latlng.lat.toFixed(7));
        this.alternativeLocationForm.longitude = Number(event.latlng.lng.toFixed(7));
        this.updateAlternativeMap();
      });
      this.updateAlternativeMap();
    } catch {
      this.destroyAlternativeMap();
      this.alternativeLocationError = 'Peta lokasi tidak dapat dimuat. Koordinat tetap dapat diisi manual.';
    }
  }

  private updateAlternativeMap(): void {
    if (!this.alternativeMap) return;
    this.alternativeCircle?.remove();
    this.alternativeMarker?.remove();
    const latitude = Number(this.alternativeLocationForm.latitude);
    const longitude = Number(this.alternativeLocationForm.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 || (latitude === 0 && longitude === 0)) return;
    const point: L.LatLngExpression = [latitude, longitude];
    this.alternativeMap.setView(point, 16);
    this.alternativeCircle = L.circle(point, { color: '#3B82F6', fillColor: '#3B82F6', fillOpacity: 0.15, weight: 2, radius: this.alternativeLocationRadius }).addTo(this.alternativeMap);
    this.alternativeMarker = L.circleMarker(point, { radius: 7, color: '#2563EB', fillColor: '#3B82F6', fillOpacity: 1 }).addTo(this.alternativeMap);
  }

  private destroyAlternativeMap(): void {
    try {
      this.alternativeCircle?.remove();
      this.alternativeMarker?.remove();
      this.alternativeMap?.off();
      this.alternativeMap?.remove();
    } catch { /* Leaflet may already have removed the modal container. */ }
    this.alternativeCircle = undefined as any;
    this.alternativeMarker = undefined as any;
    this.alternativeMap = undefined as any;
  }

  onHomeLocationAttachment(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      this.errorMessage = 'Lampiran maksimal 5 MB.';
      (event.target as HTMLInputElement).value = '';
      return;
    }
    this.homeLocationAttachment = file;
    this.homeLocationAttachmentName = file.name;
  }

  onGoogleMapsUrlChange(): void {
    const url = this.homeLocationForm.google_maps_url.trim();
    // Supports the coordinate formats commonly present in Google Maps URLs.
    const match = url.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/) ||
      url.match(/[?&](?:q|ll)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/) ||
      url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
    if (match) {
      this.homeLocationForm.latitude = Number(match[1]);
      this.homeLocationForm.longitude = Number(match[2]);
      return;
    }

    // A short maps.app.goo.gl URL has no coordinates until its redirect is
    // followed by the backend. Clear old coordinates so changing the link can
    // never submit the previous employee location by accident.
    this.homeLocationForm.latitude = null;
    this.homeLocationForm.longitude = null;
  }

  retryProfile(): void {
    this.errorMessage = '';
    this.loadProfile();
  }

  private destroyMap(): void {
    try {
      this.homeCircle?.remove();
      this.homeMarker?.remove();
      this.map?.off();
      this.map?.remove();
    } catch { /* Leaflet may already have removed the container during teardown. */ }
    this.homeCircle = undefined as any;
    this.homeMarker = undefined as any;
    this.map = undefined as any;
  }

  resolveGoogleMapsUrl(): void {
    const url = this.homeLocationForm.google_maps_url.trim();
    if (!url || this.homeLocationForm.latitude !== null || this.homeLocationForm.longitude !== null) return;
    this.http.get<any>('http://localhost:8080/api/v1/google-maps/resolve', {
      headers: this.authHeaders(), params: { url }
    }).pipe(timeout(10000), takeUntil(this.destroy$)).subscribe({
      next: result => {
        this.homeLocationForm.latitude = Number(result.latitude);
        this.homeLocationForm.longitude = Number(result.longitude);
      },
      error: error => this.errorMessage = this.apiError(error, 'Link Google Maps tidak berisi koordinat yang valid.')
    });
  }

  async submitHomeLocationRequest(): Promise<void> {
    if (this.homeLocationSubmitting) return;
    const f = this.homeLocationForm;
    this.errorMessage = '';
    if (!this.authService.getToken()) {
      this.errorMessage = 'Sesi login tidak ditemukan. Silakan login kembali.';
      await this.alert.error('Sesi berakhir', this.errorMessage);
      return;
    }
    if (!f.alamat_rumah.trim() || !f.tanggal_mulai_berlaku || !f.alasan.trim()) {
      await this.alert.error('Data belum lengkap', 'Lengkapi alamat WFH, tanggal mulai berlaku, dan alasan perubahan.'); return;
    }
    // A short Google Maps link can be resolved by the backend. Send 0/0 as
    // the explicit marker when the browser cannot extract coordinates.
    const latitude = f.latitude ?? 0;
    const longitude = f.longitude ?? 0;
    if (latitude !== 0 || longitude !== 0) {
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        await this.alert.error('Koordinat tidak valid', 'Periksa kembali latitude dan longitude lokasi WFH.'); return;
      }
    } else if (!f.google_maps_url.trim()) {
      await this.alert.error('Koordinat tidak valid', 'Masukkan koordinat atau link Google Maps yang valid.'); return;
    }
    if (f.tanggal_mulai_berlaku < this.today) {
      await this.alert.error('Data lokasi tidak valid', 'Tanggal mulai berlaku tidak boleh lampau. Radius ditentukan oleh admin.'); return;
    }
    if (this.homeLocationRequests.some(request => request.Status === 'Menunggu Persetujuan')) {
      await this.alert.error('Pengajuan masih diproses', 'Masih ada pengajuan lokasi WFH yang menunggu persetujuan admin.'); return;
    }
    if (!await this.alert.confirm('Kirim pengajuan lokasi WFH?', 'Perubahan tidak langsung aktif dan menunggu persetujuan admin.')) return;

    const body = new FormData();
    const oldLocation = this.homeLocation || {};
    // Include the complete API payload for audit/debug compatibility. The
    // backend still derives user_id and old_* from the JWT/database and never
    // trusts these client-provided values for authorization or history.
    const { radius_meter: _legacyRadius, ...homeForm } = f;
    Object.entries({
      ...homeForm,
      latitude,
      longitude,
      user_id: this.profileData?.ID || this.profileData?.id || '',
      old_alamat_rumah: oldLocation.AlamatRumah || oldLocation.alamat_rumah || '',
      old_latitude: oldLocation.LatitudeRumah ?? oldLocation.latitude_rumah ?? 0,
      old_longitude: oldLocation.LongitudeRumah ?? oldLocation.longitude_rumah ?? 0,
      old_radius_meter: oldLocation.RadiusMeter ?? oldLocation.radius_meter ?? 0,
      old_google_maps_url: oldLocation.GoogleMapsURL || oldLocation.google_maps_url || ''
    }).forEach(([key, value]) => body.append(key, String(value ?? '')));
    if (this.homeLocationAttachment) body.append('lampiran', this.homeLocationAttachment, this.homeLocationAttachment.name);
    this.homeLocationSubmitting = true;
    this.http.post<any>('http://localhost:8080/api/v1/employee/profile/home-location/requests', body, { headers: this.authHeaders() }).pipe(
      timeout(20000), takeUntil(this.destroy$), finalize(() => this.homeLocationSubmitting = false)
    ).subscribe({
      next: () => {
        this.successMessage = 'Pengajuan perubahan lokasi WFH berhasil dikirim dan menunggu persetujuan admin.';
        this.homeLocationForm = { ...this.homeLocationForm, alamat_rumah: '', latitude: null, longitude: null, alasan: '', google_maps_url: '' };
        this.homeLocationAttachment = null; this.homeLocationAttachmentName = '';
        this.loadHomeLocationWorkflow(); this.alert.success('Pengajuan lokasi WFH berhasil dikirim');
      },
      error: async error => {
        this.errorMessage = this.apiError(error, 'Gagal mengirim pengajuan lokasi WFH.');
        await this.alert.error('Pengajuan gagal', this.apiError(error, 'Gagal mengirim pengajuan lokasi WFH.'));
      }
    });
  }

  getWorkDaysLabel(value: any): string {
    let days: any[] = [];
    try { days = Array.isArray(value) ? value : JSON.parse(value || '[1,2,3,4,5,6]'); } catch { days = [1,2,3,4,5,6]; }
    return (days.length ? days : [1,2,3,4,5,6]).map(day => this.workDayLabels[String(day)]).filter(Boolean).join(', ');
  }

  private buildWeeklyShiftRows(schedules: any[]): WeeklyShiftRow[] {
    const scheduleByDay = new Map<number, any>();
    for (const schedule of Array.isArray(schedules) ? schedules : []) {
      for (const day of this.parseWorkDays(schedule?.HariKerja ?? schedule?.hari_kerja ?? schedule?.work_days)) {
        // The API normally sends one row per day. Keeping the first row also
        // makes this work with older responses that still contain a combined
        // Monday-Saturday schedule.
        if (!scheduleByDay.has(day)) scheduleByDay.set(day, schedule);
      }
    }

    return this.weeklyDayNumbers.map((day, index) => {
      const schedule = scheduleByDay.get(day);
      const date = this.weekDate(index);
      return {
        tanggal: this.formatIndonesianDate(date),
        namaShift: schedule ? (schedule.shift_name || schedule.NamaShift || schedule.nama_shift || '-') : '-',
        hariKerja: this.workDayLabels[String(day)],
        jamMulai: schedule?.start_time || schedule?.JamMulai || schedule?.jam_mulai ? this.formatScheduleTime(schedule.start_time ?? schedule.JamMulai ?? schedule.jam_mulai) : '-',
        jamSelesai: schedule?.end_time || schedule?.JamSelesai || schedule?.jam_selesai ? this.formatScheduleTime(schedule.end_time ?? schedule.JamSelesai ?? schedule.jam_selesai) : '-'
      };
    });
  }

  private parseWorkDays(value: any): number[] {
    let parsed: any = value;
    if (typeof value === 'string') {
      if (!value.trim()) return [1, 2, 3, 4, 5, 6];
      try { parsed = JSON.parse(value); } catch { return [1, 2, 3, 4, 5, 6]; }
    }
    if (!Array.isArray(parsed)) return [1, 2, 3, 4, 5, 6];
    return parsed.map(day => Number(day)).filter(day => this.weeklyDayNumbers.includes(day));
  }

  private weekDate(dayOffset: number): Date {
    const todayParts = new Intl.DateTimeFormat('en-CA', {
      day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Jakarta'
    }).formatToParts(new Date());
    const part = (type: Intl.DateTimeFormatPartTypes) => Number(todayParts.find(item => item.type === type)?.value);
    const today = new Date(Date.UTC(part('year'), part('month') - 1, part('day')));
    const isoWeekday = today.getUTCDay() || 7;
    today.setUTCDate(today.getUTCDate() - isoWeekday + 1 + dayOffset);
    return today;
  }

  private formatIndonesianDate(date: Date): string {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta'
    }).format(date);
  }

  private formatScheduleTime(value: any): string {
    const time = String(value ?? '');
    return time ? time.slice(0, 5) : '-';
  }

  scheduleSourceLabel(): string {
    const source = String(this.profileData?.effective_schedule?.source || '').toLowerCase();
    if (source === 'employee_specific') return 'Jadwal khusus karyawan';
    if (source === 'global_schedule') return 'Jadwal khusus global';
    if (source === 'employee_assignment') return 'Assignment shift dasar';
    if (source === 'regular_default') return 'Jadwal Reguler dari Pengaturan Umum';
    return source === 'system_fallback' ? 'Fallback sistem' : '-';
  }

  initHomeMap(): void {
    setTimeout(() => {
      if (this.destroyed || !this.profileData || !this.profileData.Employee) return;
      const home = this.profileData.Employee.HomeLocation || {};
      const hLat = Number(home?.LatitudeRumah ?? home?.latitude_rumah ?? this.profileData.Employee.HomeLatitude ?? 0);
      const hLng = Number(home?.LongitudeRumah ?? home?.longitude_rumah ?? this.profileData.Employee.HomeLongitude ?? 0);
      const homeRadius = Number(home?.RadiusMeter ?? home?.radius_meter ?? 100);
      
      const mapContainer = document.getElementById('profile-home-map');
      if (!mapContainer) return;

      this.destroyMap();

      // Default to office location or a general center if home is not set
      const centerLat = hLat !== 0 ? hLat : -6.1202471;
      const centerLng = hLng !== 0 ? hLng : 106.7118952;

      try {
        this.map = L.map(mapContainer).setView([centerLat, centerLng], 16);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(this.map);

      if (hLat !== 0 && hLng !== 0) {
        const bluePinSvg = `
          <svg width="30" height="42" viewBox="0 0 30 42" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 0C6.71573 0 0 6.71573 0 15C0 26.25 15 42 15 42C15 42 30 26.25 30 15C30 6.71573 23.2843 0 15 0ZM15 20.5C11.9624 20.5 9.5 18.0376 9.5 15C9.5 11.9624 11.9624 9.5 15 9.5C18.0376 9.5 20.5 11.9624 20.5 15C20.5 18.0376 18.0376 20.5 15 20.5Z" fill="#3B82F6"/>
          </svg>
        `;
        const blueIcon = L.divIcon({
          html: bluePinSvg,
          className: 'custom-pin-icon-blue',
          iconSize: [30, 42],
          iconAnchor: [15, 42],
          popupAnchor: [0, -40]
        });

        this.homeCircle = L.circle([hLat, hLng], {
          color: '#3B82F6',
          fillColor: '#3B82F6',
          fillOpacity: 0.15,
          weight: 2,
          radius: homeRadius
        }).addTo(this.map);

        this.homeMarker = L.marker([hLat, hLng], { icon: blueIcon })
          .addTo(this.map)
          .bindPopup(`Geofence Radius Rumah Anda (${homeRadius} Meter)`);
      }
      } catch {
        this.destroyMap();
        this.errorMessage = 'Peta lokasi tidak dapat dimuat, tetapi data profil tetap tersedia.';
      }
    }, 100);
  }

  async updateProfile(): Promise<void> {
    if (this.isSubmitting) return;
    this.successMessage = '';
    this.errorMessage = '';

    if (!await this.alert.confirm('Simpan perubahan profil?', 'Data profil umum akan diperbarui. Perubahan lokasi WFH diajukan melalui form Lokasi WFH.')) return;

    this.isSubmitting = true;

    const payload = { nama: this.updateForm.nama };

    const token = this.authService.getToken();
    if (!token) {
      this.errorMessage = 'Sesi login tidak ditemukan. Silakan login kembali.';
      this.isSubmitting = false;
      return;
    }
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.put<any>('http://localhost:8080/api/v1/employee/profile', payload, { headers }).pipe(
      timeout(15000), takeUntil(this.destroy$), finalize(() => this.isSubmitting = false)
    ).subscribe({
      next: (res) => {
        this.successMessage = 'Profil berhasil diperbarui.';
        localStorage.setItem('name', payload.nama);
        this.profileData.Nama = payload.nama;
        this.alert.success('Profil berhasil diperbarui');
        this.loadProfile();
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Gagal memperbarui profil.';
        this.alert.error('Gagal memperbarui profil', this.errorMessage);
      }
    });
  }

  async updatePassword(): Promise<void> {
    if (this.isSubmitting) return;

    if (!this.updateForm.old_password || !this.updateForm.password || !this.updateForm.confirm_password) {
      this.errorMessage = 'Semua field password harus diisi.';
      return;
    }

    if (this.updateForm.password !== this.updateForm.confirm_password) {
      this.errorMessage = 'Password baru dan konfirmasi tidak cocok.';
      return;
    }

    if (!await this.alert.confirm('Ubah password?', 'Anda akan menyimpan password baru untuk akun ini.')) return;

    this.isSubmitting = true;

    const payload = {
      nama: this.updateForm.nama,
      old_password: this.updateForm.old_password,
      password: this.updateForm.password
    };

    const token = this.authService.getToken();
    if (!token) { this.isSubmitting = false; this.errorMessage = 'Sesi login tidak ditemukan. Silakan login kembali.'; return; }
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.put<any>('http://localhost:8080/api/v1/employee/profile', payload, { headers }).pipe(
      timeout(15000), takeUntil(this.destroy$), finalize(() => this.isSubmitting = false)
    ).subscribe({
      next: (res) => {
        this.successMessage = 'Password berhasil diubah.';
        this.updateForm.old_password = '';
        this.updateForm.password = '';
        this.updateForm.confirm_password = '';
        this.showOldPassword = false;
        this.showNewPassword = false;
        this.showConfirmPassword = false;
        this.alert.success('Password berhasil diubah');
      },
      error: (err) => {
        this.errorMessage = err.error?.code === 'invalid_current_password'
          ? 'Password lama tidak sesuai.'
          : err.error?.error || 'Gagal mengubah password. Pastikan password lama benar.';
        this.alert.error('Gagal mengubah password', this.errorMessage);
      }
    });
  }

  async onProfilePhotoSelected(event: Event | File[]): Promise<void> {
    const input = Array.isArray(event) ? null : event.target as HTMLInputElement;
    const file = Array.isArray(event) ? event[0] : input?.files?.[0];
    this.photoError = '';

    if (!file) {
      this.photoPreviewFile = null;
      this.selectedPhoto = null;
      this.profilePhotoPreviewUrl = '';
      return;
    }

    // Keep the selected file in the picker preview even while its dimensions
    // are being checked. Only selectedPhoto may be uploaded after validation.
    this.photoPreviewFile = file;
    if (this.profilePhotoPreviewUrl) {
      URL.revokeObjectURL(this.profilePhotoPreviewUrl);
      this.profilePhotoPreviewUrl = '';
    }
    const validationError = await validateProfilePhoto(file);
    if (validationError) {
      this.photoError = validationError;
      this.selectedPhoto = null;
      this.profilePhotoPreviewUrl = '';
      if (input) input.value = '';
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    if (this.profilePhotoPreviewUrl) URL.revokeObjectURL(this.profilePhotoPreviewUrl);
    this.selectedPhoto = file;
    this.profilePhotoPreviewUrl = previewUrl;
  }

  async uploadProfilePhoto(): Promise<void> {
    if (!this.selectedPhoto || this.isUploadingPhoto) return;
    if (!await this.alert.confirm('Simpan pas foto?', 'Gunakan foto portrait 3:4 dengan background merah dan pakaian rapi.')) return;

    this.isUploadingPhoto = true;
    this.photoError = '';
    const formData = new FormData();
    formData.append('foto', this.selectedPhoto, this.selectedPhoto.name);
    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.post<any>('http://localhost:8080/api/v1/employee/profile/photo', formData, { headers }).pipe(
      timeout(20000), takeUntil(this.destroy$), finalize(() => this.isUploadingPhoto = false)
    ).subscribe({
      next: (res) => {
        if (this.profilePhotoPreviewUrl) URL.revokeObjectURL(this.profilePhotoPreviewUrl);
        if (this.profileData?.Employee && res?.foto_profil_url) {
          this.profileData.Employee.FotoProfilURL = res.foto_profil_url;
        }
        this.selectedPhoto = null;
        this.photoPreviewFile = null;
        this.profilePhotoPreviewUrl = '';
        this.successMessage = 'Pas foto berhasil diperbarui.';
        this.alert.success('Pas foto berhasil diperbarui');
      },
      error: (err) => {
        this.photoError = err.error?.error || 'Gagal mengunggah pas foto.';
        this.alert.error('Gagal mengunggah pas foto', this.photoError);
      }
    });
  }

  async updateEmail(): Promise<void> {
    if (this.isSubmitting) return;
    this.successMessage = '';
    this.errorMessage = '';

    const email = this.updateForm.email.trim().toLowerCase();
    if (!email) {
      this.errorMessage = 'Email wajib diisi.';
      return;
    }

    if (email === String(this.profileData?.Email || '').toLowerCase()) {
      this.errorMessage = 'Email baru sama dengan email saat ini.';
      return;
    }

    if (!this.updateForm.email_password) {
      this.errorMessage = 'Password saat ini wajib diisi untuk mengganti email.';
      return;
    }

    if (!await this.alert.confirm('Ganti alamat email?', 'Email baru akan digunakan untuk login berikutnya.')) return;

    this.isSubmitting = true;
    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.put<any>('http://localhost:8080/api/v1/employee/email', {
      email,
      current_password: this.updateForm.email_password
    }, { headers }).pipe(
      timeout(15000), takeUntil(this.destroy$), finalize(() => this.isSubmitting = false)
    ).subscribe({
      next: (res) => {
        this.profileData.Email = res?.Email || res?.email || email;
        this.updateForm.email = this.profileData.Email;
        this.updateForm.email_password = '';
        this.successMessage = 'Alamat email berhasil diganti.';
        this.alert.success('Email berhasil diganti');
        this.loadProfile();
      },
      error: (err) => {
        this.errorMessage = err.error?.code === 'invalid_current_password'
          ? 'Password lama tidak sesuai.'
          : err.error?.error || 'Gagal mengganti alamat email.';
        this.alert.error('Gagal mengganti email', this.errorMessage);
      }
    });
  }

  toggleEmailPasswordVisibility(): void {
    this.showEmailPassword = !this.showEmailPassword;
  }

  toggleOldPasswordVisibility(): void {
    this.showOldPassword = !this.showOldPassword;
  }

  toggleNewPasswordVisibility(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  async savePreferences(): Promise<void> {
    this.successMessage = '';
    this.errorMessage = '';

    if (!await this.alert.confirm('Simpan preferensi?', 'Pengaturan tampilan dan notifikasi akan diperbarui.')) return;
    
    this.themeService.savePreferences(this.preferences);
    
    this.successMessage = 'Pengaturan preferensi berhasil disimpan.';
    this.alert.success('Preferensi berhasil disimpan');
  }
}
