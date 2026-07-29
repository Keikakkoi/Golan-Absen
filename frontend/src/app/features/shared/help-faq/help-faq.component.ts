import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminSidebarComponent } from '../../admin/admin-sidebar/admin-sidebar.component';
import { SharedSidebarComponent } from '../shared-sidebar/shared-sidebar.component';
import { AuthService } from '../../../core/services/auth.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';

interface FaqItem {
  category: string;
  target: 'Karyawan' | 'HRD/Admin' | 'Umum';
  question: string;
  answer: string;
  isOpen: boolean;
}

@Component({
  selector: 'app-help-faq',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminSidebarComponent, SharedSidebarComponent],
  templateUrl: './help-faq.component.html',
  styleUrls: ['./help-faq.component.scss']
})
export class HelpFaqComponent implements OnInit {
  searchTerm = '';
  selectedCategory = 'Semua';
  selectedTarget = 'Semua';
  userRole: string | null = null;

  categories: string[] = [];
  targets = ['Semua', 'Karyawan', 'HRD/Admin'];

  helpdesk: any = {
    EmailHelpdesk: 'hrd@golan.co.id',
    EmailIT: 'support@golan.co.id',
    WhatsAppHRD: '+62 813-2493-7038',
    WhatsAppIT: '+62 895-3414-40181',
    JamLayanan: 'Senin - Jumat: 08:00 - 17:00 WIB'
  };

  constructor(private authService: AuthService, private http: HttpClient) {}

  ngOnInit() {
    this.userRole = this.authService.getRole();
    if (this.userRole === 'Karyawan') {
      this.selectedTarget = 'Karyawan';
      this.categories = ['Semua', 'Presensi & WFO/WFH', 'Cuti & Izin', 'Profil & Akun'];
    } else {
      this.categories = ['Semua', 'Presensi & WFO/WFH', 'Cuti & Izin', 'Role & Akses', 'Sistem & Backup', 'Profil & Akun'];
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    this.http.get<any>('http://localhost:8080/api/v1/settings/helpdesk', { headers }).subscribe({
      next: (data) => {
        if (data) {
          this.helpdesk = data;
        }
      },
      error: (err) => console.error('Failed to load helpdesk settings', err)
    });
  }

  faqs: FaqItem[] = [
    {
      category: 'Presensi & WFO/WFH',
      target: 'Karyawan',
      question: 'Bagaimana cara melakukan absensi check-in?',
      answer: 'Buka menu Check-in di portal karyawan, pastikan izin lokasi (GPS) pada peramban aktif. Jika berada dalam radius geofence kantor/rumah WFH yang valid, tombol Check-in akan aktif.',
      isOpen: true
    },
    {
      category: 'Presensi & WFO/WFH',
      target: 'Karyawan',
      question: 'Apa yang terjadi jika saya lupa melakukan check-out?',
      answer: 'Sistem akan mencatat waktu check-out kosong dan durasi kerja tidak terhitung sempurna. Segera laporkan ke HRD untuk penyesuaian data presensi Anda secara manual.',
      isOpen: false
    },
    {
      category: 'Cuti & Izin',
      target: 'Karyawan',
      question: 'Bagaimana alur pengajuan cuti atau izin sakit?',
      answer: 'Ajukan melalui menu Pengajuan Cuti/Izin dengan melampirkan dokumen pendukung (misal: surat dokter). Setelah HRD menyetujui, status akan berubah dan kuota cuti akan terpotong secara otomatis.',
      isOpen: false
    },
    {
      category: 'Presensi & WFO/WFH',
      target: 'Karyawan',
      question: 'Berapa batas toleransi keterlambatan presensi yang berlaku?',
      answer: 'Batas standar toleransi keterlambatan adalah 10 menit dari jadwal masuk. Jika lebih dari itu, Anda akan tercatat sebagai terlambat.',
      isOpen: false
    },
    {
      category: 'Profil & Akun',
      target: 'Karyawan',
      question: 'Bagaimana cara mengubah kata sandi (password) akun saya?',
      answer: 'Anda dapat mengubah kata sandi melalui menu Profil Saya. Pastikan Anda mengingat password lama untuk melakukan perubahan password baru.',
      isOpen: false
    },
    {
      category: 'Presensi & WFO/WFH',
      target: 'Karyawan',
      question: 'Bagaimana jika lokasi GPS saya tidak akurat saat check-in?',
      answer: 'Pastikan Anda tidak menggunakan VPN, matikan mock location, dan pastikan izin lokasi di browser aktif. Jika masih bermasalah, refresh halaman atau hubungi HRD.',
      isOpen: false
    },
    {
      category: 'Cuti & Izin',
      target: 'Karyawan',
      question: 'Di mana saya bisa melihat sisa kuota cuti tahunan saya?',
      answer: 'Sisa kuota cuti dapat Anda lihat langsung di widget Sisa Cuti pada Dashboard utama atau di menu Pengajuan Izin & Cuti.',
      isOpen: false
    },
    {
      category: 'Profil & Akun',
      target: 'Karyawan',
      question: 'Apakah saya bisa mengubah foto profil atau data diri lainnya?',
      answer: 'Ya, beberapa informasi seperti foto profil dan kontak darurat dapat diperbarui melalui menu Profil Saya. Namun untuk perubahan jabatan, harus melalui HRD.',
      isOpen: false
    },
    {
      category: 'Role & Akses',
      target: 'HRD/Admin',
      question: 'Bagaimana cara memberikan akses Dashboard Pimpinan (Executive)?',
      answer: 'Pada menu Manajemen Karyawan, edit profil karyawan yang bersangkutan dan ubah Role (Peran) menjadi "Pimpinan". Karyawan tersebut akan mendapatkan akses penuh ke Executive Dashboard.',
      isOpen: false
    },
    {
      category: 'Sistem & Backup',
      target: 'HRD/Admin',
      question: 'Bagaimana cara menambahkan atau mengubah lokasi kantor (Geofence)?',
      answer: 'Masuk ke menu "Pengaturan Umum", lalu sesuaikan Latitude, Longitude, dan Radius Toleransi di panel Konfigurasi Lokasi Kantor. Perubahan akan langsung berlaku untuk semua karyawan.',
      isOpen: false
    },
    {
      category: 'Cuti & Izin',
      target: 'HRD/Admin',
      question: 'Bagaimana cara menyetujui atau menolak pengajuan cuti karyawan?',
      answer: 'Buka menu Persetujuan Cuti. Anda dapat melihat daftar antrean pengajuan, memeriksa lampiran, lalu menekan tombol Setujui atau Tolak. Karyawan akan menerima notifikasi otomatis terkait status pengajuan mereka.',
      isOpen: false
    },
    {
      category: 'Sistem & Backup',
      target: 'HRD/Admin',
      question: 'Bagaimana cara melakukan backup data presensi dan sistem?',
      answer: 'Akses menu "Backup Data" dan klik "Mulai Backup Sekarang". Sistem akan mengunduh berkas backup yang berisi data karyawan, presensi harian, dan log audit.',
      isOpen: false
    },
    {
      category: 'Presensi & WFO/WFH',
      target: 'HRD/Admin',
      question: 'Bagaimana cara memantau karyawan yang terlambat atau tidak hadir?',
      answer: 'Gunakan menu Laporan Keterlambatan atau Executive Dashboard. Anda dapat memfilter laporan berdasarkan tanggal atau divisi untuk memantau kedisiplinan karyawan secara detail.',
      isOpen: false
    }
  ];

  showContactModal = false;

  get filteredFaqs(): FaqItem[] {
    return this.faqs.filter(faq => {
      const matchCat = this.selectedCategory === 'Semua' || faq.category === this.selectedCategory;
      const matchTarget = this.selectedTarget === 'Semua' || faq.target === this.selectedTarget;
      const matchQuery = !this.searchTerm || 
        faq.question.toLowerCase().includes(this.searchTerm.toLowerCase()) || 
        faq.answer.toLowerCase().includes(this.searchTerm.toLowerCase());
      return matchCat && matchTarget && matchQuery;
    });
  }

  toggleFaq(faq: FaqItem) {
    faq.isOpen = !faq.isOpen;
  }

  openContactModal() {
    this.showContactModal = true;
  }

  closeContactModal() {
    this.showContactModal = false;
  }

  getWhatsappLink(phone: string): string {
    if (!phone) return '';
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    return `https://wa.me/${digits}`;
  }
}

