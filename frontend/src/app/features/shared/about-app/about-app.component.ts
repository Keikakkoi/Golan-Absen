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
    {
      title: 'Data Karyawan & Struktur Organisasi',
      description: 'Admin mengelola profil karyawan, divisi, jabatan, status akun, dan relasi kerja yang digunakan dalam proses absensi.'
    },
    {
      title: 'Jadwal, Shift, dan Aturan Kehadiran',
      description: 'Sistem mengatur jam masuk, jam pulang, toleransi keterlambatan, shift kerja, serta aturan dasar presensi harian.'
    },
    {
      title: 'Presensi Berbasis Lokasi',
      description: 'Karyawan melakukan check-in dan check-out dengan validasi waktu, lokasi kerja, serta status kehadiran secara otomatis.'
    },
    {
      title: 'Cuti, Izin, dan Persetujuan',
      description: 'Karyawan dapat mengajukan cuti atau izin, sementara admin atau atasan memproses persetujuan dan memantau riwayatnya.'
    },
    {
      title: 'Rekap Absensi dan Laporan HRD',
      description: 'HRD dapat melihat rekap kehadiran, keterlambatan, izin, cuti, alfa, serta menyiapkan laporan berdasarkan periode tertentu.'
    },
    {
      title: 'Audit, Backup, dan Bantuan Sistem',
      description: 'Sistem menyimpan riwayat aktivitas penting, mendukung backup data, dan menyediakan bantuan untuk operasional aplikasi.'
    }
  ];

  systemStatus = {
    apiStatus: 'Online (HTTP 200 OK)',
    dbStatus: 'Connected (MySQL 8.0 / GORM)',
    storageStatus: 'MinIO Ready',
    activePagesCount: 57
  };
}

