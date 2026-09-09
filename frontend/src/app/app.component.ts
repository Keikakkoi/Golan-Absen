import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
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
  private activeSelect: HTMLSelectElement | null = null;
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
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit() {
    if (this.authService.isAuthenticated()) {
      this.authService.refreshProfile().subscribe();
    }

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
    this.closeFilterMenu();
  }

  private isFilterSelect(select: HTMLSelectElement): boolean {
    return select.classList.contains('filter-input') || !!select.closest(
      '.filter-grid, .report-toolbar, .toolbar, .leave-toolbar, .team-attendance-toolbar, .team-reports-toolbar, .calendar-toolbar, .reporting-month-toolbar'
    );
  }

  private openFilterMenu(select: HTMLSelectElement): void {
    this.closeFilterMenu();
    this.activeSelect = select;

    const menu = this.document.createElement('div');
    menu.className = 'filter-native-menu';
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
    const menuHeight = Math.min(360, Math.round(availableBelow), menu.scrollHeight);

    menu.style.left = `${Math.round(bounds.left)}px`;
    menu.style.width = `${Math.round(bounds.width)}px`;
    menu.style.height = `${Math.max(120, menuHeight)}px`;
    menu.style.maxHeight = `${Math.max(120, menuHeight)}px`;
    menu.style.top = `${Math.round(bounds.bottom + 4)}px`;
  }

  private closeFilterMenu(): void {
    this.filterMenu?.remove();
    this.filterMenu = null;
    this.activeSelect = null;
  }
}
