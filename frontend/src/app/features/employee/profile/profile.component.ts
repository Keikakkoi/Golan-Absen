import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { RouterLink } from '@angular/router';
import * as L from 'leaflet';
import { SharedSidebarComponent } from '../../shared/shared-sidebar/shared-sidebar.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe, SharedSidebarComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit, OnDestroy {
  profileData: any = null;
  isLoading = true;
  activeTab = 'profile'; // 'profile' | 'settings' | 'security'

  updateForm = {
    nama: '',
    old_password: '',
    password: '',
    confirm_password: ''
  };

  preferences = {
    darkMode: false,
    emailNotification: true,
    inAppNotification: true
  };

  isSubmitting = false;
  successMessage = '';
  errorMessage = '';

  // Leaflet Home base map
  private map!: L.Map;
  private homeCircle!: L.Circle;
  private homeMarker!: L.Marker;

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit(): void {
    this.loadProfile();
    // Load local preferences if any
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      this.preferences.darkMode = true;
    }
    const savedPreferences = localStorage.getItem('employee_preferences');
    if (savedPreferences) {
      try {
        this.preferences = { ...this.preferences, ...JSON.parse(savedPreferences) };
      } catch {
        localStorage.removeItem('employee_preferences');
      }
    }
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
        this.updateForm.nama = data.Nama;
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

  updateProfile(): void {
    this.successMessage = '';
    this.errorMessage = '';

    this.isSubmitting = true;

    const payload = {
      nama: this.updateForm.nama
    };

    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.put<any>('http://localhost:8080/api/v1/employee/profile', payload, { headers }).subscribe({
      next: (res) => {
        this.successMessage = 'Nama profil berhasil diperbarui.';
        localStorage.setItem('name', payload.nama);
        this.profileData.Nama = payload.nama;
        this.isSubmitting = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Gagal memperbarui profil.';
        this.isSubmitting = false;
      }
    });
  }

  updatePassword(): void {
    this.successMessage = '';
    this.errorMessage = '';

    if (!this.updateForm.old_password || !this.updateForm.password || !this.updateForm.confirm_password) {
      this.errorMessage = 'Semua field password harus diisi.';
      return;
    }

    if (this.updateForm.password !== this.updateForm.confirm_password) {
      this.errorMessage = 'Password baru dan konfirmasi tidak cocok.';
      return;
    }

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
      },
      error: (err) => {
        this.errorMessage = err.error?.error || 'Gagal mengubah password. Pastikan password lama benar.';
        this.isSubmitting = false;
      }
    });
  }

  savePreferences(): void {
    this.successMessage = '';
    this.errorMessage = '';
    
    // Save theme local preference
    if (this.preferences.darkMode) {
      localStorage.setItem('theme', 'dark');
      document.body.classList.add('dark-theme');
    } else {
      localStorage.setItem('theme', 'light');
      document.body.classList.remove('dark-theme');
    }

    localStorage.setItem('employee_preferences', JSON.stringify(this.preferences));
    
    this.successMessage = 'Pengaturan preferensi berhasil disimpan.';
  }
}
