import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';

@Component({
  selector: 'app-organization',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminSidebarComponent],
  templateUrl: './organization.component.html',
  styleUrls: ['./organization.component.scss']
})
export class OrganizationComponent implements OnInit {
  departments: any[] = [];
  positions: any[] = [];
  
  activeTab: 'departments' | 'positions' = 'departments';

  deptForm = { ID: 0, NamaDepartemen: '' };
  posForm = { ID: 0, NamaJabatan: '' };
  
  showDeptModal = false;
  showPosModal = false;
  errorMessage = '';

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit(): void {
    this.loadDepartments();
    this.loadPositions();
  }

  getHeaders() {
    return new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
  }

  // DEPARTMENTS
  loadDepartments() {
    this.http.get<any[]>('http://localhost:8080/api/v1/organization/departments', { headers: this.getHeaders() }).subscribe({
      next: (data) => this.departments = data,
      error: (err) => console.error(err)
    });
  }

  openDeptModal(dept: any = null) {
    if (dept) {
      this.deptForm = { ...dept };
    } else {
      this.deptForm = { ID: 0, NamaDepartemen: '' };
    }
    this.showDeptModal = true;
  }

  closeDeptModal() {
    this.showDeptModal = false;
  }

  saveDepartment() {
    if (!this.deptForm.NamaDepartemen.trim()) return;
    this.errorMessage = '';
    if (this.deptForm.ID) {
      this.http.put(`http://localhost:8080/api/v1/admin/organization/departments/${this.deptForm.ID}`, this.deptForm, { headers: this.getHeaders() }).subscribe({
        next: () => {
          this.loadDepartments();
          this.closeDeptModal();
        },
        error: (err) => this.errorMessage = err.error?.error || 'Gagal menyimpan departemen.'
      });
    } else {
      this.http.post(`http://localhost:8080/api/v1/admin/organization/departments`, this.deptForm, { headers: this.getHeaders() }).subscribe({
        next: () => {
          this.loadDepartments();
          this.closeDeptModal();
        },
        error: (err) => this.errorMessage = err.error?.error || 'Gagal menyimpan departemen.'
      });
    }
  }

  deleteDepartment(id: number) {
    if (confirm('Yakin ingin menghapus departemen ini?')) {
      this.http.delete(`http://localhost:8080/api/v1/admin/organization/departments/${id}`, { headers: this.getHeaders() }).subscribe({
        next: () => this.loadDepartments(),
        error: (err) => this.errorMessage = err.error?.error || 'Gagal menghapus departemen.'
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
      this.posForm = { ID: 0, NamaJabatan: '' };
    }
    this.showPosModal = true;
  }

  closePosModal() {
    this.showPosModal = false;
  }

  savePosition() {
    if (!this.posForm.NamaJabatan.trim()) return;
    this.errorMessage = '';
    if (this.posForm.ID) {
      this.http.put(`http://localhost:8080/api/v1/admin/organization/positions/${this.posForm.ID}`, this.posForm, { headers: this.getHeaders() }).subscribe({
        next: () => {
          this.loadPositions();
          this.closePosModal();
        },
        error: (err) => this.errorMessage = err.error?.error || 'Gagal menyimpan jabatan.'
      });
    } else {
      this.http.post(`http://localhost:8080/api/v1/admin/organization/positions`, this.posForm, { headers: this.getHeaders() }).subscribe({
        next: () => {
          this.loadPositions();
          this.closePosModal();
        },
        error: (err) => this.errorMessage = err.error?.error || 'Gagal menyimpan jabatan.'
      });
    }
  }

  deletePosition(id: number) {
    if (confirm('Yakin ingin menghapus jabatan ini?')) {
      this.http.delete(`http://localhost:8080/api/v1/admin/organization/positions/${id}`, { headers: this.getHeaders() }).subscribe({
        next: () => this.loadPositions(),
        error: (err) => this.errorMessage = err.error?.error || 'Gagal menghapus jabatan.'
      });
    }
  }
}
