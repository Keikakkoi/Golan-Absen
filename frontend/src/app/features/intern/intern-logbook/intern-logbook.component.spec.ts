import { ElementRef } from '@angular/core';
import { fakeAsync, tick } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ReportExportService } from '../../../core/services/report-export.service';
import { AlertService } from '../../../core/services/alert.service';
import { InternLogbookComponent } from './intern-logbook.component';

describe('InternLogbookComponent edit flow', () => {
  function createComponent(): InternLogbookComponent {
    const http = { get: () => of(null) } as unknown as HttpClient;
    const auth = { getToken: () => '' } as AuthService;
    return new InternLogbookComponent(
      http,
      auth,
      {} as ReportExportService,
      {} as AlertService
    );
  }

  it('only allows Draft logbooks to enter edit mode', () => {
    const component = createComponent();

    component.edit({ id: 1, status_logbook: 'submitted' });
    expect(component.editingId).toBeNull();

    component.edit({ id: 2, status_logbook: 'draft' });
    expect(component.editingId).toBe(2);
    expect(component.form.status).toBe('draft');

    component.edit({ id: 3, status_logbook: 'rejected' });
    expect(component.editingId).toBe(2);
  });

  it('only allows Draft logbooks to be edited or deleted', () => {
    const component = createComponent();

    expect(component.canEdit({ status_logbook: 'draft' })).toBeTrue();
    expect(component.canDelete({ StatusLogbook: ' Draft ' })).toBeTrue();
    for (const status of [' submitted ', 'approved', 'Rejected']) {
      expect(component.canEdit({ status_logbook: status })).toBeFalse();
      expect(component.canDelete({ status_logbook: status })).toBeFalse();
    }
  });

  it('keeps Rejected logbooks available for detail view without edit/delete actions', () => {
    const component = createComponent();
    const rejected = { ID: 9, StatusLogbook: ' Rejected ', review_notes: 'Perlu diperbaiki', rejection_reason: 'Data belum lengkap' };

    component.viewDetail(rejected);

    expect(component.selectedLogbookDetail).toBe(rejected);
    expect(component.logbookStatus(rejected)).toBe('rejected');
    expect(component.canEdit(rejected)).toBeFalse();
    expect(component.canDelete(rejected)).toBeFalse();
  });

  it('maps validation status independently from logbook status', () => {
    const component = createComponent();

    expect(component.validationStatusLabel({ status_logbook: 'submitted', status_sesuai: '' })).toBe('Menunggu validasi');
    expect(component.validationStatusClass({ status_logbook: 'submitted', status_sesuai: '' })).toBe('validation-status-pending');
    expect(component.validationStatusLabel({ status_logbook: 'approved', StatusSesuai: 'Sesuai' })).toBe('Validasi laporan');
    expect(component.validationStatusClass({ status_logbook: 'approved', StatusSesuai: 'Sesuai' })).toBe('validation-status-approved');
    expect(component.validationStatusLabel({ status_logbook: 'rejected', statusSesuai: 'Tidak Sesuai' })).toBe('Tolak laporan');
    expect(component.validationStatusClass({ status_logbook: 'rejected', statusSesuai: 'Tidak Sesuai' })).toBe('validation-status-rejected');
    expect(component.validationStatusLabel({ status_logbook: 'draft' })).toBe('Draft');
    expect(component.validationStatusClass({ status_logbook: 'draft' })).toBe('validation-status-none');
    expect(component.validationStatusLabel({ status_logbook: 'approved', status_sesuai: '' })).toBe('-');
    expect(component.validationStatusClass({ status_logbook: 'approved', status_sesuai: '' })).toBe('validation-status-none');
  });

  it('keeps the selected logbook data and scrolls to the form after rendering', fakeAsync(() => {
    const component = createComponent();
    const scrollIntoView = jasmine.createSpy('scrollIntoView');
    component.editLogbookForm = {
      nativeElement: { scrollIntoView }
    } as unknown as ElementRef<HTMLElement>;

    component.edit({
      id: 7,
      tanggal: '2026-09-17T00:00:00Z',
      judul_tugas: 'Implementasi fitur',
      deskripsi_kegiatan: 'Mengerjakan form logbook',
      kendala: 'Tidak ada',
      status_logbook: 'draft'
    });
    tick();

    expect(component.form).toEqual({
      tanggal: '2026-09-17',
      judul_tugas: 'Implementasi fitur',
      deskripsi_kegiatan: 'Mengerjakan form logbook',
      realisasi_kegiatan: '',
      kendala: 'Tidak ada',
      rencana_minggu_depan: '',
      link_artikel: '',
      catatan_tambahan: '',
      custom_fields: {},
      status: 'draft'
    });
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest'
    });
  }));
});
