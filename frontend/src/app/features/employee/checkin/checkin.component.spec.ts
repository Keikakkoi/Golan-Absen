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

    expect(component.workTypes.map(type => type.Nama)).toEqual(['WFO', 'WFH', 'Dinas Luar']);
    expect(component.workTypes.find(type => type.Nama === 'Dinas Luar').IsHomeBase).toBeFalse();
  });

  it('does not replace the work type stored on today\'s attendance record', () => {
    component.hasCheckedIn = true;
    component.todayRecord = { TipeKerja: 'Dinas Luar' };

    (component as any).applyWorkTypes([{ Nama: 'WFO', IsHomeBase: false }, { Nama: 'WFH', IsHomeBase: true }]);

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
