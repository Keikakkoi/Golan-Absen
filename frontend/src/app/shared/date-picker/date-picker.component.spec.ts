import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { DatePickerComponent } from './date-picker.component';

describe('DatePickerComponent', () => {
  let fixture: ComponentFixture<DatePickerComponent>;
  let component: DatePickerComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatePickerComponent, FormsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(DatePickerComponent);
    component = fixture.componentInstance;
    component.id = 'test-date';
    component.writeValue('2026-10-01');
    fixture.detectChanges();
  });

  it('uses a text input and keeps the model value in YYYY-MM-DD', () => {
    const input = fixture.nativeElement.querySelector('input');
    expect(input.type).toBe('text');
    expect(fixture.nativeElement.querySelector('input[type="date"]')).toBeNull();
    expect(input.value).toBe('01/10/2026');

    let modelValue = '';
    component.registerOnChange(value => modelValue = value);
    component.selectDate('2026-10-19');

    expect(modelValue).toBe('2026-10-19');
    expect(component.value).toBe('2026-10-19');
  });

  it('renders the custom calendar with Indonesian month and weekday labels', () => {
    component.open();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.date-picker-popup')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.date-picker-weekdays')?.textContent).toContain('Sen');
    expect(fixture.nativeElement.querySelector('.date-picker-month-year')?.textContent).toContain('Oktober');
    expect(fixture.nativeElement.querySelector('button.date-picker-day.selected')?.textContent?.trim()).toBe('1');
  });

  it('honours min and max dates', () => {
    component.min = '2026-10-10';
    component.max = '2026-10-20';
    component.open();
    fixture.detectChanges();

    const days = Array.from(fixture.nativeElement.querySelectorAll('button.date-picker-day')) as HTMLButtonElement[];
    const dayOne = days.find(day => day.textContent?.trim() === '1');
    const dayTen = days.find(day => day.textContent?.trim() === '10');
    expect(dayOne?.disabled).toBeTrue();
    expect(dayTen?.disabled).toBeFalse();
  });

  it('supports month mode without rendering a day grid', () => {
    component.mode = 'month';
    component.writeValue('2026-10');
    fixture.detectChanges();
    component.open();
    component.showMonthYear = true;
    fixture.detectChanges();

    expect(component.displayValue).toBe('Oktober 2026');
    expect(fixture.nativeElement.querySelector('.date-picker-grid')).toBeNull();
    expect(fixture.nativeElement.querySelector('.date-picker-month-grid button.selected')?.textContent?.trim()).toBe('Oktober');
    expect(fixture.nativeElement.querySelector('.date-picker-year-grid button.selected')?.textContent?.trim()).toBe('2026');

    let modelValue = '';
    component.registerOnChange(value => modelValue = value);
    component.selectYear(2027);
    expect(modelValue).toBe('2027-10');
    expect(component.isOpen).toBeFalse();
  });
});
