import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminSidebarComponent } from '../../admin/admin-sidebar/admin-sidebar.component';
import { SharedSidebarComponent } from '../shared-sidebar/shared-sidebar.component';
import { AuthService } from '../../../core/services/auth.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';

interface FaqItem {
  category: string;
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
  userRole: string | null = null;
  categories: string[] = [];

  helpdesk: any = {
    EmailHelpdesk: 'hrd@golan.co.id', EmailIT: 'support@golan.co.id',
    WhatsAppHRD: '+62 813-2493-7038', WhatsAppIT: '+62 895-3414-40181',
    JamLayanan: 'Senin - Jumat: 08:00 - 17:00 WIB'
  };

  constructor(private authService: AuthService, private http: HttpClient) {}

  ngOnInit() {
    this.userRole = this.authService.getRole();
    this.categories = this.categoriesForRole;
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    this.http.get<any>('http://localhost:8080/api/v1/settings/helpdesk', { headers }).subscribe({
      next: data => { if (data) this.helpdesk = data; },
      error: err => console.error('Failed to load helpdesk settings', err)
    });
  }

  private readonly faqContent: Record<string, FaqItem[]> = {
    Karyawan: [
      this.f('Presensi & WFO/WFH', 'Bagaimana cara melakukan absensi check-in dan check-out?', 'Buka menu Check-in / Out, pilih tipe kerja WFO atau WFH, pastikan GPS dan izin kamera aktif, lalu ikuti proses foto selfie. Check-in hanya dapat dilakukan di area geofence yang diizinkan. Setelah selesai bekerja, buka menu yang sama dan tekan Check-out.', true),
      this.f('Presensi & WFO/WFH', 'Apa yang terjadi jika saya lupa melakukan check-out?', 'Riwayat presensi akan menunjukkan check-out kosong sehingga durasi kerja tidak tercatat sempurna. Segera laporkan tanggal dan kronologi kepada HRD agar dapat diperiksa sesuai kebijakan perusahaan.'),
      this.f('Presensi & WFO/WFH', 'Mengapa check-in saya tidak dapat dilakukan?', 'Pastikan GPS, izin lokasi, dan kamera browser aktif, koneksi stabil, serta Anda berada di area geofence kantor atau rumah yang terdaftar. Nonaktifkan VPN atau mock location, kemudian refresh halaman. Jika tetap gagal, simpan pesan error dan hubungi HRD.'),
      this.f('Cuti & Izin', 'Bagaimana alur pengajuan cuti atau izin sakit?', 'Buka menu Pengajuan Izin, pilih jenis pengajuan, isi tanggal dan alasan dengan lengkap, lalu unggah lampiran dokumen yang wajib disertakan. Cuti hanya dapat diajukan setelah memenuhi masa kerja minimum yang ditetapkan. Pengajuan berstatus Menunggu sampai disetujui atau ditolak; Cuti dan Lainnya mencadangkan kuota sejak dikirim, lalu mengembalikannya bila ditolak atau dibatalkan.'),
      this.f('Cuti & Izin', 'Di mana saya dapat melihat sisa kuota dan status pengajuan?', 'Sisa kuota dapat dilihat pada Dashboard atau menu Pengajuan Izin. Status pengajuan tersedia pada halaman yang sama. Jika data tidak sesuai, hubungi HRD dengan menyebutkan tanggal atau nomor pengajuan.'),
      this.f('Profil & Akun', 'Bagaimana cara memperbarui profil dan password?', 'Buka Profil Saya untuk memperbarui data yang diizinkan, seperti foto dan kontak. Password diganti dengan memasukkan password lama dan password baru. Perubahan jabatan, divisi, atau data kepegawaian harus diajukan kepada HRD.'),
      this.f('Laporan Kerja', 'Bagaimana cara membuat dan mengirim laporan kerja?', 'Buka Laporan Kerja, pilih tanggal atau periode, isi pekerjaan secara rinci, lalu simpan dan kirim. Pastikan statusnya sudah Terkirim karena laporan yang masih berupa draf belum dapat ditinjau atasan.')
    ],
    MAGANG: [
      this.f('Presensi & WFO/WFH', 'Bagaimana cara check-in dan check-out sebagai peserta magang?', 'Buka Check-in / Out, pilih WFO atau WFH bila tersedia, aktifkan GPS dan kamera, lalu lakukan selfie. Check-out dilakukan pada menu yang sama setelah kegiatan selesai. Presensi hanya berhasil di area lokasi yang diizinkan.', true),
      this.f('Presensi & WFO/WFH', 'Mengapa presensi saya gagal atau lokasi tidak terbaca?', 'Aktifkan GPS, izin lokasi dan kamera browser, gunakan koneksi stabil, serta pastikan berada di area geofence. Nonaktifkan VPN atau mock location dan refresh halaman. Hubungi pembimbing atau HRD bila kendala berlanjut.'),
      this.f('Logbook & Magang', 'Bagaimana cara mengisi logbook harian?', 'Buka Logbook Harian, pilih tanggal kegiatan, tulis aktivitas dan hasilnya secara jelas, kemudian simpan dan kirim untuk ditinjau. Pastikan logbook sesuai kegiatan yang benar-benar dilakukan dan statusnya sudah Terkirim.'),
      this.f('Logbook & Magang', 'Bagaimana melihat progres dan sisa masa magang?', 'Buka Statistik Kehadiran atau Dashboard Magang untuk melihat ringkasan kehadiran dan progres periode magang. Informasi pembimbing tersedia pada menu Info Manajer.'),
      this.f('Izin Kehadiran', 'Bagaimana mengajukan izin saat tidak dapat hadir magang?', 'Peserta magang tidak memiliki hak cuti. Jika berhalangan hadir, buka Pengajuan Izin, pilih jenis izin, isi tanggal dan alasan, lalu unggah lampiran dokumen yang wajib disertakan. Pengajuan menunggu pemeriksaan sampai disetujui atau ditolak oleh pihak yang berwenang.'),
      this.f('Profil & Akun', 'Bagaimana cara memperbarui profil atau password?', 'Gunakan Profil Saya untuk data yang dapat diubah sendiri dan penggantian password. Perubahan penempatan atau pembimbing harus dikonfirmasi kepada HRD.')
    ],
    MANAJER: [
      this.f('Presensi & WFO/WFH', 'Bagaimana cara melakukan presensi pribadi?', 'Buka Check-in / Out, pilih tipe kerja, pastikan GPS dan kamera aktif, lalu lakukan selfie di area geofence. Lakukan Check-out pada menu yang sama setelah selesai bekerja.', true),
      this.f('Presensi & WFO/WFH', 'Bagaimana memeriksa presensi anggota tim?', 'Buka Absensi Tim untuk melihat status kehadiran anggota tim dan gunakan filter tanggal atau status. Untuk ringkasan lebih luas, gunakan Statistik Kehadiran Tim.'),
      this.f('Laporan & Tim', 'Bagaimana meninjau laporan kerja anggota tim?', 'Buka Laporan Tim untuk melihat laporan yang dikirim anggota tim, periksa detail pekerjaan dan tanggalnya, lalu lakukan tindak lanjut sesuai proses internal. Laporan pribadi dibuat melalui Laporan Kerja.'),
      this.f('Laporan & Tim', 'Bagaimana melihat statistik kehadiran tim?', 'Buka Statistik Kehadiran Tim, tentukan periode, lalu gunakan ringkasan dan filter untuk melihat hadir, terlambat, izin, cuti, atau ketidakhadiran.'),
      this.f('Cuti & Izin', 'Bagaimana memproses pengajuan izin anggota tim?', 'Buka Persetujuan Izin, periksa tanggal, alasan, dan lampiran, lalu pilih Setujui atau Tolak sesuai kebijakan. Pastikan keputusan diberikan setelah informasi cukup.'),
      this.f('Profil & Akun', 'Bagaimana cara mengubah profil atau password?', 'Gunakan Profil Saya untuk data yang dapat diperbarui sendiri dan penggantian password. Perubahan jabatan, divisi, atau data kepegawaian harus melalui HRD.')
    ],
    HRD: [
      this.f('Presensi & WFO/WFH', 'Bagaimana mengatur lokasi kantor dan validasi WFO/WFH?', 'Buka Pengaturan Umum untuk mengatur koordinat serta radius kantor. Untuk lokasi rumah karyawan, gunakan Lokasi Rumah WFH. Periksa kembali koordinat dan radius sebelum menyimpan karena pengaturan memengaruhi validasi presensi.', true),
      this.f('Presensi & WFO/WFH', 'Bagaimana memantau presensi, keterlambatan, dan ketidakhadiran?', 'Gunakan Rekap Absensi untuk memfilter periode, tipe kerja, status, atau karyawan. Periksa status Terlambat pada rekap dan gunakan Lap. Ketidakhadiran untuk meninjau data yang tidak hadir.'),
      this.f('Cuti & Izin', 'Bagaimana menyetujui atau menolak pengajuan cuti dan izin?', 'Buka Persetujuan Cuti, periksa detail dan lampiran, lalu pilih Setujui atau Tolak dengan alasan bila diperlukan. Kuota cuti diperbarui setelah persetujuan.'),
      this.f('Cuti & Izin', 'Bagaimana mengatur kuota cuti atau izin karyawan?', 'Buka Kuota Cuti, pilih karyawan dan tahun, tentukan jenis serta sisa kuota, lalu simpan. Periksa nama dan tahun sebelum menyimpan.'),
      this.f('Operasional Karyawan', 'Bagaimana mengelola data karyawan, jadwal, dan operasional tim?', 'Gunakan Karyawan untuk data personal, Organisasi & Jabatan untuk struktur, Jadwal / Shift untuk jadwal, dan Operasional Magang & Tim untuk penempatan atau operasional. Simpan setelah data diperiksa.'),
      this.f('Sistem & Backup', 'Bagaimana melakukan backup data dan memeriksa aktivitas sistem?', 'Buka Backup Data lalu mulai proses backup dan simpan berkas di lokasi aman. Untuk menelusuri aktivitas pengguna, gunakan Audit Log. Lakukan backup secara berkala.'),
      this.f('Sistem & Backup', 'Bagaimana mengatur notifikasi dan informasi helpdesk?', 'Gunakan Pengaturan Notifikasi untuk preferensi notifikasi. Informasi kontak HRD dan IT yang tampil di Bantuan & FAQ diperbarui dari Pengaturan Umum.'),
      this.f('Profil & Akun', 'Bagaimana cara memperbarui profil akun HRD?', 'Buka Profil Saya untuk mengubah data yang tersedia dan password. Perubahan data kepegawaian yang tidak tersedia di form dilakukan melalui pengelolaan data karyawan.')
    ]
  };

  private f(category: string, question: string, answer: string, isOpen = false): FaqItem {
    return { category, question, answer, isOpen };
  }

  get faqs(): FaqItem[] {
    return this.faqContent[this.userRole || 'Karyawan'] || this.faqContent['Karyawan'];
  }

  get categoriesForRole(): string[] {
    return ['Semua', ...Array.from(new Set(this.faqs.map(faq => faq.category)))];
  }

  get filteredFaqs(): FaqItem[] {
    const query = this.searchTerm.toLowerCase();
    return this.faqs.filter(faq =>
      (this.selectedCategory === 'Semua' || faq.category === this.selectedCategory) &&
      (!query || faq.question.toLowerCase().includes(query) || faq.answer.toLowerCase().includes(query))
    );
  }

  toggleFaq(faq: FaqItem) { faq.isOpen = !faq.isOpen; }
  openContactModal() { this.showContactModal = true; }
  closeContactModal() { this.showContactModal = false; }
  getWhatsappLink(phone: string): string { return `https://wa.me/${(phone || '').replace(/\D/g, '')}`; }
  showContactModal = false;
}
