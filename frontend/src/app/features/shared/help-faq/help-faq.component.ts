import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminSidebarComponent } from '../../admin/admin-sidebar/admin-sidebar.component';

interface FaqItem {
  category: string;
  question: string;
  answer: string;
  isOpen: boolean;
}

@Component({
  selector: 'app-help-faq',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminSidebarComponent],
  templateUrl: './help-faq.component.html',
  styleUrls: ['./help-faq.component.scss']
})
export class HelpFaqComponent {
  searchTerm = '';
  selectedCategory = 'Semua';

  categories = ['Semua', 'Presensi & WFO/WFH', 'Cuti & Izin', 'Role & Akses', 'Sistem & Backup'];

  faqs: FaqItem[] = [
    {
      category: 'Presensi & WFO/WFH',
      question: 'Bagaimana cara melakukan absensi check-in?',
      answer: 'Buka menu Check-in di portal karyawan, pastikan izin lokasi (GPS) pada peramban aktif. Jika berada dalam radius geofence kantor/rumah WFH yang valid, tombol Check-in akan aktif.',
      isOpen: true
    },
    {
      category: 'Sistem & Backup',
      question: 'Bagaimana cara menambahkan lokasi kantor baru?',
      answer: 'Sebagai Admin/HRD, masuk ke menu "Pengaturan Umum" lalu atur Latitude, Longitude, dan Radius Toleransi di panel Konfigurasi Lokasi Kantor Pusat.',
      isOpen: false
    },
    {
      category: 'Presensi & WFO/WFH',
      question: 'Apa yang terjadi jika karyawan tidak check-out?',
      answer: 'Sistem mencatat waktu check-out kosong dan durasi kerja tidak terhitung sempurna. Admin/HRD dapat memeriksa Laporan Ketidakhadiran & Keterlambatan untuk verifikasi manual.',
      isOpen: false
    },
    {
      category: 'Cuti & Izin',
      question: 'Bagaimana alur pengajuan dan approval cuti?',
      answer: 'Karyawan mengajukan cuti melalui menu Pengajuan Cuti. Admin/HRD menerima notifikasi dan melakukan approval pada menu Persetujuan Cuti. Kuota cuti karyawan terpotong otomatis setelah disetujui.',
      isOpen: false
    },
    {
      category: 'Role & Akses',
      question: 'Siapa saja yang dapat mengakses Dashboard Pimpinan (Executive)?',
      answer: 'Pengguna dengan role "Pimpinan" memiliki akses penuh ke Executive Dashboard untuk memantau statistik kehadiran per departemen, tren bulanan, dan ekspor laporan eksklusif.',
      isOpen: false
    },
    {
      category: 'Presensi & WFO/WFH',
      question: 'Berapa batas toleransi keterlambatan presensi?',
      answer: 'Batas standar adalah 10 menit. Pengaturan ini dapat disesuaikan secara fleksibel oleh Admin melalui menu Pengaturan Umum Sistem.',
      isOpen: false
    },
    {
      category: 'Sistem & Backup',
      question: 'Bagaimana cara melakukan backup data sistem?',
      answer: 'Admin dapat mengakses menu "Backup Data" dan mengklik "Mulai Backup Sekarang". Sistem akan mengunduh berkas backup JSON berisi data karyawan, presensi, dan log audit.',
      isOpen: false
    }
  ];

  showContactModal = false;

  get filteredFaqs(): FaqItem[] {
    return this.faqs.filter(faq => {
      const matchCat = this.selectedCategory === 'Semua' || faq.category === this.selectedCategory;
      const matchQuery = !this.searchTerm || 
        faq.question.toLowerCase().includes(this.searchTerm.toLowerCase()) || 
        faq.answer.toLowerCase().includes(this.searchTerm.toLowerCase());
      return matchCat && matchQuery;
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
}

