import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';

import { AuthService } from '../../../core/services/auth.service';
import { ReportExportService } from '../../../core/services/report-export.service';
import { AdminReportsComponent } from './admin-reports.component';

describe('AdminReportsComponent sorting', () => {
  let component: AdminReportsComponent;

  beforeEach(() => {
    component = new AdminReportsComponent(
      {} as HttpClient,
      { getToken: () => null } as AuthService,
      { snapshot: { data: {} } } as ActivatedRoute,
      {} as DomSanitizer,
      {} as ReportExportService
    );
    component.allReports = [
      { Tanggal: '2026-10-01', Employee: { User: { Nama: 'Citra' } } },
      { Tanggal: '2026-10-07', Employee: { User: { Nama: 'Andi' } } },
      { Tanggal: '2026-10-03', Employee: { User: { Nama: 'Budi' } } }
    ];
  });

  it('uses the explicit newest date sort as the default', () => {
    expect(component.filters.sort_order).toBe('date_desc');
  });

  it('sorts attendance dates newest first and oldest first', () => {
    component.filters.sort_order = 'date_desc';
    component.applyFilters();
    expect(component.reports.map(report => report.Tanggal)).toEqual([
      '2026-10-07', '2026-10-03', '2026-10-01'
    ]);

    component.filters.sort_order = 'date_asc';
    component.applyFilters();
    expect(component.reports.map(report => report.Tanggal)).toEqual([
      '2026-10-01', '2026-10-03', '2026-10-07'
    ]);
  });

  it('keeps both name sort directions unchanged', () => {
    component.filters.sort_order = 'name_asc';
    component.applyFilters();
    expect(component.reports.map(report => report.Employee.User.Nama)).toEqual(['Andi', 'Budi', 'Citra']);

    component.filters.sort_order = 'name_desc';
    component.applyFilters();
    expect(component.reports.map(report => report.Employee.User.Nama)).toEqual(['Citra', 'Budi', 'Andi']);
  });

  it('applies a changed date filter immediately without reloading reports', () => {
    component.filters.sort_order = 'date_asc';
    component.onLocalFilterChange();

    expect(component.reports[0].Tanggal).toBe('2026-10-01');
    expect(component.reports[2].Tanggal).toBe('2026-10-07');
  });

  it('maps late attendance to Hadir and gives missing checkout priority', () => {
    expect(component.attendanceStatus({ Status: 'Hadir' })).toBe('Hadir');
    expect(component.attendanceStatus({ Status: 'Terlambat' })).toBe('Hadir');
    expect(component.attendanceStatus({ Status: 'Hadir', IsCheckoutMissing: true })).toBe('Belum Check-out');
    expect(component.attendanceStatus({ Status: 'Alpha', IsCheckoutMissing: true })).toBe('Belum Check-out');
  });

  it('filters every report using the same status shown in the table', () => {
    component.allReports = [
      { Status: 'Hadir' },
      { Status: 'Terlambat' },
      { Status: 'Hadir', IsCheckoutMissing: true },
      { Status: 'Alpha' },
      { Status: 'Izin' },
      { Status: 'Cuti' }
    ];

    const expected: Record<string, number> = {
      Hadir: 2,
      'Belum Check-out': 1,
      Alpha: 1,
      Izin: 1,
      Cuti: 1,
      Semua: 6
    };

    for (const [status, count] of Object.entries(expected)) {
      component.filters.status = status;
      component.applyFilters();
      expect(component.reports.length).withContext(status).toBe(count);
      expect(component.reports.every(report => status === 'Semua' || component.attendanceStatus(report) === status)).toBeTrue();
    }
  });
});
