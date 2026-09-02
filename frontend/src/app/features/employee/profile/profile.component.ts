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
import { validateProfilePhoto } from '../../../shared/profile-photo-validation';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe, SharedSidebarComponent, UiSkeletonComponent, FilePreviewComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit, OnDestroy {
  readonly workDayLabels: {[key: string]: string} = { '1':'Senin', '2':'Selasa', '3':'Rabu', '4':'Kamis', '5':'Jumat', '6':'Sabtu', '7':'Minggu' };
  profileData: any = null;
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

  preferences: EmployeePreferences = {
    darkMode: false,
    emailNotification: true,
    inAppNotification: true
  };

  isSubmitting = false;
  isUploadingPhoto = false;
  selectedPhoto: File | null = null;
  photoPreviewFile: File | null = null;
  profilePhotoPreviewUrl = '';
  photoError = '';
  successMessage = '';
  errorMessage = '';

  // Leaflet Home base map
  private map!: L.Map;
  private homeCircle!: L.Circle;
  private homeMarker!: L.Marker;

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
    if (this.map) {
      this.map.remove();
    }
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    this.successMessage = '';
    this.errorMessage = '';
    if (tab === 'profile') {
      this.initHomeMap();
    }
  }

  loadProfile(): void {
    const token = this.authService.getToken();
    if (!token) {
      this.profileData = null;
      this.isLoading = false;
      this.errorMessage = 'Sesi login tidak ditemukan. Silakan login kembali.';
      return;
    }
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    this.http.get<any>('http://localhost:8080/api/v1/employee/profile', { headers }).subscribe({
      next: (data) => {
        // Keep one profile source for every role, while accepting the direct
        // response and the common {data: ...}/{profile: ...} API envelopes.
        const profile = data?.data || data?.profile || data?.user || data || null;
        this.profileData = profile;
        if (!profile) {
          this.isLoading = false;
          this.errorMessage = 'Data profil belum tersedia.';
          return;
        }
        // Normalize the alternate response key once so all roles use the same
        // profile source in the template and map.
        if (!this.profileData.Employee && this.profileData.employee) {
          this.profileData.Employee = this.profileData.employee;
        }
        this.profileData.WorkSchedules = profile.WorkSchedules || profile.work_schedules || [];
        this.updateForm.nama = profile.Nama || profile.nama || '';
        this.updateForm.email = profile.Email || profile.email || '';
        const employee = profile.Employee || profile.employee || {};
        const homeLoc = employee.HomeLocation || employee.home_location;
        this.updateForm.alamat_rumah = homeLoc?.AlamatRumah || homeLoc?.alamat_rumah || '';
        this.updateForm.google_maps_url = homeLoc?.GoogleMapsURL || homeLoc?.google_maps_url || '';
        this.errorMessage = '';
        this.isLoading = false;
        this.loadHomeLocationWorkflow();
        
        if (this.activeTab === 'profile') {
          this.initHomeMap();
        }
      },
      error: (error) => {
        this.errorMessage = this.apiError(error, 'Gagal memuat profil.');
        this.isLoading = false;
      }
    });
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

  private loadHomeLocationWorkflow(): void {
    this.homeLocationLoading = true;
    this.http.get<any>('http://localhost:8080/api/v1/employee/profile/home-location', { headers: this.authHeaders() }).subscribe({
      next: response => {
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
        this.http.get<any>('http://localhost:8080/api/v1/employee/profile/home-location/requests', { headers: this.authHeaders() }).subscribe({
          next: requests => {
            const rows = Array.isArray(requests) ? requests : requests?.data;
            this.homeLocationRequests = Array.isArray(rows) ? rows : [];
            this.homeLocationLoading = false;
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

  resolveGoogleMapsUrl(): void {
    const url = this.homeLocationForm.google_maps_url.trim();
    if (!url || this.homeLocationForm.latitude !== null || this.homeLocationForm.longitude !== null) return;
    this.http.get<any>('http://localhost:8080/api/v1/google-maps/resolve', {
      headers: this.authHeaders(), params: { url }
    }).subscribe({
      next: result => {
        this.homeLocationForm.latitude = Number(result.latitude);
        this.homeLocationForm.longitude = Number(result.longitude);
      },
      error: error => this.errorMessage = this.apiError(error, 'Link Google Maps tidak berisi koordinat yang valid.')
    });
  }

  async submitHomeLocationRequest(): Promise<void> {
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
    if (f.radius_meter < 1 || f.radius_meter > 10000 || f.tanggal_mulai_berlaku < this.today) {
      await this.alert.error('Data lokasi tidak valid', 'Radius harus 1–10.000 meter dan tanggal mulai berlaku tidak boleh lampau.'); return;
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
    Object.entries({
      ...f,
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
    this.http.post<any>('http://localhost:8080/api/v1/employee/profile/home-location/requests', body, { headers: this.authHeaders() }).subscribe({
      next: () => {
        this.homeLocationSubmitting = false;
        this.successMessage = 'Pengajuan perubahan lokasi WFH berhasil dikirim dan menunggu persetujuan admin.';
        this.homeLocationForm = { ...this.homeLocationForm, alamat_rumah: '', latitude: null, longitude: null, alasan: '', google_maps_url: '' };
        this.homeLocationAttachment = null; this.homeLocationAttachmentName = '';
        this.loadHomeLocationWorkflow(); this.alert.success('Pengajuan lokasi WFH berhasil dikirim');
      },
      error: async error => {
        this.homeLocationSubmitting = false;
        await this.alert.error('Pengajuan gagal', this.apiError(error, 'Gagal mengirim pengajuan lokasi WFH.'));
      }
    });
  }

  getWorkDaysLabel(value: any): string {
    let days: any[] = [];
    try { days = Array.isArray(value) ? value : JSON.parse(value || '[1,2,3,4,5,6]'); } catch { days = [1,2,3,4,5,6]; }
    return (days.length ? days : [1,2,3,4,5,6]).map(day => this.workDayLabels[String(day)]).filter(Boolean).join(', ');
  }

  initHomeMap(): void {
    setTimeout(() => {
      if (!this.profileData || !this.profileData.Employee) return;
      const home = this.profileData.Employee.HomeLocation || this.profileData.Employee.home_location;
      const hLat = Number(home?.LatitudeRumah ?? home?.latitude_rumah ?? this.profileData.Employee.HomeLatitude ?? 0);
      const hLng = Number(home?.LongitudeRumah ?? home?.longitude_rumah ?? this.profileData.Employee.HomeLongitude ?? 0);
      const homeRadius = Number(home?.RadiusMeter ?? home?.radius_meter ?? 100);
      
      const mapContainer = document.getElementById('profile-home-map');
      if (!mapContainer) return;

      if (this.map) {
        this.map.remove();
      }

      // Default to office location or a general center if home is not set
      const centerLat = hLat !== 0 ? hLat : -6.1202471;
      const centerLng = hLng !== 0 ? hLng : 106.7118952;

      this.map = L.map('profile-home-map').setView([centerLat, centerLng], 16);
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
    }, 100);
  }

  async updateProfile(): Promise<void> {
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

    this.http.put<any>('http://localhost:8080/api/v1/employee/profile', payload, { headers }).subscribe({
      next: (res) => {
        this.successMessage = 'Profil berhasil diperbarui.';
        localStorage.setItem('name', payload.nama);
        this.profileData.Nama = payload.nama;
        this.isSubmitting = false;
        this.alert.success('Profil berhasil diperbarui');
        this.loadProfile();
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Gagal memperbarui profil.';
        this.isSubmitting = false;
        this.alert.error('Gagal memperbarui profil', this.errorMessage);
      }
    });
  }

  async updatePassword(): Promise<void> {

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
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.put<any>('http://localhost:8080/api/v1/employee/profile', payload, { headers }).subscribe({
      next: (res) => {
        this.successMessage = 'Password berhasil diubah.';
        this.updateForm.old_password = '';
        this.updateForm.password = '';
        this.updateForm.confirm_password = '';
        this.isSubmitting = false;
        this.alert.success('Password berhasil diubah');
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Gagal mengubah password. Pastikan password lama benar.';
        this.isSubmitting = false;
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

    this.http.post<any>('http://localhost:8080/api/v1/employee/profile/photo', formData, { headers }).subscribe({
      next: (res) => {
        if (this.profilePhotoPreviewUrl) URL.revokeObjectURL(this.profilePhotoPreviewUrl);
        if (this.profileData.Employee) {
          this.profileData.Employee.FotoProfilURL = res.foto_profil_url;
        }
        this.selectedPhoto = null;
        this.photoPreviewFile = null;
        this.profilePhotoPreviewUrl = '';
        this.isUploadingPhoto = false;
        this.successMessage = 'Pas foto berhasil diperbarui.';
        this.alert.success('Pas foto berhasil diperbarui');
      },
      error: (err) => {
        this.isUploadingPhoto = false;
        this.photoError = err.error?.error || 'Gagal mengunggah pas foto.';
        this.alert.error('Gagal mengunggah pas foto', this.photoError);
      }
    });
  }

  async updateEmail(): Promise<void> {
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
    }, { headers }).subscribe({
      next: (res) => {
        this.profileData.Email = res.Email || email;
        this.updateForm.email = this.profileData.Email;
        this.updateForm.email_password = '';
        this.isSubmitting = false;
        this.successMessage = 'Alamat email berhasil diganti.';
        this.alert.success('Email berhasil diganti');
        this.loadProfile();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err.error?.error || 'Gagal mengganti alamat email.';
        this.alert.error('Gagal mengganti email', this.errorMessage);
      }
    });
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
