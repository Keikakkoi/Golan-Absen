import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { ThemeService } from './core/services/theme.service';
import { AuthService } from './core/services/auth.service';
import { PageLoadingService } from './core/services/page-loading.service';
import { PageSkeletonComponent } from './shared/page-skeleton/page-skeleton.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, PageSkeletonComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'frontend';

  private filterMenu: HTMLDivElement | null = null;
  private routeSubscription?: Subscription;
  private activeSelect: HTMLSelectElement | null = null;
  private dateMenu: HTMLDivElement | null = null;
  private activeDateInput: HTMLInputElement | null = null;
  private dateView = new Date();
  private dateSelectorOpen = false;
  private dateYearOpen = false;
  private fontAwesomeLink?: HTMLLinkElement;
  private readonly onFilterPointerDown = (event: Event) => {
    const select = event.target instanceof HTMLSelectElement ? event.target : null;
    if (!select || !this.isFilterSelect(select)) return;

    if (this.activeSelect === select && this.filterMenu) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.openFilterMenu(select);
  };
  private readonly onFilterClick = (event: Event) => {
    const select = event.target instanceof HTMLSelectElement ? event.target : null;
    if (!select || !this.isFilterSelect(select)) return;
    event.preventDefault();
    event.stopPropagation();
  };
  private readonly onDatePointerDown = (event: Event) => {
    const input = event.target instanceof HTMLInputElement && inputTypeIsDate(event.target) ? event.target : null;
    if (!input || !this.isDateFilterInput(input)) return;
    event.preventDefault();
    event.stopPropagation();
    if (this.activeDateInput !== input || !this.dateMenu) this.openDateMenu(input);
  };
  private readonly onDateClick = (event: Event) => {
    const input = event.target instanceof HTMLInputElement && inputTypeIsDate(event.target) ? event.target : null;
    if (!input || !this.isDateFilterInput(input)) return;
    event.preventDefault();
    event.stopPropagation();
  };
  private readonly closeOnOutsideClick = (event: Event) => {
    if (this.filterMenu && event.target instanceof Node && this.filterMenu.contains(event.target)) return;
    if (event.target === this.activeSelect) return;
    if (this.dateMenu && event.target instanceof Node && this.dateMenu.contains(event.target)) return;
    if (event.target === this.activeDateInput) return;
    this.closeMenus();
  };

  constructor(
    private themeService: ThemeService,
    private authService: AuthService,
    public pageLoading: PageLoadingService,
    private router: Router,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit() {
    if (this.authService.isAuthenticated()) {
      this.authService.refreshProfile().subscribe();
    }
    this.syncThemeWithRoute(this.router.url);
    this.routeSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => this.syncThemeWithRoute(event.urlAfterRedirects));

    this.document.addEventListener('mousedown', this.onFilterPointerDown, true);
    this.document.addEventListener('click', this.onFilterClick, true);
    this.document.addEventListener('mousedown', this.onDatePointerDown, true);
    this.document.addEventListener('click', this.onDateClick, true);
    this.document.addEventListener('click', this.closeOnOutsideClick);
    this.document.defaultView?.addEventListener('resize', this.closeOnOutsideClick);
    this.document.defaultView?.addEventListener('scroll', this.closeOnOutsideClick, true);
  }

  ngOnDestroy() {
    this.document.removeEventListener('mousedown', this.onFilterPointerDown, true);
    this.document.removeEventListener('click', this.onFilterClick, true);
    this.document.removeEventListener('mousedown', this.onDatePointerDown, true);
    this.document.removeEventListener('click', this.onDateClick, true);
    this.document.removeEventListener('click', this.closeOnOutsideClick);
    this.document.defaultView?.removeEventListener('resize', this.closeOnOutsideClick);
    this.document.defaultView?.removeEventListener('scroll', this.closeOnOutsideClick, true);
    this.routeSubscription?.unsubscribe();
    this.closeMenus();
  }

  private syncThemeWithRoute(url: string): void {
    // During initial navigation Router can briefly still report `/` while the
    // browser already opened an authenticated deep link. Use the browser URL
    // for that transient state so the pre-bootstrap dark class is not cleared.
    const effectiveUrl = url === '/' && this.document.location.pathname !== '/'
      ? this.document.location.pathname
      : url;
    const path = effectiveUrl.split('?')[0].split('#')[0].replace(/^\/+/, '');
    this.syncRoleClass();
    const publicRoutes = new Set(['', 'home', 'login', 'forgot-password', 'verify-password-otp', 'reset-password', '403', 'forbidden', 'maintenance']);
    const authRoutes = new Set(['login', 'forgot-password', 'verify-password-otp', 'reset-password']);
    this.pageLoading.setLayout(authRoutes.has(path) ? 'auth' : publicRoutes.has(path) ? 'public' : 'app');
    this.syncFontAwesome(!publicRoutes.has(path));
    if (publicRoutes.has(path)) {
      this.themeService.clearActiveTheme();
      return;
    }
    // Restore after the route is known. This also covers a hard refresh where
    // AuthService has just reconstructed the user context from localStorage or
    // the token after ThemeService was instantiated.
    this.themeService.applyStoredTheme();
  }

  private syncRoleClass(): void {
    const role = String(this.authService.getRole() || '').toUpperCase();
    this.document.body.classList.toggle('role-magang', role === 'MAGANG');
    this.document.body.classList.toggle('role-karyawan', role === 'KARYAWAN');
    this.document.body.classList.toggle('role-manajer', role === 'MANAJER');
    this.document.body.classList.toggle('role-hrd', role === 'HRD');
  }

  private syncFontAwesome(required: boolean): void {
    if (required && !this.fontAwesomeLink) {
      const link = this.document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
      link.dataset['appFontAwesome'] = 'true';
      this.document.head.appendChild(link);
      this.fontAwesomeLink = link;
    } else if (!required && this.fontAwesomeLink) {
      this.fontAwesomeLink.remove();
      this.fontAwesomeLink = undefined;
    }
  }

  private isFilterSelect(select: HTMLSelectElement): boolean {
    // Use one custom, scaled option menu for every native select in the app.
    // This keeps dropdowns in admin forms, filters, tables, modals, and all
    // user roles consistent with the responsive desktop density.
    return select instanceof HTMLSelectElement;
  }

  private openFilterMenu(select: HTMLSelectElement): void {
    this.closeFilterMenu();
    this.activeSelect = select;

    const menu = this.document.createElement('div');
    menu.className = select.classList.contains('employee-form-select')
      ? 'filter-native-menu employee-form-menu'
      : 'filter-native-menu';
    menu.setAttribute('role', 'listbox');
    menu.setAttribute('aria-label', select.getAttribute('aria-label') || 'Pilihan filter');

    Array.from(select.options).forEach((option, index) => {
      const item = this.document.createElement('button');
      item.type = 'button';
      item.className = 'filter-native-option';
      item.textContent = option.text;
      item.disabled = option.disabled;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', String(index === select.selectedIndex));
      if (index === select.selectedIndex) item.classList.add('selected');
      item.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        select.selectedIndex = index;
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
        this.closeFilterMenu();
      });
      menu.appendChild(item);
    });

    this.document.body.appendChild(menu);
    this.filterMenu = menu;
    this.positionFilterMenu(select, menu);
  }

  private positionFilterMenu(select: HTMLSelectElement, menu: HTMLDivElement): void {
    const bounds = select.getBoundingClientRect();
    const viewportHeight = this.document.defaultView?.innerHeight || 0;
    const menuScale = this.getDesktopUiScale();
    const availableBelow = Math.max(120, viewportHeight - bounds.bottom - 8);
    const isEmployeeFormMenu = menu.classList.contains('employee-form-menu');
    const computedSelectStyle = this.document.defaultView?.getComputedStyle(select);
    const selectFontSize = computedSelectStyle?.fontSize || '13px';
    const menuHeight = Math.min(
      360 / menuScale,
      Math.round(availableBelow / menuScale),
      isEmployeeFormMenu ? menu.scrollHeight : Math.max(120 / menuScale, menu.scrollHeight)
    );

    // The menu is attached to <body>, outside the zoomed dashboard wrapper.
    // Scale its layout box inversely, then scale it visually so it matches the
    // select control at Full HD, QHD, 4K, and the other supported viewports.
    menu.style.setProperty('--filter-menu-scale', String(menuScale));
    menu.style.setProperty('--filter-menu-font-size', selectFontSize);
    menu.style.left = `${Math.round(bounds.left)}px`;
    menu.style.width = `${Math.round(bounds.width / menuScale)}px`;
    menu.style.minWidth = `${Math.round(bounds.width / menuScale)}px`;
    const renderedMenuHeight = isEmployeeFormMenu ? menuHeight : Math.max(120 / menuScale, menuHeight);
    menu.style.height = `${renderedMenuHeight}px`;
    menu.style.maxHeight = `${renderedMenuHeight}px`;
    menu.style.top = `${Math.round(bounds.bottom + 4)}px`;
  }

  private getDesktopUiScale(): number {
    const viewportWidth = this.document.defaultView?.innerWidth || 0;
    if (viewportWidth >= 3700) return 3;
    if (viewportWidth >= 3300) return 2.6875;
    if (viewportWidth >= 3120) return 2.5;
    if (viewportWidth >= 2760) return 2.25;
    if (viewportWidth >= 2400) return 2;
    if (viewportWidth >= 1440) return 1.5;
    return 1;
  }

  private closeFilterMenu(): void {
    this.filterMenu?.remove();
    this.filterMenu = null;
    this.activeSelect = null;
  }

  private isDateFilterInput(input: HTMLInputElement): boolean {
    // All date inputs use the same themed calendar, including form fields
    // outside the filter toolbars (for example, employee join dates).
    return input.type === 'date';
  }

  private openDateMenu(input: HTMLInputElement): void {
    this.closeMenus();
    this.activeDateInput = input;
    const selected = parseDateValue(input.value) || new Date();
    this.dateView = new Date(selected.getFullYear(), selected.getMonth(), 1);
    this.dateSelectorOpen = false;
    this.dateYearOpen = false;
    this.renderDateMenu();
  }

  private renderDateMenu(): void {
    const input = this.activeDateInput;
    if (!input) return;
    this.dateMenu?.remove();
    const menu = this.document.createElement('div');
    menu.className = 'filter-date-menu';
    menu.setAttribute('role', 'dialog');
    menu.setAttribute('aria-label', 'Pilih tanggal');
    menu.style.setProperty('--filter-date-scale', String(this.getDesktopUiScale()));

    const header = this.document.createElement('div');
    header.className = 'filter-date-header';
    const hasMonthYearSelector = this.hasMonthYearSelector(input);
    const title = this.document.createElement(hasMonthYearSelector ? 'button' : 'strong');
    if (hasMonthYearSelector) {
      (title as HTMLButtonElement).type = 'button';
      title.className = 'filter-date-title';
      title.setAttribute('aria-label', 'Pilih bulan dan tahun');
      title.setAttribute('aria-expanded', String(this.dateSelectorOpen));
    }
    title.textContent = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(this.dateView);
    if (hasMonthYearSelector) title.addEventListener('click', (event) => {
        event.stopPropagation();
        this.dateSelectorOpen = !this.dateSelectorOpen;
        this.renderDateMenu();
      });
    const previous = this.createDateButton('‹', 'Bulan sebelumnya');
    const next = this.createDateButton('›', 'Bulan berikutnya');
    previous.addEventListener('click', (event) => { event.stopPropagation(); this.dateView.setMonth(this.dateView.getMonth() - 1); this.renderDateMenu(); });
    next.addEventListener('click', (event) => { event.stopPropagation(); this.dateView.setMonth(this.dateView.getMonth() + 1); this.renderDateMenu(); });
    header.append(title, previous, next);
    menu.appendChild(header);
    if (hasMonthYearSelector && this.dateSelectorOpen) this.renderDateSelector(menu);

    const weekdays = this.document.createElement('div');
    weekdays.className = 'filter-date-weekdays';
    ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].forEach(day => { const cell = this.document.createElement('span'); cell.textContent = day; weekdays.appendChild(cell); });
    menu.appendChild(weekdays);

    const grid = this.document.createElement('div');
    grid.className = 'filter-date-grid';
    const firstDay = new Date(this.dateView.getFullYear(), this.dateView.getMonth(), 1).getDay();
    const daysInMonth = new Date(this.dateView.getFullYear(), this.dateView.getMonth() + 1, 0).getDate();
    for (let index = 0; index < 42; index++) {
      const day = index - firstDay + 1;
      const cell = this.document.createElement('button');
      cell.type = 'button';
      cell.className = 'filter-date-day';
      if (day < 1 || day > daysInMonth) { cell.disabled = true; cell.classList.add('outside'); }
      else {
        const value = formatDateValue(new Date(this.dateView.getFullYear(), this.dateView.getMonth(), day));
        cell.textContent = String(day);
        cell.classList.toggle('selected', value === input.value);
        cell.disabled = (!!input.min && value < input.min) || (!!input.max && value > input.max);
        cell.addEventListener('click', (event) => { event.stopPropagation(); this.setDateValue(value); });
      }
      grid.appendChild(cell);
    }
    menu.appendChild(grid);

    const footer = this.document.createElement('div');
    footer.className = 'filter-date-footer';
    const clear = this.createDateButton('Hapus');
    const today = this.createDateButton('Hari ini');
    clear.addEventListener('click', (event) => { event.stopPropagation(); this.setDateValue(''); });
    today.addEventListener('click', (event) => { event.stopPropagation(); this.setDateValue(formatDateValue(new Date())); });
    footer.append(clear, today);
    menu.appendChild(footer);
    this.document.body.appendChild(menu);
    this.dateMenu = menu;
    this.positionDateMenu(input, menu);
    if (this.dateYearOpen) this.positionDateYearMenu(menu);
  }

  private renderDateSelector(menu: HTMLDivElement): void {
    const selector = this.document.createElement('div');
    selector.className = 'filter-date-selector';

    const monthGrid = this.document.createElement('div');
    monthGrid.className = 'filter-date-month-grid';
    const months = Array.from({ length: 12 }, (_, month) => new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(new Date(2000, month, 1)));
    months.forEach((monthName, month) => {
      const monthButton = this.document.createElement('button');
      monthButton.type = 'button';
      monthButton.className = 'filter-date-month';
      monthButton.textContent = monthName;
      monthButton.classList.toggle('selected', month === this.dateView.getMonth());
      monthButton.addEventListener('click', (event) => {
        event.stopPropagation();
        this.dateView = new Date(this.dateView.getFullYear(), month, 1);
        this.dateSelectorOpen = false;
        this.renderDateMenu();
      });
      monthGrid.appendChild(monthButton);
    });
    selector.appendChild(monthGrid);

    const yearLabel = this.document.createElement('label');
    yearLabel.className = 'filter-date-year-label';
    yearLabel.textContent = 'Tahun';
    const yearControl = this.document.createElement('div');
    yearControl.className = 'filter-date-year-control';
    const yearButton = this.document.createElement('button');
    yearButton.type = 'button';
    yearButton.className = 'filter-date-year';
    yearButton.textContent = String(this.dateView.getFullYear());
    yearButton.setAttribute('aria-label', 'Pilih tahun');
    yearButton.setAttribute('aria-haspopup', 'listbox');
    yearButton.setAttribute('aria-expanded', String(this.dateYearOpen));
    yearButton.addEventListener('click', (event) => {
      event.stopPropagation();
      this.dateYearOpen = !this.dateYearOpen;
      this.renderDateMenu();
      if (this.dateYearOpen) this.scrollSelectedDateYearIntoView();
    });
    yearButton.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      event.preventDefault();
      this.dateYearOpen = true;
      this.renderDateMenu();
      const selectedOption = this.dateMenu?.querySelector<HTMLButtonElement>('.filter-date-year-option.selected');
      selectedOption?.focus();
    });

    const yearMenu = this.document.createElement('div');
    yearMenu.className = 'filter-date-year-menu';
    yearMenu.setAttribute('role', 'listbox');
    yearMenu.setAttribute('aria-label', 'Daftar tahun');
    const currentYear = new Date().getFullYear();
    for (let year = 1900; year <= currentYear + 10; year++) {
      const option = this.document.createElement('button');
      option.type = 'button';
      option.className = 'filter-date-year-option';
      option.textContent = String(year);
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', String(year === this.dateView.getFullYear()));
      option.classList.toggle('selected', year === this.dateView.getFullYear());
      option.addEventListener('click', (event) => {
        event.stopPropagation();
        this.selectDateYear(year);
      });
      yearMenu.appendChild(option);
    }
    yearControl.append(yearButton);
    if (this.dateYearOpen) yearControl.append(yearMenu);
    yearLabel.appendChild(yearControl);
    selector.appendChild(yearLabel);
    menu.appendChild(selector);
  }

  private selectDateYear(year: number): void {
    const month = this.dateView.getMonth();
    const currentDate = parseDateValue(this.activeDateInput?.value || '');
    const selectedDay = currentDate?.getDate() || new Date().getDate();
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    this.dateView = new Date(year, month, 1);
    // Keep the selected month/day where possible and commit the new year
    // immediately. This also keeps ngModel in sync before the picker closes.
    this.setDateValue(
      formatDateValue(new Date(year, month, Math.min(selectedDay, lastDayOfMonth))),
      false
    );
    this.dateYearOpen = false;
    this.dateSelectorOpen = false;
    this.renderDateMenu();
  }

  private scrollSelectedDateYearIntoView(): void {
    const selectedOption = this.dateMenu?.querySelector<HTMLButtonElement>('.filter-date-year-option.selected');
    selectedOption?.scrollIntoView({ block: 'center' });
  }

  private positionDateYearMenu(menu: HTMLDivElement): void {
    const yearMenu = menu.querySelector<HTMLElement>('.filter-date-year-menu');
    const yearControl = menu.querySelector<HTMLElement>('.filter-date-year-control');
    const viewportHeight = this.document.defaultView?.innerHeight || this.document.documentElement.clientHeight;
    if (!yearMenu || !yearControl || !viewportHeight) return;

    yearMenu.classList.remove('opens-up');
    const viewportPadding = 8;
    const controlBounds = yearControl.getBoundingClientRect();
    const menuBounds = yearMenu.getBoundingClientRect();
    const roomBelow = viewportHeight - controlBounds.bottom - viewportPadding;
    const roomAbove = controlBounds.top - viewportPadding;
    if (menuBounds.bottom > viewportHeight - viewportPadding && roomAbove > roomBelow) {
      yearMenu.classList.add('opens-up');
    }
  }

  private hasMonthYearSelector(input: HTMLInputElement): boolean {
    return [
      'tanggal_lahir',
      'tanggal_bergabung',
      'internship_start_date',
      'internship_end_date',
      'event_start_date',
      'event_end_date',
      'team_attendance_start_date',
      'team_attendance_end_date',
      'team_report_start_date',
      'team_report_end_date',
      'work_report_start_date',
      'work_report_end_date',
      'attendance_recap_start_date',
      'attendance_recap_end_date',
      'schedule_shift_start_date',
      'schedule_shift_end_date',
      'team_statistics_start_date',
      'team_statistics_end_date'
    ].includes(input.name);
  }

  private createDateButton(text: string, label?: string): HTMLButtonElement {
    const button = this.document.createElement('button');
    button.type = 'button';
    button.className = 'filter-date-action';
    button.textContent = text;
    if (label) button.setAttribute('aria-label', label);
    return button;
  }

  private setDateValue(value: string, close = true): void {
    if (!this.activeDateInput) return;
    this.activeDateInput.value = value;
    this.activeDateInput.dispatchEvent(new Event('input', { bubbles: true }));
    this.activeDateInput.dispatchEvent(new Event('change', { bubbles: true }));
    if (close) this.closeDateMenu();
  }

  private positionDateMenu(input: HTMLInputElement, menu: HTMLDivElement): void {
    const bounds = input.getBoundingClientRect();
    const viewport = this.document.defaultView;
    const viewportWidth = viewport?.innerWidth || this.document.documentElement.clientWidth;
    const viewportHeight = viewport?.innerHeight || this.document.documentElement.clientHeight;
    const viewportPadding = 8;
    const menuScale = this.getDesktopUiScale();
    const availableWidth = Math.max(0, viewportWidth - (viewportPadding * 2));

    // The picker is rendered in document.body and uses fixed positioning, so
    // its original 320px width can extend past a narrow modal/viewport. The
    // menu is visually scaled outside the zoomed page shell, so measure its
    // unscaled layout box and clamp using the rendered dimensions.
    menu.style.width = `${Math.min(320, Math.floor(availableWidth / menuScale))}px`;
    const renderedWidth = menu.offsetWidth * menuScale;
    const renderedHeight = menu.offsetHeight * menuScale;
    const opensUp = bounds.bottom + renderedHeight > viewportHeight - viewportPadding
      && bounds.top - renderedHeight - 4 >= viewportPadding;
    const preferredTop = opensUp ? bounds.top - renderedHeight - 4 : bounds.bottom + 4;
    const maxTop = Math.max(viewportPadding, viewportHeight - renderedHeight - viewportPadding);
    const left = Math.min(
      Math.max(bounds.left, viewportPadding),
      Math.max(viewportPadding, viewportWidth - renderedWidth - viewportPadding)
    );
    const top = Math.min(Math.max(preferredTop, viewportPadding), maxTop);

    menu.style.left = `${Math.round(left)}px`;
    menu.style.top = `${Math.round(top)}px`;
  }

  private closeDateMenu(): void { this.dateMenu?.remove(); this.dateMenu = null; this.activeDateInput = null; this.dateSelectorOpen = false; this.dateYearOpen = false; }
  private closeMenus(): void { this.closeFilterMenu(); this.closeDateMenu(); }
}

function inputTypeIsDate(input: HTMLInputElement): boolean { return input.type === 'date'; }
function parseDateValue(value: string): Date | null { const parts = value.split('-').map(Number); return parts.length === 3 && parts.every(Number.isFinite) ? new Date(parts[0], parts[1] - 1, parts[2]) : null; }
function formatDateValue(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
