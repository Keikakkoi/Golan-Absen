import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { FormsModule } from '@angular/forms';
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component';

@Component({
  selector: 'app-worktype-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, AdminSidebarComponent],
  templateUrl: './worktype-list.component.html',
  styleUrls: ['./worktype-list.component.scss']
})
export class WorktypeListComponent implements OnInit {
  @Input() embedded = false;

  workTypes: any[] = [];
  fieldLocations: any[] = [];
  searchTerm = '';
  modeFilter = '';
  selectedWorkType: any = null;
  isDetailOpen = false;
  isLoadingFieldLocations = false;
  isLoading = true;
  errorMessage = '';

  isModalOpen = false;
  isEditMode = false;
  isSaving = false;

  formData: any = {
    id: null,
    Nama: '',
    RadiusYangBerlaku: 'kantor',
    CanonicalType: 'wfo',
    FieldLocationID: null,
    FieldLocationName: '',
    FieldLocationActive: true
  };

  private baseUrl = 'http://localhost:8080/api/v1/admin/worktypes';
  private publicUrl = 'http://localhost:8080/api/v1/worktypes';

  constructor(private http: HttpClient, private authService: AuthService, private alert: AlertService) {}

  ngOnInit(): void {
    this.loadWorkTypes();
    this.loadFieldLocations();
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
  }

  loadWorkTypes(): void {
    this.isLoading = true;
    this.http.get<any[]>(this.baseUrl, { headers: this.getHeaders() }).subscribe({
      next: (data) => {
        this.workTypes = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Gagal memuat tipe kerja: ' + (err.error?.error || 'Unknown error');
        this.isLoading = false;
      }
    });
  }

  loadFieldLocations(): void {
    this.isLoadingFieldLocations = true;
    this.http.get<any>('http://localhost:8080/api/v1/admin/locations/field?status=active&limit=100&sort=name&order=asc', { headers: this.getHeaders() }).subscribe({
      next: (response) => {
        this.fieldLocations = Array.isArray(response) ? response : (response?.data || []);
        this.isLoadingFieldLocations = false;
      },
      error: () => {
        this.fieldLocations = [];
        this.isLoadingFieldLocations = false;
      }
    });
  }

  openAddModal(): void {
    this.isEditMode = false;
    this.formData = { id: null, Nama: '', RadiusYangBerlaku: 'kantor', CanonicalType: 'wfo', FieldLocationID: null, FieldLocationName: '', FieldLocationActive: true };
    this.isModalOpen = true;
  }

  openEditModal(wt: any): void {
    this.isEditMode = true;
    this.formData = {
      id: wt.ID,
      Nama: wt.Nama,
      RadiusYangBerlaku: this.validationMode(wt),
      CanonicalType: this.canonicalType(wt),
      FieldLocationID: wt.field_location_id ?? wt.FieldLocationID ?? null,
      FieldLocationName: wt.field_location_name ?? wt.FieldLocationName ?? '',
      FieldLocationActive: wt.field_location_active ?? wt.FieldLocationActive ?? true
    };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  openDetailModal(workType: any): void {
    const id = workType?.ID ?? workType?.id;
    if (!id) return;
    this.http.get<any>(`${this.baseUrl}/${id}`, { headers: this.getHeaders() }).subscribe({
      next: (detail) => {
        this.selectedWorkType = detail;
        this.isDetailOpen = true;
      },
      error: (err) => this.alert.error('Gagal memuat detail tipe kerja', err.error?.error || 'Gagal memuat detail')
    });
  }

  closeDetailModal(): void {
    this.isDetailOpen = false;
    this.selectedWorkType = null;
  }

  filteredWorkTypes(): any[] {
    const search = this.searchTerm.trim().toLowerCase();
    return this.workTypes.filter(workType => {
      const matchesSearch = !search || String(workType?.Nama || '').toLowerCase().includes(search) || this.validationLabel(workType).toLowerCase().includes(search);
      const matchesMode = !this.modeFilter || this.canonicalType(workType) === this.modeFilter;
      return matchesSearch && matchesMode;
    }).sort((left, right) => {
      const rankDifference = this.workTypeSortRank(left) - this.workTypeSortRank(right);
      if (rankDifference !== 0) return rankDifference;
      return String(left?.Nama || '').localeCompare(String(right?.Nama || ''), 'id', { sensitivity: 'base' });
    });
  }

  workTypeSortRank(workType: any): number {
    const canonical = this.canonicalType(workType);
    if (canonical === 'wfo') return 0;
    if (canonical === 'wfh') return 1;

    const name = String(workType?.Nama || '').trim().toLowerCase();
    if (name === 'dinas luar') return 2;
    if (canonical === 'alternative_location') return 3;
    if (canonical === 'field_location') return 4;
    return 5;
  }

  async saveWorkType(): Promise<void> {
    if (!this.formData.Nama?.trim()) {
      await this.alert.error('Data belum lengkap', 'Nama tipe kerja wajib diisi.');
      return;
    }
    if (!this.formData.RadiusYangBerlaku) {
      await this.alert.error('Data belum lengkap', 'Mode validasi lokasi wajib dipilih.');
      return;
    }
    if (this.formData.CanonicalType === 'field_location' && !this.formData.FieldLocationID) {
      await this.alert.error('Data belum lengkap', 'Lokasi Lapangan aktif wajib dipilih dari master Manajemen Lokasi.');
      return;
    }
    const action = this.isEditMode ? 'mengubah tipe kerja ini' : 'menyimpan tipe kerja baru';
    if (!await this.alert.confirm('Konfirmasi perubahan', `Apakah Anda yakin ingin ${action}?`)) return;
    this.isSaving = true;
    const canonicalType = this.formData.CanonicalType || 'wfo';
    const body = {
      Nama: this.formData.Nama.trim(),
      RadiusYangBerlaku: this.radiusModeForCanonical(canonicalType),
      canonical_type: canonicalType === 'tanpa_validasi' ? null : canonicalType,
      field_location_id: canonicalType === 'field_location' ? Number(this.formData.FieldLocationID) : null
    };

    const req = this.isEditMode 
      ? this.http.put(`${this.baseUrl}/${this.formData.id}`, body, { headers: this.getHeaders() })
      : this.http.post(this.baseUrl, body, { headers: this.getHeaders() });

    req.subscribe({
      next: () => {
        this.isSaving = false;
        this.closeModal();
        this.loadWorkTypes();
        this.alert.success(this.isEditMode ? 'Tipe kerja diperbarui' : 'Tipe kerja disimpan');
      },
      error: (err) => {
        this.alert.error('Gagal menyimpan tipe kerja', err.error?.error || 'Gagal menyimpan');
        this.isSaving = false;
      }
    });
  }

  validationMode(workType: any): string {
    const canonical = this.canonicalType(workType);
    if (canonical === 'wfo') return 'kantor';
    if (canonical === 'wfh') return 'rumah';
    if (canonical === 'alternative_location') return 'alternatif';
    if (canonical === 'field_location') return 'lapangan';
    const configured = String(workType?.RadiusYangBerlaku || '').trim().toLowerCase();
    if (configured === 'rumah' || configured === 'tanpa_validasi') return configured;
    if (workType?.IsHomeBase) return 'rumah';
    if (configured === 'kantor' || String(workType?.Nama || '').trim().toUpperCase() === 'WFO') return 'kantor';
    return 'tanpa_validasi';
  }

  validationLabel(workType: any): string {
    switch (this.canonicalType(workType)) {
      case 'wfo': return 'Kantor';
      case 'wfh': return 'Rumah';
      case 'alternative_location': return 'Lokasi Alternatif';
      case 'field_location': return 'Lokasi Lapangan';
      default: return 'Tidak ada';
    }
  }

  canonicalType(workType: any): string {
    const canonical = String(workType?.canonical_type || workType?.CanonicalType || '').trim().toLowerCase();
    if (['wfo', 'wfh', 'alternative_location', 'field_location'].includes(canonical)) return canonical;
    const mode = String(workType?.RadiusYangBerlaku || '').trim().toLowerCase();
    if (mode === 'rumah' || workType?.IsHomeBase) return 'wfh';
    if (mode === 'kantor' || String(workType?.Nama || '').trim().toUpperCase() === 'WFO') return 'wfo';
    if (mode === 'alternatif' || mode === 'alternative_location' || String(workType?.Nama || '').trim().toLowerCase() === 'lokasi alternatif') return 'alternative_location';
    if (mode === 'lapangan' || mode === 'field_location') return 'field_location';
    return 'tanpa_validasi';
  }

  radiusModeForCanonical(canonical: string): string {
    switch (canonical) {
      case 'wfo': return 'kantor';
      case 'wfh': return 'rumah';
      case 'alternative_location': return 'alternatif';
      case 'field_location': return 'lapangan';
      default: return 'tanpa_validasi';
    }
  }

  selectableFieldLocations(): any[] {
    const currentID = Number(this.formData.FieldLocationID || 0);
    const current = currentID && !this.fieldLocations.some(location => Number(location.ID ?? location.id) === currentID)
      ? [{ ID: currentID, NamaLokasi: this.formData.FieldLocationName || 'Lokasi lapangan tersimpan', StatusAktif: 'inactive', archived: true }]
      : [];
    return [...this.fieldLocations, ...current];
  }

  async deleteWorkType(id: number): Promise<void> {
    if (await this.alert.confirm('Hapus tipe kerja?', 'Tipe kerja ini akan dihapus dari sistem.', 'Ya, hapus')) {
      this.http.delete(`${this.baseUrl}/${id}`, { headers: this.getHeaders() }).subscribe({
        next: () => { this.loadWorkTypes(); this.alert.success('Tipe kerja dihapus'); },
        error: (err) => this.alert.error('Gagal menghapus tipe kerja', err.error?.error || 'Gagal menghapus')
      });
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
