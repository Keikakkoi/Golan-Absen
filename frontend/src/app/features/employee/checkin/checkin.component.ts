import { Component, ElementRef, OnInit, ViewChild, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AttendanceService } from '../../../core/services/attendance.service';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import * as L from 'leaflet';
import { SharedSidebarComponent } from '../../shared/shared-sidebar/shared-sidebar.component';

const greenPinSvg = `
  <svg width="30" height="42" viewBox="0 0 30 42" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 0C6.71573 0 0 6.71573 0 15C0 26.25 15 42 15 42C15 42 30 26.25 30 15C30 6.71573 23.2843 0 15 0ZM15 20.5C11.9624 20.5 9.5 18.0376 9.5 15C9.5 11.9624 11.9624 9.5 15 9.5C18.0376 9.5 20.5 11.9624 20.5 15C20.5 18.0376 18.0376 20.5 15 20.5Z" fill="#1F9E64"/>
  </svg>
`;
const redPinSvg = `
  <svg width="30" height="42" viewBox="0 0 30 42" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 0C6.71573 0 0 6.71573 0 15C0 26.25 15 42 15 42C15 42 30 26.25 30 15C30 6.71573 23.2843 0 15 0ZM15 20.5C11.9624 20.5 9.5 18.0376 9.5 15C9.5 11.9624 11.9624 9.5 15 9.5C18.0376 9.5 20.5 11.9624 20.5 15C20.5 18.0376 18.0376 20.5 15 20.5Z" fill="#D15C50"/>
  </svg>
`;
const bluePinSvg = `
  <svg width="30" height="42" viewBox="0 0 30 42" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 0C6.71573 0 0 6.71573 0 15C0 26.25 15 42 15 42C15 42 30 26.25 30 15C30 6.71573 23.2843 0 15 0ZM15 20.5C11.9624 20.5 9.5 18.0376 9.5 15C9.5 11.9624 11.9624 9.5 15 9.5C18.0376 9.5 20.5 11.9624 20.5 15C20.5 18.0376 18.0376 20.5 15 20.5Z" fill="#3B82F6"/>
  </svg>
`;

const greenIcon = L.divIcon({
  html: greenPinSvg,
  className: 'custom-pin-icon-green',
  iconSize: [30, 42],
  iconAnchor: [15, 42],
  popupAnchor: [0, -40]
});
const redIcon = L.divIcon({
  html: redPinSvg,
  className: 'custom-pin-icon-red',
  iconSize: [30, 42],
  iconAnchor: [15, 42],
  popupAnchor: [0, -40]
});
const blueIcon = L.divIcon({
  html: bluePinSvg,
  className: 'custom-pin-icon-blue',
  iconSize: [30, 42],
  iconAnchor: [15, 42],
  popupAnchor: [0, -40]
});

@Component({
  selector: 'app-checkin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SharedSidebarComponent],
  templateUrl: './checkin.component.html',
  styleUrls: ['./checkin.component.scss']
})
export class CheckinComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  map!: L.Map;
  marker!: L.Marker;
  circle!: L.Circle;
  homeCircle!: L.Circle;
  homeMarker!: L.Marker;
  officeMarker!: L.Marker;
  
  // Kantor Koordinat (Fallback defaults)
  officeLat = -6.1202471;
  officeLng = 106.7118952;
  radius = 100; // meters

  currentLat = 0;
  currentLng = 0;
  currentAccuracy = 0;
  distanceToOffice = 0;
  isGpsActive = false;
  statusText = 'Menghubungkan GPS...';
  
  employeeProfile: any = null;
  
  isLocationValid = false;
  locationError = '';
  cameraError = '';
  isCameraReady = false;
  isSubmitting = false;
  
  tipeKerja: string = 'WFO';
  workTypes: any[] = [];
  
  stream!: MediaStream;
  watchId: number | null = null;
  capturedImage: string | null = null;
  capturedBlob: Blob | null = null;

  todayRecord: any = null; // Store today's attendance record
  hasCheckedIn: boolean = false;
  hasCheckedOut: boolean = false;
  isCheckoutPage = false;

  // PRD 15 Clock & Confirmation Stamp variables
  currentTime = new Date();
  private clockInterval: any;
  showStampModal = false;
  stampModalMessage = '';
  stampSuccess = false;

  constructor(
    private attendanceService: AttendanceService,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isCheckoutPage = this.router.url === '/employee/checkout';
    this.checkTodayAttendance();
    this.loadWorkTypes();
    this.loadEmployeeProfile();
    this.loadOfficeInfo();
    this.clockInterval = setInterval(() => {
      this.currentTime = new Date();
    }, 1000);
  }

  ngAfterViewInit(): void {
    if (!this.hasCheckedOut) {
      this.initMap();
      this.startLocationTracking();
      this.startCamera();
    }
  }

  private checkTodayAttendance(): void {
    this.attendanceService.getHistory().subscribe({
      next: (records) => {
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const todayRecord = records.find(r => r.Tanggal.startsWith(todayStr));
        if (todayRecord) {
          this.todayRecord = todayRecord;
          this.hasCheckedIn = todayRecord.JamMasuk != null;
          this.hasCheckedOut = todayRecord.JamPulang != null;
          if (this.hasCheckedIn && !this.hasCheckedOut) {
            this.tipeKerja = todayRecord.TipeKerja;
          }
        }
      },
      error: (err) => console.error('Failed to load attendance history', err)
    });
  }

  private loadEmployeeProfile(): void {
    const token = localStorage.getItem('token');
    if (!token) return;
    this.http.get<any>('http://localhost:8080/api/v1/employee/profile', {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (data) => {
        this.employeeProfile = data;
        this.updateMapGeofences();
        this.checkRadius();
      },
      error: (err) => console.error('Failed to load profile', err)
    });
  }

  private loadWorkTypes(): void {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    this.http.get<any[]>('http://localhost:8080/api/v1/worktypes', {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (data) => {
        this.workTypes = data;
        if (this.workTypes.length > 0) {
          const wfo = this.workTypes.find(w => w.Nama === 'WFO');
          this.tipeKerja = wfo ? wfo.Nama : this.workTypes[0].Nama;
        }
      },
      error: (err) => console.error('Failed to load work types', err)
    });
  }

  private loadOfficeInfo(): void {
    this.attendanceService.getOfficeInfo().subscribe({
      next: (office) => {
        if (office) {
          this.officeLat = office.Latitude || -6.1202471;
          this.officeLng = office.Longitude || 106.7118952;
          this.radius = office.RadiusMeter || 100;
          this.updateOfficeGeofence();
          this.checkRadius();
        }
      },
      error: (err) => console.error('Failed to load office location', err)
    });
  }

  ngOnDestroy(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
  }

  private initMap(): void {
    this.map = L.map('map').setView([this.officeLat, this.officeLng], 17);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.updateOfficeGeofence();
    this.updateMapGeofences();
  }

  private updateOfficeGeofence(): void {
    if (!this.map) return;
    if (this.circle) {
      this.map.removeLayer(this.circle);
    }
    if (this.officeMarker) {
      this.map.removeLayer(this.officeMarker);
    }

    this.circle = L.circle([this.officeLat, this.officeLng], {
      color: '#136E46',
      fillColor: '#1F9E64',
      fillOpacity: 0.15,
      weight: 2,
      radius: this.radius
    }).addTo(this.map);

    this.officeMarker = L.marker([this.officeLat, this.officeLng], { icon: redIcon })
      .addTo(this.map)
      .bindPopup('Kantor Pusat (PT Golan Digital Kreatif)');
    
    if (this.currentLat === 0 && this.currentLng === 0) {
      this.map.setView([this.officeLat, this.officeLng], 17);
    }
  }

  private updateMapGeofences(): void {
    if (!this.map) return;

    if (this.homeCircle) {
      this.map.removeLayer(this.homeCircle);
    }
    if (this.homeMarker) {
      this.map.removeLayer(this.homeMarker);
    }

    const selectedWorkType = this.workTypes.find(w => w.Nama === this.tipeKerja);
    if (selectedWorkType && selectedWorkType.IsHomeBase && this.employeeProfile?.Employee) {
      const hLat = this.employeeProfile.Employee.HomeLatitude;
      const hLng = this.employeeProfile.Employee.HomeLongitude;
      
      if (hLat !== 0 && hLng !== 0) {
        this.homeCircle = L.circle([hLat, hLng], {
          color: '#3B82F6',
          fillColor: '#3B82F6',
          fillOpacity: 0.15,
          weight: 2,
          radius: this.employeeProfile?.Employee?.HomeLocation?.RadiusMeter || 100
        }).addTo(this.map);
        
        this.homeMarker = L.marker([hLat, hLng], { icon: blueIcon }).addTo(this.map).bindPopup('Lokasi Rumah Anda');
      }
    }
  }

  onTipeKerjaChange(): void {
    this.updateMapGeofences();
    this.checkRadius();
  }

  private startLocationTracking(): void {
    if (!navigator.geolocation) {
      this.locationError = 'Geolocation tidak didukung oleh browser Anda.';
      this.isGpsActive = false;
      this.isLocationValid = false;
      this.statusText = 'GPS Tidak Aktif · Silakan aktifkan GPS perangkat Anda';
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.currentLat = position.coords.latitude;
        this.currentLng = position.coords.longitude;
        this.currentAccuracy = position.coords.accuracy;
        this.isGpsActive = true;
        this.locationError = '';

        this.updateUserMarker();
        this.checkRadius();
      },
      (error) => {
        this.isGpsActive = false;
        this.isLocationValid = false;
        this.locationError = 'Aktifkan GPS untuk melanjutkan absensi.';
        this.statusText = 'GPS Tidak Aktif · Silakan aktifkan GPS perangkat Anda';
      },
      { enableHighAccuracy: true, maximumAge: 0 }
    );
  }

  private updateUserMarker(): void {
    if (!this.map) return;
    if (this.marker) {
      this.marker.setLatLng([this.currentLat, this.currentLng]);
    } else {
      this.marker = L.marker([this.currentLat, this.currentLng], {
        icon: greenIcon
      }).addTo(this.map).bindPopup('Posisi Karyawan (Anda)');
      
      this.map.setView([this.currentLat, this.currentLng], 17);
    }
  }

  private checkRadius(): void {
    if (!this.isGpsActive || (this.currentLat === 0 && this.currentLng === 0)) {
      this.isLocationValid = false;
      this.statusText = 'GPS Tidak Aktif · Silakan aktifkan GPS perangkat Anda';
      return;
    }

    const selectedWorkType = this.workTypes.find(w => w.Nama === this.tipeKerja);
    const userLatLng = L.latLng(this.currentLat, this.currentLng);
    const officeLatLng = L.latLng(this.officeLat, this.officeLng);
    this.distanceToOffice = Math.round(userLatLng.distanceTo(officeLatLng));
    
    if (selectedWorkType?.IsHomeBase) {
      if (this.employeeProfile?.Employee) {
        const hLat = this.employeeProfile.Employee.HomeLatitude;
        const hLng = this.employeeProfile.Employee.HomeLongitude;
        if (hLat === 0 && hLng === 0 && this.distanceToOffice > this.radius) {
          this.isLocationValid = false;
          this.locationError = 'Lokasi rumah belum diatur oleh admin.';
          this.statusText = 'Lokasi di luar radius · Lokasi rumah belum diatur';
          return;
        }
        const homeLatLng = L.latLng(hLat, hLng);
        const homeDistance = Math.round(userLatLng.distanceTo(homeLatLng));
        const homeRadius = this.employeeProfile.Employee.HomeLocation?.RadiusMeter || 100;
        this.isLocationValid = homeDistance <= homeRadius || this.distanceToOffice <= this.radius;
        if (!this.isLocationValid) {
          this.locationError = 'Posisi Anda di luar radius rumah.';
        } else {
          this.locationError = '';
        }
        this.statusText = this.isLocationValid
          ? `Lokasi terverifikasi · radius ${homeDistance} meter dari rumah`
          : `Lokasi di luar radius · radius ${homeDistance} meter dari rumah`;
      } else {
        this.isLocationValid = false;
        this.locationError = 'Memuat profil karyawan...';
        this.statusText = 'Memuat profil karyawan...';
      }
    } else if (this.tipeKerja === 'WFO') {
      this.isLocationValid = this.distanceToOffice <= this.radius;
      if (!this.isLocationValid) {
        this.locationError = 'Posisi Anda di luar radius kantor.';
      } else {
        this.locationError = '';
      }
      this.statusText = this.isLocationValid
        ? `Lokasi terverifikasi · radius ${this.distanceToOffice} meter dari kantor`
        : `Lokasi di luar radius · radius ${this.distanceToOffice} meter dari kantor`;
    } else {
      this.isLocationValid = true;
      this.locationError = '';
      this.statusText = `Lokasi terverifikasi (Remote) · radius ${this.distanceToOffice} meter dari kantor`;
    }
  }

  private startCamera(): void {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      .then((stream) => {
        this.stream = stream;
        this.videoElement.nativeElement.srcObject = stream;
        this.videoElement.nativeElement.play();
        this.isCameraReady = true;
        this.cameraError = '';
      })
      .catch((err) => {
        this.cameraError = 'Izin kamera ditolak. Silakan aktifkan kamera.';
      });
  }

  capture(): void {
    if (!this.isCameraReady) return;
    
    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const employeeName = localStorage.getItem('name') || 'Unknown Employee';
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, canvas.height - 70, canvas.width, 70);

      ctx.font = '16px "JetBrains Mono", monospace';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(`Nama: ${employeeName}`, 10, canvas.height - 45);
      ctx.fillText(`Waktu: ${new Date().toLocaleString()}`, 10, canvas.height - 25);
      ctx.fillText(`GPS: ${this.currentLat.toFixed(6)}, ${this.currentLng.toFixed(6)}`, 10, canvas.height - 5);
      
      this.capturedImage = canvas.toDataURL('image/jpeg', 0.8);
      canvas.toBlob((blob) => {
        this.capturedBlob = blob;
      }, 'image/jpeg', 0.8);
    }
  }

  retake(): void {
    this.capturedImage = null;
    this.capturedBlob = null;
  }

  triggerPunch(): void {
    if (!this.isGpsActive || !this.isLocationValid || !this.capturedBlob || this.isSubmitting) return;
    if (this.isCheckoutPage && !this.hasCheckedIn) return;
    if (!this.hasCheckedIn) {
      this.submitCheckin();
    } else {
      this.submitCheckout();
    }
  }

  submitCheckin(): void {
    if (!this.isGpsActive || !this.isLocationValid || !this.capturedBlob || this.isSubmitting) return;

    this.isSubmitting = true;
    this.showStampModal = true;
    this.stampSuccess = false;
    this.stampModalMessage = 'Mengirim koordinat & verifikasi GPS...';

    this.attendanceService.checkIn(
      this.currentLat, 
      this.currentLng, 
      this.currentAccuracy, 
      this.capturedBlob,
      this.tipeKerja
    ).subscribe({
      next: (res) => {
        this.stampSuccess = true;
        this.stampModalMessage = 'Check-in Berhasil! Presensi Terdaftar.';
        setTimeout(() => {
          this.isSubmitting = false;
          this.showStampModal = false;
          this.router.navigate(['/employee/dashboard']);
        }, 2500);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.showStampModal = false;
        alert('Check-in gagal: ' + (err.error?.error || 'Kesalahan sistem'));
      }
    });
  }

  submitCheckout(): void {
    if (!this.isGpsActive || !this.isLocationValid || !this.capturedBlob || this.isSubmitting) return;

    this.isSubmitting = true;
    this.showStampModal = true;
    this.stampSuccess = false;
    this.stampModalMessage = 'Menghitung durasi kerja & verifikasi GPS...';

    this.attendanceService.checkOut(
      this.currentLat, 
      this.currentLng, 
      this.currentAccuracy, 
      this.capturedBlob
    ).subscribe({
      next: (res) => {
        this.stampSuccess = true;
        this.stampModalMessage = 'Check-out Berhasil! Selamat beristirahat.';
        setTimeout(() => {
          this.isSubmitting = false;
          this.showStampModal = false;
          this.router.navigate(['/employee/dashboard']);
        }, 2500);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.showStampModal = false;
        alert('Check-out gagal: ' + (err.error?.error || 'Kesalahan sistem'));
      }
    });
  }
}
