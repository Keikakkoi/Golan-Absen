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
    return select.classList.contains('filter-input') || !!select.closest(
      '.filter-grid, .report-toolbar, .toolbar, .leave-toolbar, .team-attendance-toolbar, .team-reports-toolbar, .calendar-toolbar, .reporting-month-toolbar, .work-report-admin-page, .backup-page, .select-control, .employee-form-select'
    );
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
    const availableBelow = Math.max(120, viewportHeight - bounds.bottom - 8);
    const isEmployeeFormMenu = menu.classList.contains('employee-form-menu');
    const menuHeight = Math.min(
      360,
      Math.round(availableBelow),
      isEmployeeFormMenu ? menu.scrollHeight : Math.max(120, menu.scrollHeight)
    );

    menu.style.left = `${Math.round(bounds.left)}px`;
    menu.style.width = `${Math.round(bounds.width)}px`;
    menu.style.height = `${isEmployeeFormMenu ? menuHeight : Math.max(120, menuHeight)}px`;
    menu.style.maxHeight = `${isEmployeeFormMenu ? menuHeight : Math.max(120, menuHeight)}px`;
    menu.style.top = `${Math.round(bounds.bottom + 4)}px`;
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

    const header = this.document.createElement('div');
    header.className = 'filter-date-header';
    const birthDateInput = input.name === 'tanggal_lahir';
    const title = this.document.createElement(birthDateInput ? 'button' : 'strong');
    if (birthDateInput) {
      (title as HTMLButtonElement).type = 'button';
      title.className = 'filter-date-title';
      title.setAttribute('aria-label', 'Pilih bulan dan tahun');
      title.setAttribute('aria-expanded', String(this.dateSelectorOpen));
    }
    title.textContent = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(this.dateView);
    if (birthDateInput) title.addEventListener('click', (event) => {
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
    if (birthDateInput && this.dateSelectorOpen) this.renderDateSelector(menu);

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
    const yearSelect = this.document.createElement('select');
    yearSelect.className = 'filter-date-year';
    yearSelect.setAttribute('aria-label', 'Pilih tahun');
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= 1900; year--) {
      const option = this.document.createElement('option');
      option.value = String(year);
      option.textContent = String(year);
      option.selected = year === this.dateView.getFullYear();
      yearSelect.appendChild(option);
    }
    yearSelect.addEventListener('change', (event) => {
      event.stopPropagation();
      this.dateView = new Date(Number(yearSelect.value), this.dateView.getMonth(), 1);
      this.dateSelectorOpen = false;
      this.renderDateMenu();
    });
    yearLabel.appendChild(yearSelect);
    selector.appendChild(yearLabel);
    menu.appendChild(selector);
  }

  private createDateButton(text: string, label?: string): HTMLButtonElement {
    const button = this.document.createElement('button');
    button.type = 'button';
    button.className = 'filter-date-action';
    button.textContent = text;
    if (label) button.setAttribute('aria-label', label);
    return button;
  }

  private setDateValue(value: string): void {
    if (!this.activeDateInput) return;
    this.activeDateInput.value = value;
    this.activeDateInput.dispatchEvent(new Event('input', { bubbles: true }));
    this.activeDateInput.dispatchEvent(new Event('change', { bubbles: true }));
    this.closeDateMenu();
  }

  private positionDateMenu(input: HTMLInputElement, menu: HTMLDivElement): void {
    const bounds = input.getBoundingClientRect();
    const height = menu.offsetHeight;
    const opensUp = bounds.bottom + height > (this.document.defaultView?.innerHeight || 0) && bounds.top > height;
    menu.style.left = `${Math.round(bounds.left)}px`;
    menu.style.top = `${Math.round(opensUp ? bounds.top - height - 4 : bounds.bottom + 4)}px`;
  }

  private closeDateMenu(): void { this.dateMenu?.remove(); this.dateMenu = null; this.activeDateInput = null; this.dateSelectorOpen = false; }
  private closeMenus(): void { this.closeFilterMenu(); this.closeDateMenu(); }
}

function inputTypeIsDate(input: HTMLInputElement): boolean { return input.type === 'date'; }
function parseDateValue(value: string): Date | null { const parts = value.split('-').map(Number); return parts.length === 3 && parts.every(Number.isFinite) ? new Date(parts[0], parts[1] - 1, parts[2]) : null; }
function formatDateValue(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
