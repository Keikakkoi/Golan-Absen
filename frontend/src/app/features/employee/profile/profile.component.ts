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
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    this.http.get<any>('http://localhost:8080/api/v1/employee/profile', { headers }).subscribe({
      next: (data) => {
        this.profileData = data;
        if (this.profileData) {
          this.profileData.WorkSchedules = data.WorkSchedules || data.work_schedules || [];
        }
        this.updateForm.nama = data.Nama;
        this.updateForm.email = data.Email;
        const homeLoc = data.Employee?.HomeLocation || data.Employee?.home_location;
        this.updateForm.alamat_rumah = homeLoc?.AlamatRumah || homeLoc?.alamat_rumah || '';
        this.updateForm.google_maps_url = homeLoc?.GoogleMapsURL || homeLoc?.google_maps_url || '';
        this.isLoading = false;
        
        if (this.activeTab === 'profile') {
          this.initHomeMap();
        }
      },
      error: () => {
        this.errorMessage = 'Gagal memuat profil.';
        this.isLoading = false;
      }
    });
  }

  initHomeMap(): void {
    setTimeout(() => {
      if (!this.profileData || !this.profileData.Employee) return;
      const hLat = this.profileData.Employee.HomeLatitude;
      const hLng = this.profileData.Employee.HomeLongitude;
      
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
          radius: 100
        }).addTo(this.map);

        this.homeMarker = L.marker([hLat, hLng], { icon: blueIcon })
          .addTo(this.map)
          .bindPopup('Geofence Radius Rumah Anda (100 Meter)');
      }
    }, 100);
  }

  async updateProfile(): Promise<void> {
    this.successMessage = '';
    this.errorMessage = '';

    if (!await this.alert.confirm('Simpan perubahan profil?', 'Data nama dan alamat rumah profil akan diperbarui.')) return;

    this.isSubmitting = true;

    const payload = {
      nama: this.updateForm.nama,
      alamat_rumah: this.updateForm.alamat_rumah,
      google_maps_url: this.updateForm.google_maps_url
    };

    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.put<any>('http://localhost:8080/api/v1/employee/profile', payload, { headers }).subscribe({
      next: (res) => {
        this.successMessage = 'Profil berhasil diperbarui.';
        localStorage.setItem('name', payload.nama);
        this.profileData.Nama = payload.nama;
        if (this.profileData.Employee) {
          if (!this.profileData.Employee.HomeLocation) {
            this.profileData.Employee.HomeLocation = {};
          }
          this.profileData.Employee.HomeLocation.AlamatRumah = payload.alamat_rumah;
          this.profileData.Employee.HomeLocation.GoogleMapsURL = payload.google_maps_url;
        }
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
