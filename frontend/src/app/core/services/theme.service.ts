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
  private readonly preferencesKey = 'employee_preferences';
  private readonly themeKey = 'theme';
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

  savePreferences(preferences: EmployeePreferences): void {
    localStorage.setItem(this.preferencesKey, JSON.stringify(preferences));
    this.darkModeEnabledSubject.next(preferences.darkMode);

    // The profile checkbox is the user's explicit request to enable/disable
    // dark mode, so apply it immediately. The sidebar can still toggle the
    // active palette afterwards and the choice remains persisted in `theme`.
    this.setActiveTheme(preferences.darkMode);
  }

  toggleTheme(): void {
    if (!this.darkModeEnabledSubject.value) return;
    this.setActiveTheme(!this.darkModeSubject.value);
  }

  applyStoredTheme(): void {
    const enabled = this.darkModeEnabledSubject.value;
    this.setActiveTheme(enabled && localStorage.getItem(this.themeKey) === 'dark');
  }

  clearActiveTheme(): void {
    document.body.classList.remove('dark-theme');
    this.darkModeSubject.next(false);
  }

  private setActiveTheme(isDark: boolean): void {
    const active = isDark && this.darkModeEnabledSubject.value;
    document.body.classList.toggle('dark-theme', active);
    localStorage.setItem(this.themeKey, active ? 'dark' : 'light');
    this.darkModeSubject.next(active);
  }

  private readPreferences(): EmployeePreferences {
    const rawPreferences = localStorage.getItem(this.preferencesKey);
    if (!rawPreferences) return { ...DEFAULT_PREFERENCES };

    try {
      const parsed = JSON.parse(rawPreferences);
      return { ...DEFAULT_PREFERENCES, ...(parsed || {}) };
    } catch {
      localStorage.removeItem(this.preferencesKey);
      return { ...DEFAULT_PREFERENCES };
    }
  }
}
