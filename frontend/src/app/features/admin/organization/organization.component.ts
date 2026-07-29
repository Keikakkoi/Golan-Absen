import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';

@Component({
  selector: 'app-organization',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminSidebarComponent],
  templateUrl: './organization.component.html',
  styleUrls: ['./organization.component.scss']
})
export class OrganizationComponent implements OnInit {
  divisions: any[] = [];
  positions: any[] = [];
  
  activeTab: 'divisions' | 'positions' = 'divisions';

  deptForm = { ID: 0, NamaDivisi: '', Deskripsi: '' };
  posForm = { ID: 0, NamaJabatan: '', Deskripsi: '' };
  
  showDeptModal = false;
  showPosModal = false;
  errorMessage = '';

  constructor(private http: HttpClient, private authService: AuthService, private alert: AlertService) {}

  ngOnInit(): void {
    this.loadDivisions();
    this.loadPositions();
  }

  getHeaders() {
    return new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
  }

  // DIVISIS
  loadDivisions() {
    this.http.get<any[]>('http://localhost:8080/api/v1/organization/divisions', { headers: this.getHeaders() }).subscribe({
      next: (data) => this.divisions = data,
      error: (err) => console.error(err)
    });
  }

  openDeptModal(dept: any = null) {
    if (dept) {
      this.deptForm = { ...dept };
    } else {
      this.deptForm = { ID: 0, NamaDivisi: '', Deskripsi: '' };
    }
    this.showDeptModal = true;
  }

  closeDeptModal() {
    this.showDeptModal = false;
  }

  async saveDivision(): Promise<void> {
    if (!this.deptForm.NamaDivisi.trim()) return;
    const action = this.deptForm.ID ? 'mengubah divisi ini' : 'menyimpan divisi baru';
    if (!await this.alert.confirm('Konfirmasi perubahan', `Apakah Anda yakin ingin ${action}?`)) return;
    this.errorMessage = '';
    if (this.deptForm.ID) {
      this.http.put(`http://localhost:8080/api/v1/admin/organization/divisions/${this.deptForm.ID}`, this.deptForm, { headers: this.getHeaders() }).subscribe({
        next: () => {
          this.loadDivisions();
          this.closeDeptModal();
          this.alert.success(this.deptForm.ID ? 'Divisi diperbarui' : 'Divisi disimpan');
        },
        error: (err) => { this.errorMessage = err.error?.error || 'Gagal menyimpan divisi.'; this.alert.error('Gagal menyimpan divisi', this.errorMessage); }
      });
    } else {
      this.http.post(`http://localhost:8080/api/v1/admin/organization/divisions`, this.deptForm, { headers: this.getHeaders() }).subscribe({
        next: () => {
          this.loadDivisions();
          this.closeDeptModal();
          this.alert.success('Divisi disimpan');
        },
        error: (err) => { this.errorMessage = err.error?.error || 'Gagal menyimpan divisi.'; this.alert.error('Gagal menyimpan divisi', this.errorMessage); }
      });
    }
  }

  async deleteDivision(id: number): Promise<void> {
    if (await this.alert.confirm('Hapus divisi?', 'Divisi ini akan dihapus dari sistem.', 'Ya, hapus')) {
      this.http.delete(`http://localhost:8080/api/v1/admin/organization/divisions/${id}`, { headers: this.getHeaders() }).subscribe({
        next: () => { this.loadDivisions(); this.alert.success('Divisi dihapus'); },
        error: (err) => { this.errorMessage = err.error?.error || 'Gagal menghapus divisi.'; this.alert.error('Gagal menghapus divisi', this.errorMessage); }
      });
    }
  }

  // POSITIONS
  loadPositions() {
    this.http.get<any[]>('http://localhost:8080/api/v1/organization/positions', { headers: this.getHeaders() }).subscribe({
      next: (data) => this.positions = data,
      error: (err) => console.error(err)
    });
  }

  openPosModal(pos: any = null) {
    if (pos) {
      this.posForm = { ...pos };
    } else {
      this.posForm = { ID: 0, NamaJabatan: '', Deskripsi: '' };
    }
    this.showPosModal = true;
  }

  closePosModal() {
    this.showPosModal = false;
  }

  async savePosition(): Promise<void> {
    if (!this.posForm.NamaJabatan.trim()) return;
    const action = this.posForm.ID ? 'mengubah jabatan ini' : 'menyimpan jabatan baru';
    if (!await this.alert.confirm('Konfirmasi perubahan', `Apakah Anda yakin ingin ${action}?`)) return;
    this.errorMessage = '';
    if (this.posForm.ID) {
      this.http.put(`http://localhost:8080/api/v1/admin/organization/positions/${this.posForm.ID}`, this.posForm, { headers: this.getHeaders() }).subscribe({
        next: () => {
          this.loadPositions();
          this.closePosModal();
          this.alert.success(this.posForm.ID ? 'Jabatan diperbarui' : 'Jabatan disimpan');
        },
        error: (err) => { this.errorMessage = err.error?.error || 'Gagal menyimpan jabatan.'; this.alert.error('Gagal menyimpan jabatan', this.errorMessage); }
      });
    } else {
      this.http.post(`http://localhost:8080/api/v1/admin/organization/positions`, this.posForm, { headers: this.getHeaders() }).subscribe({
        next: () => {
          this.loadPositions();
          this.closePosModal();
          this.alert.success('Jabatan disimpan');
        },
        error: (err) => { this.errorMessage = err.error?.error || 'Gagal menyimpan jabatan.'; this.alert.error('Gagal menyimpan jabatan', this.errorMessage); }
      });
    }
  }

  async deletePosition(id: number): Promise<void> {
    if (await this.alert.confirm('Hapus jabatan?', 'Jabatan ini akan dihapus dari sistem.', 'Ya, hapus')) {
      this.http.delete(`http://localhost:8080/api/v1/admin/organization/positions/${id}`, { headers: this.getHeaders() }).subscribe({
        next: () => { this.loadPositions(); this.alert.success('Jabatan dihapus'); },
        error: (err) => { this.errorMessage = err.error?.error || 'Gagal menghapus jabatan.'; this.alert.error('Gagal menghapus jabatan', this.errorMessage); }
      });
    }
  }
}
