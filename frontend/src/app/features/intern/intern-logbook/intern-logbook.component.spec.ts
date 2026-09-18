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
      tugas: 'Implementasi fitur',
      deskripsi_kegiatan: 'Mengerjakan form logbook',
      kendala: 'Tidak ada',
      status_logbook: 'draft'
    });
    tick();

    expect(component.form).toEqual({
      tanggal: '2026-09-17',
      tugas: 'Implementasi fitur',
      deskripsi_kegiatan: 'Mengerjakan form logbook',
      kendala: 'Tidak ada',
      status: 'draft'
    });
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest'
    });
  }));
});
