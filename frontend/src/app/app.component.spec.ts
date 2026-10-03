import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideHttpClient(), provideRouter([])],
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

  it('applies the custom date-year picker to every supported date field', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance as any;
    fixture.detectChanges();

    for (const [name, year] of [
      ['tanggal_lahir', '1975'],
      ['tanggal_bergabung', '1985'],
      ['internship_start_date', '1995'],
      ['internship_end_date', '2005'],
      ['event_start_date', '2010'],
      ['event_end_date', '2015'],
      ['team_attendance_start_date', '2021'],
      ['team_attendance_end_date', '2023'],
      ['team_report_start_date', '2022'],
      ['team_report_end_date', '2026'],
      ['work_report_start_date', '2018'],
      ['work_report_end_date', '2025'],
      ['attendance_recap_start_date', '2017'],
      ['attendance_recap_end_date', '2026'],
      ['schedule_shift_start_date', '2016'],
      ['schedule_shift_end_date', '2026'],
      ['team_statistics_start_date', '2019'],
      ['team_statistics_end_date', '2026']
    ] as const) {
      const input = document.createElement('input');
      input.type = 'date';
      input.name = name;
      input.value = '1990-05-15';
      document.body.appendChild(input);

      app.openDateMenu(input);
      (document.querySelector('.filter-date-title') as HTMLButtonElement).click();

      const yearButton = document.querySelector('.filter-date-year') as HTMLButtonElement;
      expect(yearButton.getAttribute('aria-haspopup')).toBe('listbox');

      const pointerDown = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
      yearButton.dispatchEvent(pointerDown);
      expect(pointerDown.defaultPrevented).toBeFalse();

      yearButton.click();
      const yearOption = Array.from(document.querySelectorAll<HTMLButtonElement>('.filter-date-year-option'))
        .find(option => option.textContent === year);
      expect(yearOption).toBeTruthy();
      yearOption?.click();
      expect(input.value).toBe(`${year}-05-15`);

      input.remove();
      document.querySelector('.filter-date-menu')?.remove();
    }
  });
});
