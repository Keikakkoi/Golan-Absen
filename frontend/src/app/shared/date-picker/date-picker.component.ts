import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  forwardRef
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

interface DateCell {
  key: string;
  day: number;
  outside: boolean;
  disabled: boolean;
  selected: boolean;
  today: boolean;
}

@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './date-picker.component.html',
  styleUrls: ['./date-picker.component.scss'],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DatePickerComponent), multi: true }]
})
export class DatePickerComponent implements ControlValueAccessor, OnChanges {
  @Input() id = '';
  @Input() name = '';
  @Input() ariaLabel = 'Pilih tanggal';
  @Input() placeholder = 'Pilih tanggal';
  @Input() min = '';
  @Input() max = '';
  @Input() required = false;
  @Input() disabled = false;
  @Input() inputClass = 'golan-input';
  @Input() panelLabel = 'Pilih tanggal';
  @Output() input = new EventEmitter<string>();
  @Output() change = new EventEmitter<string>();

  value = '';
  viewDate = this.startOfMonth(new Date());
  isOpen = false;
  showMonthYear = false;
  opensUp = false;
  alignsRight = false;
  calendarDays: DateCell[] = [];
  readonly weekdays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  readonly months = Array.from({ length: 12 }, (_, month) =>
    new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date(2020, month, 1))
  );
  readonly years = Array.from({ length: 141 }, (_, index) => 1900 + index);

  private onModelChange: (value: string) => void = () => undefined;
  onModelTouched: () => void = () => undefined;

  constructor(private elementRef: ElementRef<HTMLElement>) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['min'] || changes['max'] || changes['value']) this.buildCalendar();
  }

  get popupId(): string {
    return `${this.id || this.name || 'date-picker'}-popup`;
  }

  get displayValue(): string {
    const date = parseDate(this.value);
    return date ? new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date) : '';
  }

  get monthYearLabel(): string {
    return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(this.viewDate);
  }

  get selectedYear(): number {
    return this.viewDate.getFullYear();
  }

  writeValue(value: string | null): void {
    this.value = normalizeDateValue(value || '');
    if (this.isOpen && this.value) this.viewDate = this.startOfMonth(parseDate(this.value) || new Date());
    this.buildCalendar();
  }

  registerOnChange(fn: (value: string) => void): void { this.onModelChange = fn; }
  registerOnTouched(fn: () => void): void { this.onModelTouched = fn; }
  setDisabledState(disabled: boolean): void { this.disabled = disabled; }

  open(): void {
    if (this.disabled) return;
    const selected = parseDate(this.value) || new Date();
    this.viewDate = this.startOfMonth(selected);
    this.isOpen = true;
    this.showMonthYear = false;
    this.buildCalendar();
    requestAnimationFrame(() => this.positionPopup());
  }

  toggle(event?: Event): void {
    event?.preventDefault();
    if (this.isOpen) this.close(); else this.open();
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.showMonthYear = false;
    this.onModelTouched();
  }

  previousMonth(event?: Event): void { event?.stopPropagation(); this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() - 1, 1); this.buildCalendar(); }
  nextMonth(event?: Event): void { event?.stopPropagation(); this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + 1, 1); this.buildCalendar(); }

  selectMonth(month: number): void {
    this.viewDate = new Date(this.viewDate.getFullYear(), month, 1);
    this.showMonthYear = false;
    this.buildCalendar();
  }

  selectYear(year: number): void {
    this.viewDate = new Date(year, this.viewDate.getMonth(), 1);
    this.showMonthYear = false;
    this.buildCalendar();
  }

  selectDate(key: string): void {
    if (!key || this.isOutOfRange(key)) return;
    this.setValue(key);
    this.close();
  }

  setToday(): void {
    const today = formatDate(new Date());
    if (!this.isOutOfRange(today)) this.selectDate(today);
  }

  clear(): void { this.setValue(''); this.close(); }

  onInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault();
      this.open();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    }
  }

  onCalendarKeydown(event: KeyboardEvent, key: string): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.selectDate(key);
      return;
    }
    if (!key || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const date = parseDate(key);
    if (!date) return;
    const delta = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : event.key === 'ArrowUp' ? -7 : 7;
    const nextDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta);
    const nextKey = formatDate(nextDate);
    this.viewDate = this.startOfMonth(nextDate);
    this.buildCalendar();
    requestAnimationFrame(() => this.elementRef.nativeElement.querySelector<HTMLButtonElement>(`[data-date="${nextKey}"]`)?.focus());
  }

  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(event: PointerEvent): void {
    if (this.isOpen && !this.elementRef.nativeElement.contains(event.target as Node)) this.close();
  }

  @HostListener('window:resize')
  onResize(): void { if (this.isOpen) this.positionPopup(); }

  private setValue(value: string): void {
    this.value = normalizeDateValue(value);
    this.onModelChange(this.value);
    this.input.emit(this.value);
    this.change.emit(this.value);
  }

  buildCalendar(): void {
    const firstDay = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth(), 1).getDay();
    const daysInMonth = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + 1, 0).getDate();
    const today = formatDate(new Date());
    this.calendarDays = Array.from({ length: 42 }, (_, index) => {
      const day = index - firstDay + 1;
      const outside = day < 1 || day > daysInMonth;
      const date = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth(), day);
      const key = outside ? '' : formatDate(date);
      return { key, day, outside, disabled: outside || this.isOutOfRange(key), selected: key === this.value, today: key === today };
    });
  }

  private isOutOfRange(value: string): boolean {
    return !!value && ((!!this.min && value < this.min) || (!!this.max && value > this.max));
  }

  positionPopup(): void {
    const host = this.elementRef.nativeElement.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const estimatedHeight = this.showMonthYear ? 390 : 340;
    this.opensUp = viewportHeight - host.bottom < estimatedHeight && host.top > estimatedHeight;
    this.alignsRight = host.left + 320 > viewportWidth && host.right - 320 >= 8;
  }

  private startOfMonth(date: Date): Date { return new Date(date.getFullYear(), date.getMonth(), 1); }
}

function parseDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.getFullYear() === Number(match[1]) && date.getMonth() === Number(match[2]) - 1 && date.getDate() === Number(match[3]) ? date : null;
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function normalizeDateValue(value: string): string { const date = parseDate(value); return date ? formatDate(date) : ''; }
