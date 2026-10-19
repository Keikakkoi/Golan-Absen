import { of } from 'rxjs';
import { StatisticsComponent } from './statistics.component';

describe('StatisticsComponent', () => {
  function createComponent(history: any[] = []) {
    const attendanceService = {
      getHistory: jasmine.createSpy('getHistory').and.returnValue(of(history))
    };
    return { component: new StatisticsComponent(attendanceService as any), attendanceService };
  }

  it('loads a selected date range and applies it to all personal metrics', () => {
    const { component, attendanceService } = createComponent([
      { Tanggal: '2026-10-10', Status: 'Hadir', TipeKerja: 'WFO', JamMasuk: '2026-10-10T02:00:00Z', JamPulang: '2026-10-10T10:00:00Z' },
      { Tanggal: '2026-10-11', Status: 'Hadir', IsLate: true, TipeKerja: 'WFH', JamMasuk: '2026-10-11T02:30:00Z', JamPulang: '2026-10-11T10:30:00Z' },
      { Tanggal: '2026-10-12', Status: 'Izin', TipeKerja: 'WFO' },
      { Tanggal: '2026-10-13', Status: 'Cuti', TipeKerja: 'DINAS LUAR' },
      { Tanggal: '2026-10-14', Status: 'Alpha', TipeKerja: 'REMOTE' }
    ]);

    component.start = '2026-10-10';
    component.end = '2026-10-14';
    component.onDateFilterChange();

    expect(attendanceService.getHistory).toHaveBeenCalledWith('2026-10-10', '2026-10-14');
    expect(component.totalDays).toBe(5);
    expect(component.countHadir).toBe(1);
    expect(component.countTerlambat).toBe(1);
    expect(component.countIzin).toBe(1);
    expect(component.countCuti).toBe(1);
    expect(component.countAlpha).toBe(1);
    expect(component.attendanceRate).toBe(40);
    expect(component.workTypeStats).toEqual({ wfo: 2, wfh: 1, dinasLuar: 2 });
    expect(component.weeklyTrend.length).toBe(5);
  });

  it('allows only one side of the date range and no date filter', () => {
    const { component, attendanceService } = createComponent();

    component.start = '2026-10-10';
    component.onDateFilterChange();
    component.end = '';
    component.start = '';
    component.onDateFilterChange();

    expect(attendanceService.getHistory).toHaveBeenCalledWith('2026-10-10', undefined);
    expect(attendanceService.getHistory).toHaveBeenCalledWith(undefined, undefined);
  });

  it('rejects an inverted date range without making an API request', () => {
    const { component, attendanceService } = createComponent();

    component.start = '2026-10-20';
    component.end = '2026-10-19';
    component.onDateFilterChange();

    expect(component.validationError).toContain('Tanggal mulai');
    expect(attendanceService.getHistory).not.toHaveBeenCalled();
  });
});
