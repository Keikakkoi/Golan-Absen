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
});
