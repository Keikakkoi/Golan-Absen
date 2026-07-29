import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminSidebarComponent } from '../../admin/admin-sidebar/admin-sidebar.component';

@Component({
  selector: 'app-about-app',
  standalone: true,
  imports: [CommonModule, AdminSidebarComponent],
  templateUrl: './about-app.component.html',
  styleUrls: ['./about-app.component.scss']
})
export class AboutAppComponent {
  appInfo = {
    name: 'Sistem Absensi & Management Karyawan Digital',
    shortName: 'Absensi Golan Digital Kreatif',
    version: 'v1.0.0 Enterprise Edition',
    buildDate: '21 Juli 2026',
    company: 'PT. Golan Digital Kreatif',
    copyright: '© 2026 PT. Golan Digital Kreatif. All rights reserved.',
    description: 'Sistem Manajemen Kehadiran, Presensi berbasis Geofencing GPS/WFH, Manajemen Shift, Pengajuan Cuti, Audit Logging, dan Dashboard Eksekutif terpadu.'
  };

  techStack = [
    { name: 'Angular 18+', category: 'Frontend Web Framework', icon: 'fa fa-code' },
    { name: 'Go Fiber (v2)', category: 'Backend REST API', icon: 'fa fa-server' },
    { name: 'MySQL & GORM', category: 'Database Relasional & ORM', icon: 'fa fa-database' },
    { name: 'MinIO Storage', category: 'Object Storage untuk Lampiran/Foto', icon: 'fa fa-cloud-upload' },
    { name: 'Docker Compose', category: 'Kontainerisasi & Deployment', icon: 'fa fa-cubes' },
    { name: 'JWT Authentication', category: 'Keamanan & Autentikasi Peran', icon: 'fa fa-lock' }
  ];

  modules = [
    { code: 'Modul A', title: 'Autentikasi & Profil Pengguna', pages: '8 Halaman' },
    { code: 'Modul B', title: 'Presensi Karyawan (Check-in/Out, Geofence)', pages: '12 Halaman' },
    { code: 'Modul C', title: 'Manajemen Cuti & Izin', pages: '10 Halaman' },
    { code: 'Modul D', title: 'Laporan HRD & Audit Log', pages: '18 Halaman' },
    { code: 'Modul E', title: 'Dashboard Manajer', pages: '5 Halaman' },
    { code: 'Modul F', title: 'Sistem, Backup, & Bantuan', pages: '4 Halaman' }
  ];

  systemStatus = {
    apiStatus: 'Online (HTTP 200 OK)',
    dbStatus: 'Connected (MySQL 8.0 / GORM)',
    storageStatus: 'MinIO Ready',
    activePagesCount: 57
  };
}

