import { ThemeService, EmployeePreferences } from './theme.service';

describe('ThemeService per-user preferences', () => {
  let service: ThemeService;
  const preferences = (darkMode: boolean): EmployeePreferences => ({
    darkMode,
    emailNotification: true,
    inAppNotification: true
  });

  beforeEach(() => {
    localStorage.clear();
    document.body.className = '';
    service = new ThemeService();
  });

  it('keeps User A and User B preferences isolated', () => {
    service.setUserContext(101);
    service.savePreferences(preferences(false));
    service.setUserContext(202);
    service.savePreferences(preferences(true));

    service.setUserContext(101);
    expect(service.getPreferences().darkMode).toBeFalse();
    service.setUserContext(202);
    expect(service.getPreferences().darkMode).toBeTrue();
  });

  it('does not share a regular user preference with admin', () => {
    service.setUserContext(101);
    service.savePreferences(preferences(false));
    service.setUserContext(1);
    expect(service.getPreferences().darkMode).toBeFalse();
    service.savePreferences(preferences(true));
    service.setUserContext(101);
    expect(service.getPreferences().darkMode).toBeFalse();
  });

  it('turns the palette off without disabling the regular user switcher', () => {
    service.setUserContext(1);
    service.savePreferences(preferences(true));
    service.toggleTheme();
    service.toggleTheme();
    expect(service.getPreferences().darkMode).toBeTrue();
    expect(document.body.classList.contains('dark-theme')).toBeFalse();
    service.toggleTheme();
    expect(document.body.classList.contains('dark-theme')).toBeTrue();
  });

  it('persists admin navbar toggles as the same profile preference', () => {
    service.setUserContext(1);
    service.savePreferences(preferences(false));
    service.toggleTheme(true);
    expect(service.getPreferences().darkMode).toBeTrue();
    expect(document.body.classList.contains('dark-theme')).toBeTrue();
    service.toggleTheme(true);
    expect(service.getPreferences().darkMode).toBeFalse();
  });

  it('only enables the navbar switcher when Profile enables dark mode', () => {
    service.setUserContext(303);
    service.savePreferences(preferences(true));
    expect(service.getPreferences().darkMode).toBeTrue();
    expect(document.body.classList.contains('dark-theme')).toBeFalse();
  });

  it('restores the active preference after a refresh-like service recreation', () => {
    service.setUserContext(202);
    service.savePreferences(preferences(true));
    service.toggleTheme();
    service = new ThemeService();
    service.applyStoredTheme();
    expect(service.getPreferences().darkMode).toBeTrue();
    expect(document.body.classList.contains('dark-theme')).toBeTrue();
  });

  it('does not carry User A theme into User B after logout/login', () => {
    service.setUserContext(101);
    service.savePreferences(preferences(true));
    service.clearActiveTheme();
    localStorage.removeItem('user_id');
    service.setUserContext(202);
    service.applyStoredTheme();
    expect(document.body.classList.contains('dark-theme')).toBeFalse();
  });
});
