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

type DatePickerMode = 'date' | 'month';

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
  @Input() mode: DatePickerMode = 'date';
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
  // These are only populated for the mobile fixed-position popup. Keeping
  // them null on desktop preserves the existing absolute positioning rules.
  popupTop: number | null = null;
  popupLeft: number | null = null;
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
    if (changes['mode'] && this.value) this.value = normalizeValue(this.value, this.mode);
    if (changes['min'] || changes['max'] || changes['mode']) this.buildCalendar();
  }

  get popupId(): string {
    return `${this.id || this.name || 'date-picker'}-popup`;
  }

  get displayValue(): string {
    if (this.mode === 'month') {
      const date = parseMonth(this.value);
      return date ? new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(date) : '';
    }
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
    this.value = normalizeValue(value || '', this.mode);
    if (this.isOpen && this.value) {
      const selected = this.mode === 'month' ? parseMonth(this.value) : parseDate(this.value);
      this.viewDate = this.startOfMonth(selected || new Date());
    }
    this.buildCalendar();
  }

  registerOnChange(fn: (value: string) => void): void { this.onModelChange = fn; }
  registerOnTouched(fn: () => void): void { this.onModelTouched = fn; }
  setDisabledState(disabled: boolean): void { this.disabled = disabled; }

  open(): void {
    if (this.disabled) return;
    const selected = (this.mode === 'month' ? parseMonth(this.value) : parseDate(this.value)) || new Date();
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
    this.popupTop = null;
    this.popupLeft = null;
    this.onModelTouched();
  }

  toggleMonthYear(): void {
    this.showMonthYear = !this.showMonthYear;
    this.buildCalendar();
    // The month/year panel changes the popup height. Wait for Angular to
    // render it before deciding whether the popup should open upward.
    requestAnimationFrame(() => { if (this.isOpen) this.positionPopup(); });
  }

  previousMonth(event?: Event): void { event?.stopPropagation(); this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() - 1, 1); this.buildCalendar(); }
  nextMonth(event?: Event): void { event?.stopPropagation(); this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + 1, 1); this.buildCalendar(); }

  selectMonth(month: number): void {
    this.viewDate = new Date(this.viewDate.getFullYear(), month, 1);
    if (this.mode === 'month') {
      this.setValue(formatMonth(this.viewDate));
      this.close();
      return;
    }
    this.showMonthYear = false;
    this.buildCalendar();
  }

  selectYear(year: number): void {
    this.viewDate = new Date(year, this.viewDate.getMonth(), 1);
    if (this.mode === 'month') {
      this.setValue(formatMonth(this.viewDate));
      this.close();
      return;
    }
    this.showMonthYear = false;
    this.buildCalendar();
  }

  selectDate(key: string): void {
    if (this.mode !== 'date' || !key || this.isOutOfRange(key)) return;
    this.setValue(key);
    this.close();
  }

  setToday(): void {
    if (this.mode !== 'date') return;
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

  @HostListener('window:scroll')
  onScroll(): void { if (this.isOpen) this.positionPopup(); }

  private setValue(value: string): void {
    this.value = normalizeValue(value, this.mode);
    this.onModelChange(this.value);
    this.input.emit(this.value);
    this.change.emit(this.value);
  }

  buildCalendar(): void {
    if (this.mode === 'month') {
      this.calendarDays = [];
      return;
    }
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
    const isMobile = viewportWidth <= 768;
    const popup = this.elementRef.nativeElement.querySelector<HTMLElement>('.date-picker-popup');
    const estimatedHeight = this.mode === 'month' ? 390 : this.showMonthYear ? 390 : 340;
    const popupRect = popup?.getBoundingClientRect();
    const popupHeight = popupRect?.height || estimatedHeight;
    const popupWidth = popupRect?.width || Math.min(320, viewportWidth - (isMobile ? 24 : 16));
    const viewportPadding = isMobile ? 12 : 8;
    const spaceAbove = Math.max(0, host.top - viewportPadding);
    const spaceBelow = Math.max(0, viewportHeight - host.bottom - viewportPadding);

    // Open toward the side with enough room. When neither side can fit the
    // complete panel, use the side with more room and let the popup's own
    // max-height provide the final viewport guardrail.
    this.opensUp = spaceBelow < popupHeight && spaceAbove > spaceBelow;
    this.alignsRight = host.left + popupWidth > viewportWidth - viewportPadding
      && host.right - popupWidth >= viewportPadding;

    if (!isMobile) {
      this.popupTop = null;
      this.popupLeft = null;
      return;
    }

    // On small screens the panel is fixed to the viewport so it cannot be
    // clipped by a card, table, or another ancestor with overflow hidden.
    // Clamp both coordinates to the same safe 12px viewport gutter.
    const desiredLeft = host.left;
    const maxLeft = Math.max(viewportPadding, viewportWidth - popupWidth - viewportPadding);
    this.popupLeft = Math.round(Math.min(Math.max(desiredLeft, viewportPadding), maxLeft));

    const desiredTop = this.opensUp
      ? host.top - popupHeight - 6
      : host.bottom + 6;
    const maxTop = Math.max(viewportPadding, viewportHeight - popupHeight - viewportPadding);
    this.popupTop = Math.round(Math.min(Math.max(desiredTop, viewportPadding), maxTop));
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

function parseMonth(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  return date.getFullYear() === Number(match[1]) && date.getMonth() === Number(match[2]) - 1 ? date : null;
}

function formatMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function normalizeValue(value: string, mode: DatePickerMode): string {
  if (mode === 'month') {
    const month = parseMonth(value);
    return month ? formatMonth(month) : '';
  }
  const date = parseDate(value);
  return date ? formatDate(date) : '';
}
