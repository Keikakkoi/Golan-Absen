import { of, throwError } from 'rxjs';
import { AdminNotificationSettingsComponent } from './admin-notification-settings.component';

describe('AdminNotificationSettingsComponent', () => {
  let component: AdminNotificationSettingsComponent;
  let http: jasmine.SpyObj<any>;
  let auth: jasmine.SpyObj<any>;
  let alert: jasmine.SpyObj<any>;

  const settings = [
    { TipeNotifikasi: 'Info Admin', Role: 'HRD', IsEmailEnabled: true, IsInAppEnabled: true },
    { TipeNotifikasi: 'Kehadiran WFH', Role: 'HRD', IsEmailEnabled: true, IsInAppEnabled: true },
    { TipeNotifikasi: 'Keterlambatan', Role: 'HRD', IsEmailEnabled: true, IsInAppEnabled: true },
    { TipeNotifikasi: 'Pengajuan Izin', Role: 'HRD', IsEmailEnabled: true, IsInAppEnabled: true },
    { TipeNotifikasi: 'Pengajuan Lokasi WFH', Role: 'HRD', IsEmailEnabled: true, IsInAppEnabled: true }
  ];

  beforeEach(() => {
    http = jasmine.createSpyObj('HttpClient', ['put']);
    auth = jasmine.createSpyObj('AuthService', ['getToken']);
    alert = jasmine.createSpyObj('AlertService', ['confirm', 'success', 'error', 'info']);
    auth.getToken.and.returnValue('token');
    alert.confirm.and.resolveTo(true);
    component = new AdminNotificationSettingsComponent(http, auth, alert);
    component.settings = settings.map(setting => ({ ...setting }));
    (component as any).savedSettings = component.settings.map(setting => ({ ...setting }));
    (component as any).savedState = (component as any).settingsState();
  });

  it('counts in-app status independently from email status', () => {
    component.settings[0].IsInAppEnabled = false;
    expect(component.totalToggleCount).toBe(10);
    expect(component.activeCount).toBe(9);
    expect(component.inactiveCount).toBe(1);
    expect(component.emailCount).toBe(5);
    expect(component.inAppCount).toBe(4);
  });

  it('uses in-app status for the active filter and bulk action state', () => {
    component.settings[0].IsInAppEnabled = false;
    component.statusFilter = 'inactive';
    expect(component.visibleSettings.map(setting => setting.TipeNotifikasi)).toEqual(['Info Admin']);

    component.setAllChannels(false);
    expect(component.inAppCount).toBe(0);
    expect(component.activeCount).toBe(0);
    expect(component.inactiveCount).toBe(10);
  });

  it('restores the previous UI state and reports an error when saving fails', async () => {
    const previous = component.settings.map(setting => ({ ...setting }));
    component.settings[0].IsInAppEnabled = false;
    http.put.and.returnValue(throwError(() => ({ status: 500, error: { error: 'Gagal menyimpan' } })));
    await component.saveSettings();

    expect(component.settings).toEqual(previous);
    expect(component.errorMessage).toBe('Gagal menyimpan');
    expect(alert.error).toHaveBeenCalled();
  });

  it('uses the API response as the durable saved state', async () => {
    const response = settings.map(setting => ({ ...setting, IsInAppEnabled: false }));
    component.settings[0].IsInAppEnabled = false;
    http.put.and.returnValue(of(response));
    await component.saveSettings();

    expect(component.settings).toEqual(response);
    expect(component.hasUnsavedChanges).toBeFalse();
    expect(component.activeCount).toBe(5);
    expect(component.inactiveCount).toBe(5);
  });
});
