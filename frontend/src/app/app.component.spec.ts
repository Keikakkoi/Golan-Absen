import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should expose the application title`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('frontend');
  });

  it('should render the router shell', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });

  it('does not validate a stale token while opening the public home route', () => {
    localStorage.clear();
    localStorage.setItem('token', 'expired-token');
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const http = TestBed.inject(HttpTestingController);
    expect(http.match(request => request.url.includes('/employee/profile'))).toHaveSize(0);
    expect(TestBed.inject(Router).url).toBe('/');
    localStorage.clear();
  });

  it('keeps the public home route available without a token', () => {
    localStorage.clear();
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    expect(TestBed.inject(Router).url).toBe('/');
    expect(localStorage.getItem('token')).toBeNull();
  });

});
