import { CheckinComponent } from './checkin.component';

describe('CheckinComponent', () => {
  let component: CheckinComponent;

  beforeEach(() => {
    component = new CheckinComponent(null as any, null as any, null as any, null as any);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps WFO, WFH, and Dinas Luar available when the API is empty', () => {
    (component as any).applyWorkTypes([]);

    expect(component.workTypes.map(type => type.Nama)).toEqual(['WFO', 'WFH', 'Lokasi Alternatif', 'Dinas Luar']);
    expect(component.workTypes.find(type => type.Nama === 'WFO').RadiusYangBerlaku).toBe('kantor');
    expect(component.workTypes.find(type => type.Nama === 'WFH').RadiusYangBerlaku).toBe('rumah');
    expect(component.workTypes.find(type => type.Nama === 'Dinas Luar').RadiusYangBerlaku).toBe('tanpa_validasi');
  });

  it('only exposes approved active alternative locations and configured active field locations', () => {
    expect((component as any).isApprovedActiveAlternative({ status: 'pending', status_aktif: 'active' })).toBeFalse();
    expect((component as any).isApprovedActiveAlternative({ status: 'approved', status_aktif: 'inactive' })).toBeFalse();
    expect((component as any).isApprovedActiveAlternative({ status: 'approved', status_aktif: 'active' })).toBeTrue();

    component.fieldLocations = [{ id: 12, status_aktif: 'active' }];
    component.workTypes = [
      { Nama: 'Lapangan Aktif', canonical_type: 'field_location', field_location_id: 12 },
      { Nama: 'Lapangan Nonaktif', canonical_type: 'field_location', field_location_id: 13, field_location_active: false },
      { Nama: 'WFO', canonical_type: 'wfo' }
    ];
    expect(component.selectableWorkTypes().map(type => type.Nama)).toEqual(['Lapangan Aktif', 'WFO']);
  });

  it('validates selected alternative geofence and prepares canonical location references', () => {
    component.workTypes = [{ Nama: 'Lokasi Alternatif', canonical_type: 'alternative_location' }];
    component.tipeKerja = 'Lokasi Alternatif';
    component.alternativeLocations = [{ id: 22, nama_lokasi: 'Rumah Kedua', deskripsi: 'Alamat', latitude: -6.2, longitude: 106.8, radius_meter: 100, status: 'approved', status_aktif: 'active' }];
    component.selectedAlternativeLocationId = 22;
    component.isGpsActive = true;
    component.currentAccuracy = 0;
    component.currentLat = -6.2;
    component.currentLng = 106.8;
    (component as any).checkRadius();
    expect(component.isLocationValid).toBeTrue();
    expect((component as any).attendanceLocationSelection()).toEqual({ canonicalType: 'alternative_location', alternativeLocationId: 22, fieldLocationId: null });

    component.currentLat = -6.21;
    (component as any).checkRadius();
    expect(component.isLocationValid).toBeFalse();
    expect(component.locationError).toContain('di luar radius');
  });

  it('does not replace the work type stored on today\'s attendance record', () => {
    component.hasCheckedIn = true;
    component.todayRecord = { TipeKerja: 'Dinas Luar' };

    (component as any).applyWorkTypes([{ Nama: 'WFO', RadiusYangBerlaku: 'kantor' }, { Nama: 'WFH', RadiusYangBerlaku: 'rumah' }]);

    expect(component.tipeKerja).toBe('Dinas Luar');
    expect(component.workTypes.some(type => type.Nama === 'Dinas Luar')).toBeTrue();
  });

  it('does not evaluate time or show a late-deadline state on a non-working day', () => {
    component.isScheduleLoaded = true;
    component.isWorkingDay = false;
    component.hasLeaveToday = true;
    component.attendanceClosed = true;
    component.todayDashboardMessage = 'Batas absensi hari ini telah lewat.';

    (component as any).updateAttendanceWindow();

    expect(component.canPunchBySchedule).toBeFalse();
    expect(component.attendanceClosed).toBeFalse();
    expect(component.scheduleMessage).toBe('Hari ini bukan hari kerja untuk shift Anda.');
  });

  it('uses complete datetimes for a late-evening checkout deadline', () => {
    component.isScheduleLoaded = true;
    component.currentTime = new Date('2026-09-15T23:30:00+07:00');
    component.hasCheckedIn = false;
    component.isCheckoutPage = false;
    (component as any).scheduleStartAt = new Date('2026-09-15T18:23:00+07:00');
    (component as any).scheduleCheckinStartAt = new Date('2026-09-15T18:23:00+07:00');
    (component as any).scheduleEndAt = new Date('2026-09-15T23:00:00+07:00');
    (component as any).scheduleDeadlineAt = new Date('2026-09-16T00:00:00+07:00');

    (component as any).updateAttendanceWindow();

    expect(component.attendanceClosed).toBeFalse();
    expect(component.scheduleMessage).not.toContain('Batas absensi hari ini telah lewat');

    component.currentTime = new Date('2026-09-16T00:01:00+07:00');
    (component as any).updateAttendanceWindow();
    expect(component.attendanceClosed).toBeTrue();
  });
});
