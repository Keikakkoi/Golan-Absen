import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { ProfileComponent } from './profile.component';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { ThemeService } from '../../../core/services/theme.service';

describe('ProfileComponent resilience', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let http: HttpTestingController;
  let auth: jasmine.SpyObj<AuthService>;
  let alert: jasmine.SpyObj<AlertService>;
  const profile = { ID: 1, Nama: 'Sari', Email: 'sari@example.test', Role: 'KARYAWAN', Status: 'AKTIF', Employee: { NIK: 'NIK-1', Division: {}, Position: {}, HomeLocation: null }, WorkSchedules: [] };

  beforeEach(async () => {
    auth = jasmine.createSpyObj('AuthService', ['getToken', 'getRole']);
    auth.getToken.and.returnValue('token');
    auth.getRole.and.returnValue('Karyawan');
    (auth as any).currentUser$ = of(null);
    alert = jasmine.createSpyObj('AlertService', ['confirm', 'success', 'error']);
    alert.confirm.and.resolveTo(true);
    alert.error.and.resolveTo(undefined);
    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(),
        { provide: AuthService, useValue: auth }, { provide: AlertService, useValue: alert },
        { provide: ThemeService, useValue: {
          getPreferences: () => ({ darkMode: false, emailNotification: true, inAppNotification: true }),
          savePreferences: jasmine.createSpy(),
          darkModeEnabled$: of(false),
          darkMode$: of(false)
        } },
        { provide: ActivatedRoute, useValue: { queryParamMap: of(new Map()) } }]
    }).compileComponents();
    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    component.activeTab = 'settings';
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  function profileRequest() { return http.expectOne('http://localhost:8080/api/v1/employee/profile'); }
  function flushSecondaryRequests() {
    http.expectOne('http://localhost:8080/api/v1/employee/profile/home-location').flush({ active: null });
    http.expectOne('http://localhost:8080/api/v1/employee/profile/home-location/requests').flush([]);
  }
  function loadTestProfile() {
    profileRequest().flush(profile);
    flushSecondaryRequests();
  }
  afterEach(() => http.verify());

  it('normalizes profile envelopes and nested fallbacks', () => {
    profileRequest().flush({ data: { user: profile } }); flushSecondaryRequests(); fixture.detectChanges();
    expect(component.isLoading).toBeFalse();
    expect(component.profileData.Nama).toBe('Sari');
    expect(component.profileData.Employee.Division).toEqual({});
    expect(component.profileData.WorkSchedules).toEqual([]);
  });
  it('renders retry state when profile API fails', () => {
    profileRequest().flush({ error: 'down' }, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(component.isLoading).toBeFalse(); expect(component.errorMessage).toBe('down');
  });
  it('handles empty profile response without throwing', () => {
    profileRequest().flush(null); expect(component.isLoading).toBeFalse(); expect(component.errorMessage).toContain('Data profil');
  });
  it('keeps profile rendered when home location fails', () => {
    profileRequest().flush(profile);
    http.expectOne('http://localhost:8080/api/v1/employee/profile/home-location').flush({ error: 'down' }, { status: 500, statusText: 'Server error' });
    expect(component.profileData.Nama).toBe('Sari'); expect(component.homeLocationLoading).toBeFalse();
  });
  it('keeps old data when save succeeds but reload fails', fakeAsync(() => {
    profileRequest().flush(profile); flushSecondaryRequests(); component.updateForm.nama = 'Sari Baru'; component.updateProfile(); tick();
    http.expectOne(req => req.method === 'PUT' && req.url.endsWith('/employee/profile')).flush({ message: 'ok' });
    profileRequest().flush({ error: 'down' }, { status: 503, statusText: 'Unavailable' });
    expect(component.profileData.Nama).toBe('Sari Baru'); expect(component.isSubmitting).toBeFalse();
  }));
  it('resets submitting state after save failure', fakeAsync(() => {
    profileRequest().flush(profile); flushSecondaryRequests(); component.updateProfile(); tick();
    http.expectOne(req => req.method === 'PUT' && req.url.endsWith('/employee/profile')).flush({ error: 'bad' }, { status: 400, statusText: 'Bad request' });
    expect(component.isSubmitting).toBeFalse(); expect(component.errorMessage).toContain('bad');
  }));
  it('keeps the profile form open when the old email password is wrong', fakeAsync(() => {
    loadTestProfile();
    component.updateForm.email = 'new@example.test';
    component.updateForm.email_password = 'wrong-password';

    component.updateEmail();
    tick();
    http.expectOne(req => req.method === 'PUT' && req.url.endsWith('/employee/email'))
      .flush({ code: 'invalid_current_password', error: 'Password lama tidak sesuai' }, { status: 422, statusText: 'Unprocessable Entity' });
    tick();

    expect(component.isSubmitting).toBeFalse();
    expect(component.updateForm.email).toBe('new@example.test');
    expect(component.updateForm.email_password).toBe('wrong-password');
    expect(component.profileData.Email).toBe(profile.Email);
    expect(alert.error).toHaveBeenCalledWith('Gagal mengganti email', 'Password lama tidak sesuai.');
  }));
  it('keeps the profile form open when the old account password is wrong', fakeAsync(() => {
    loadTestProfile();
    component.updateForm.old_password = 'wrong-password';
    component.updateForm.password = 'New-password1';
    component.updateForm.confirm_password = 'New-password1';

    component.updatePassword();
    tick();
    http.expectOne(req => req.method === 'PUT' && req.url.endsWith('/employee/profile'))
      .flush({ code: 'invalid_current_password', error: 'Password lama tidak sesuai' }, { status: 422, statusText: 'Unprocessable Entity' });
    tick();

    expect(component.isSubmitting).toBeFalse();
    expect(component.updateForm.old_password).toBe('wrong-password');
    expect(component.updateForm.password).toBe('New-password1');
    expect(component.updateForm.confirm_password).toBe('New-password1');
    expect(alert.error).toHaveBeenCalledWith('Gagal mengubah password', 'Password lama tidak sesuai.');
  }));
  it('updates the email and reloads the profile after a successful change', fakeAsync(() => {
    loadTestProfile();
    component.updateForm.email = 'new@example.test';
    component.updateForm.email_password = 'correct-password';

    component.updateEmail();
    tick();
    http.expectOne(req => req.method === 'PUT' && req.url.endsWith('/employee/email'))
      .flush({ email: 'new@example.test' });
    profileRequest().flush({ ...profile, Email: 'new@example.test' });
    flushSecondaryRequests();
    tick();

    expect(component.profileData.Email).toBe('new@example.test');
    expect(component.updateForm.email_password).toBe('');
    expect(alert.success).toHaveBeenCalledWith('Email berhasil diganti');
  }));
  it('shows duplicate-email errors without redirecting or clearing the form', fakeAsync(() => {
    loadTestProfile();
    component.updateForm.email = 'used@example.test';
    component.updateForm.email_password = 'correct-password';

    component.updateEmail();
    tick();
    http.expectOne(req => req.method === 'PUT' && req.url.endsWith('/employee/email'))
      .flush({ error: 'Email sudah digunakan oleh akun lain' }, { status: 409, statusText: 'Conflict' });
    tick();

    expect(component.isSubmitting).toBeFalse();
    expect(component.updateForm.email).toBe('used@example.test');
    expect(component.updateForm.email_password).toBe('correct-password');
    expect(component.errorMessage).toBe('Email sudah digunakan oleh akun lain');
  }));
  it('resets upload state after upload failure', fakeAsync(() => {
    profileRequest().flush(profile); flushSecondaryRequests(); component.selectedPhoto = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' }); component.uploadProfilePhoto(); tick();
    http.expectOne(req => req.method === 'POST' && req.url.endsWith('/employee/profile/photo')).flush({ error: 'upload failed' }, { status: 500, statusText: 'Server error' });
    expect(component.isUploadingPhoto).toBeFalse();
  }));
  it('ends loading after profile timeout', fakeAsync(() => {
    profileRequest().error(new ProgressEvent('timeout'), { status: 408, statusText: 'Request Timeout' });
    expect(component.isLoading).toBeFalse(); expect(component.errorMessage).toContain('Request Timeout');
  }));
  it('cancels in-flight request when destroyed', () => { profileRequest(); fixture.destroy(); expect(() => http.verify()).not.toThrow(); });
  it('can initialize map repeatedly without crashing', fakeAsync(() => {
    profileRequest().flush(profile); flushSecondaryRequests(); component.activeTab = 'profile'; component.initHomeMap(); tick(100); component.initHomeMap(); tick(100); expect(component.isLoading).toBeFalse();
  }));
});
