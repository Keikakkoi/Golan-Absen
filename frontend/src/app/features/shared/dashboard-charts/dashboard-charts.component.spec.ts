import { DashboardChartsComponent } from './dashboard-charts.component';

describe('DashboardChartsComponent report status colors', () => {
  let component: DashboardChartsComponent;

  beforeEach(() => {
    component = new DashboardChartsComponent({} as any, {} as any, {} as any);
  });

  it('keeps canonical report buckets visually distinct', () => {
    expect(component.color('Belum Membuat Laporan Kerja')).toBe(component.chartTheme.status.neutral);
    expect(component.color('Menunggu Review')).toBe(component.chartTheme.status.pending);
    expect(component.color('Disetujui')).toBe(component.chartTheme.status.hadir);
    expect(component.color('Ditolak')).toBe(component.chartTheme.status.alfa);
  });
});
