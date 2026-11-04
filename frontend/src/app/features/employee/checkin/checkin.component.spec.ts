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
    expect(component.locationError).toBe('Posisi Anda berada di luar radius lokasi alternatif.');
  });

  it('shows the office configuration error before GPS when WFO is not configured', () => {
    component.workTypes = [{ Nama: 'WFO', RadiusYangBerlaku: 'kantor', canonical_type: 'wfo' }];
    component.tipeKerja = 'WFO';
    component.officeConfigured = false;
    component.isGpsActive = false;
    (component as any).checkRadius();

    expect(component.locationError).toBe('Lokasi kantor belum dikonfigurasi.');
  });

  it('shows the GPS error when WFO is configured but GPS is inactive', () => {
    component.workTypes = [{ Nama: 'WFO', RadiusYangBerlaku: 'kantor', canonical_type: 'wfo' }];
    component.tipeKerja = 'WFO';
    component.officeConfigured = true;
    component.isGpsActive = false;
    (component as any).checkRadius();

    expect(component.locationError).toBe('GPS tidak aktif. Silakan aktifkan GPS dan izinkan akses lokasi.');
  });

  it('shows the office radius error when WFO GPS is outside the geofence', () => {
    component.workTypes = [{ Nama: 'WFO', RadiusYangBerlaku: 'kantor', canonical_type: 'wfo' }];
    component.tipeKerja = 'WFO';
    component.officeConfigured = true;
    component.isGpsActive = true;
    component.currentLat = -6.13;
    component.currentLng = 106.71;
    (component as any).checkRadius();

    expect(component.locationError).toBe('Posisi Anda berada di luar radius kantor.');
  });

  it('does not reuse the office error for an alternative location with GPS inactive', () => {
    component.workTypes = [{ Nama: 'Lokasi Alternatif', canonical_type: 'alternative_location' }];
    component.tipeKerja = 'Lokasi Alternatif';
    component.officeConfigured = false;
    component.locationError = 'Lokasi kantor belum dikonfigurasi.';
    component.alternativeLocations = [{ id: 22, nama_lokasi: 'Rumah Kedua', latitude: -6.2, longitude: 106.8, radius_meter: 100 }];
    component.selectedAlternativeLocationId = 22;
    component.isGpsActive = false;
    (component as any).checkRadius();

    expect(component.locationError).toBe('GPS tidak aktif. Silakan aktifkan GPS dan izinkan akses lokasi.');
    expect(component.locationError).not.toContain('Lokasi kantor');
  });

  it('uses the alternative-location radius messages and clears the error in range', () => {
    component.workTypes = [{ Nama: 'Lokasi Alternatif', canonical_type: 'alternative_location' }];
    component.tipeKerja = 'Lokasi Alternatif';
    component.alternativeLocations = [{ id: 22, nama_lokasi: 'Rumah Kedua', latitude: -6.2, longitude: 106.8, radius_meter: 100 }];
    component.selectedAlternativeLocationId = 22;
    component.isGpsActive = true;
    component.currentLat = -6.21;
    component.currentLng = 106.8;
    (component as any).checkRadius();
    expect(component.locationError).toBe('Posisi Anda berada di luar radius lokasi alternatif.');

    component.currentLat = -6.2;
    (component as any).checkRadius();
    expect(component.locationError).toBe('');
    expect(component.isLocationValid).toBeTrue();
    expect(component.statusText).toBe('Lokasi terverifikasi');
  });

  it('requires an alternative location selection before distance validation', () => {
    component.workTypes = [{ Nama: 'Lokasi Alternatif', canonical_type: 'alternative_location' }];
    component.tipeKerja = 'Lokasi Alternatif';
    component.isGpsActive = true;
    component.currentLat = -6.2;
    component.currentLng = 106.8;
    (component as any).checkRadius();

    expect(component.locationError).toBe('Silakan pilih lokasi alternatif terlebih dahulu.');
  });

  it('clears the office error immediately when switching to an alternative location', () => {
    component.workTypes = [
      { Nama: 'WFO', RadiusYangBerlaku: 'kantor', canonical_type: 'wfo' },
      { Nama: 'Lokasi Alternatif', canonical_type: 'alternative_location' }
    ];
    component.tipeKerja = 'WFO';
    component.officeConfigured = false;
    (component as any).checkRadius();
    expect(component.locationError).toBe('Lokasi kantor belum dikonfigurasi.');

    component.alternativeLocations = [{ id: 22, nama_lokasi: 'Rumah Kedua', latitude: -6.2, longitude: 106.8, radius_meter: 100 }];
    component.selectedAlternativeLocationId = 22;
    component.selectTipeKerja('Lokasi Alternatif');

    expect(component.locationError).not.toContain('Lokasi kantor');
    expect(component.locationError).toBe('GPS tidak aktif. Silakan aktifkan GPS dan izinkan akses lokasi.');
  });

  it('validates the office again when switching back from an alternative location', () => {
    component.workTypes = [
      { Nama: 'WFO', RadiusYangBerlaku: 'kantor', canonical_type: 'wfo' },
      { Nama: 'Lokasi Alternatif', canonical_type: 'alternative_location' }
    ];
    component.tipeKerja = 'Lokasi Alternatif';
    component.officeConfigured = false;
    component.selectTipeKerja('WFO');

    expect(component.locationError).toBe('Lokasi kantor belum dikonfigurasi.');
  });

  it('preserves an alternative location selection when work types load late', () => {
    component.tipeKerja = 'Lokasi Alternatif';

    (component as any).applyWorkTypes([
      { Nama: 'WFO', RadiusYangBerlaku: 'kantor', canonical_type: 'wfo' },
      { Nama: 'WFH', RadiusYangBerlaku: 'rumah', canonical_type: 'wfh' }
    ]);

    expect(component.tipeKerja).toBe('Lokasi Alternatif');
    expect(component.selectedCanonicalType()).toBe('alternative_location');
  });

  it('makes the closed attendance schedule the primary state and clears old location errors', () => {
    component.workTypes = [{ Nama: 'WFO', RadiusYangBerlaku: 'kantor', canonical_type: 'wfo' }];
    component.tipeKerja = 'WFO';
    component.attendanceClosed = true;
    component.canPunchBySchedule = false;
    component.scheduleMessage = 'Batas absensi hari ini sudah lewat';
    component.locationError = 'Lokasi kantor belum dikonfigurasi.';
    (component as any).checkRadius();

    expect(component.locationError).toBe('');
    expect(component.isLocationValid).toBeFalse();
    expect(component.canPunchBySchedule).toBeFalse();
  });

  it('hides location warnings when the check-in cutoff has passed', () => {
    component.canPunchBySchedule = false;
    component.attendanceClosed = false;
    component.scheduleMessage = 'Batas check-in hari ini sudah lewat.';
    component.locationError = 'Lokasi kantor belum dikonfigurasi.';

    expect(component.isScheduleBlockingLocation()).toBeTrue();
    expect(component.locationWarningVisible()).toBeFalse();
  });

  it('does not show GPS errors for a work type without location validation', () => {
    component.workTypes = [{ Nama: 'Dinas Luar', RadiusYangBerlaku: 'tanpa_validasi' }];
    component.tipeKerja = 'Dinas Luar';
    component.isGpsActive = false;
    component.locationError = 'GPS tidak aktif. Silakan aktifkan GPS dan izinkan akses lokasi.';
    (component as any).checkRadius();

    expect(component.locationError).toBe('');
    expect(component.isLocationRequired).toBeFalse();
    expect(component.isLocationValid).toBeTrue();
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
