import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface EmployeePreferences {
  darkMode: boolean;
  emailNotification: boolean;
  inAppNotification: boolean;
}

const DEFAULT_PREFERENCES: EmployeePreferences = {
  darkMode: false,
  emailNotification: true,
  inAppNotification: true
};

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly darkModeEnabledSubject = new BehaviorSubject<boolean>(
    this.readPreferences().darkMode
  );
  private readonly darkModeSubject = new BehaviorSubject<boolean>(false);

  readonly darkModeEnabled$ = this.darkModeEnabledSubject.asObservable();
  readonly darkMode$ = this.darkModeSubject.asObservable();

  constructor() {
    // Public pages (especially login) always use the normal light palette.
    // Restore a saved dark theme only when an authenticated session exists.
    if (localStorage.getItem('token')) {
      this.applyStoredTheme();
    } else {
      this.clearActiveTheme();
    }
  }

  getPreferences(): EmployeePreferences {
    return this.readPreferences();
  }

  /** Switches the storage namespace when the authenticated account changes. */
  setUserContext(userId: number | string | null): void {
    if (userId === null || userId === undefined || String(userId) === '') return;
    localStorage.setItem('user_id', String(userId));
    const preferences = this.readPreferences();
    this.darkModeEnabledSubject.next(preferences.darkMode);
    this.setActiveTheme(preferences.darkMode && this.readTheme() !== 'light');
  }

  savePreferences(preferences: EmployeePreferences): void {
    const key = this.scopedKey('employee_preferences');
    if (!key) return;
    localStorage.setItem(key, JSON.stringify(preferences));
    this.darkModeEnabledSubject.next(preferences.darkMode);

    // Profile controls whether the navbar switcher is available. Enabling it
    // must not change the current palette; the navbar button does that.
    if (!preferences.darkMode) this.clearActiveTheme(true);
  }

  toggleTheme(syncPreference = false): void {
    const darkMode = !this.darkModeSubject.value;

    // For regular users, the Profile checkbox controls whether the navbar
    // toggle is available; turning the active palette off must not disable
    // that checkbox and make the toggle disappear.
    if (syncPreference) {
      const preferences = this.readPreferences();
      this.savePreferences({ ...preferences, darkMode });
      // A navbar click is an explicit request to change the active palette;
      // unlike Profile save, it should apply immediately.
      this.setActiveTheme(darkMode);
      return;
    }

    if (this.darkModeEnabledSubject.value) this.setActiveTheme(darkMode);
  }

  applyStoredTheme(): void {
    // Read the scoped preference again instead of relying only on the subject.
    // This matters when the account context was restored after this service
    // was constructed, or when another settings screen just saved a value.
    const preferences = this.readPreferences();
    this.darkModeEnabledSubject.next(preferences.darkMode);
    this.setActiveTheme(preferences.darkMode && this.readTheme() === 'dark');
  }

  clearActiveTheme(persistLight = false): void {
    document.body.classList.remove('dark-theme');
    if (persistLight) {
      const key = this.scopedKey('theme');
      if (key) localStorage.setItem(key, 'light');
    }
    this.darkModeSubject.next(false);
  }

  private setActiveTheme(isDark: boolean): void {
    const active = isDark && this.darkModeEnabledSubject.value;
    document.body.classList.toggle('dark-theme', active);
    const key = this.scopedKey('theme');
    if (key) localStorage.setItem(key, active ? 'dark' : 'light');
    this.darkModeSubject.next(active);
  }

  private readPreferences(): EmployeePreferences {
    const key = this.scopedKey('employee_preferences');
    if (!key) return { ...DEFAULT_PREFERENCES };
    const rawPreferences = localStorage.getItem(key);
    if (!rawPreferences) return { ...DEFAULT_PREFERENCES };

    try {
      const parsed = JSON.parse(rawPreferences);
      return { ...DEFAULT_PREFERENCES, ...(parsed || {}) };
    } catch {
      localStorage.removeItem(key);
      return { ...DEFAULT_PREFERENCES };
    }
  }

  private readTheme(): string {
    const key = this.scopedKey('theme');
    return key ? (localStorage.getItem(key) || 'light') : 'light';
  }

  private scopedKey(name: string): string | null {
    const userId = localStorage.getItem('user_id');
    return userId ? `golan:${name}:user:${userId}` : null;
  }
}
