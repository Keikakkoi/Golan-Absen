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
  private readonly closeOnOutsideClick = (event: Event) => {
    if (this.filterMenu && event.target instanceof Node && this.filterMenu.contains(event.target)) return;
    if (event.target === this.activeSelect) return;
    this.closeFilterMenu();
  };

  constructor(
    private themeService: ThemeService,
    private authService: AuthService,
    public pageLoading: PageLoadingService,
    private router: Router,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit() {
    this.syncThemeWithRoute(this.router.url);
    this.routeSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => this.syncThemeWithRoute(event.urlAfterRedirects));

    this.document.addEventListener('mousedown', this.onFilterPointerDown, true);
    this.document.addEventListener('click', this.onFilterClick, true);
    this.document.addEventListener('click', this.closeOnOutsideClick);
    this.document.defaultView?.addEventListener('resize', this.closeOnOutsideClick);
    this.document.defaultView?.addEventListener('scroll', this.closeOnOutsideClick, true);
  }

  ngOnDestroy() {
    this.document.removeEventListener('mousedown', this.onFilterPointerDown, true);
    this.document.removeEventListener('click', this.onFilterClick, true);
    this.document.removeEventListener('click', this.closeOnOutsideClick);
    this.document.defaultView?.removeEventListener('resize', this.closeOnOutsideClick);
    this.document.defaultView?.removeEventListener('scroll', this.closeOnOutsideClick, true);
    this.routeSubscription?.unsubscribe();
    this.closeFilterMenu();
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

}


