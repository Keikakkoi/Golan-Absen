import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="app-pagination" [class.is-loading]="loading" *ngIf="totalItems > 0 || loading; else empty">
      <div class="pagination-summary">
        <span *ngIf="!loading">Menampilkan {{ startItem }}-{{ endItem }} dari {{ totalItems }} data</span>
        <span *ngIf="loading" class="pagination-loading">Memuat data...</span>
        <label class="page-size-label">Data per halaman
          <span class="page-size-dropdown" [class.is-open]="pageSizeOpen" [class.drop-up]="pageSizeDropUp">
            <button type="button" class="page-size-trigger" [disabled]="loading" aria-label="Data per halaman"
              [attr.aria-expanded]="pageSizeOpen" (click)="togglePageSize($event)">
              <span>{{ pageSize }}</span><span class="page-size-chevron" aria-hidden="true"></span>
            </button>
            <span class="page-size-menu" *ngIf="pageSizeOpen" role="listbox" aria-label="Pilihan data per halaman">
              <button type="button" class="page-size-option" *ngFor="let size of pageSizeOptions"
                [class.selected]="size === pageSize" [attr.aria-selected]="size === pageSize"
                (click)="selectPageSize(size, $event)">{{ size }}</button>
            </span>
          </span>
        </label>
      </div>
      <nav class="pagination-controls" aria-label="Navigasi halaman">
        <button type="button" class="pagination-button" (click)="goToPage(currentPage - 1)" [disabled]="loading || currentPage <= 1">Previous</button>
        <ng-container *ngFor="let page of pages">
          <span *ngIf="page === '...'" class="pagination-ellipsis">...</span>
          <button *ngIf="page !== '...'" type="button" class="pagination-button page-number" [class.active]="page === currentPage" [attr.aria-current]="page === currentPage ? 'page' : null" (click)="goToPage(page)" [disabled]="loading">{{ page }}</button>
        </ng-container>
        <button type="button" class="pagination-button" (click)="goToPage(currentPage + 1)" [disabled]="loading || currentPage >= totalPages">Next</button>
      </nav>
    </div>
    <ng-template #empty><div class="pagination-empty" *ngIf="showEmpty">Tidak ada data.</div></ng-template>
  `,
  styles: [`
    :host { position:relative; z-index:50; display:block; width:100%; min-width:0; }
    .app-pagination { display:flex; flex-wrap:wrap; align-items:center; justify-content:center; gap:18px; box-sizing:border-box; width:100%; min-width:0; padding:10px 14px; min-height:64px; border:1px solid #cfe4ff; border-radius:6px; background:#f8fafc; color:#365b78; font-size:12px; }
    .pagination-summary { display:flex; align-items:center; gap:12px; min-width:0; white-space:nowrap; }
    .pagination-summary > span { min-width:0; }
    .pagination-summary label { display:flex; align-items:center; gap:8px; min-width:0; }
    .page-size-dropdown { position:relative; display:block; flex:0 0 68px; width:68px; min-width:68px; }
    .page-size-trigger { display:flex; align-items:center; justify-content:space-between; box-sizing:border-box; width:100%; height:32px; padding:0 9px 0 10px; border:1px solid #183b56; border-radius:6px; background:#fff; color:#183b56; cursor:pointer; font:inherit; font-size:13px; text-align:left; }
    .page-size-trigger:focus-visible { outline:2px solid #79b4ff; outline-offset:2px; }
    .page-size-trigger:disabled { cursor:not-allowed; opacity:.55; }
    .page-size-chevron { width:7px; height:7px; border-right:1.8px solid #183b56; border-bottom:1.8px solid #183b56; transform:rotate(45deg) translateY(-2px); transition:transform .15s ease; }
    .page-size-dropdown.is-open .page-size-chevron { transform:rotate(225deg) translate(-1px, -1px); }
    .page-size-menu { position:absolute; z-index:20; top:calc(100% + 1px); left:0; width:100%; padding:4px 0; box-sizing:border-box; overflow:hidden; border:1px solid #d8e8f8; border-radius:9px; background:#fff; box-shadow:0 5px 14px rgba(24,59,86,.12); }
    .page-size-dropdown.drop-up .page-size-menu { top:auto; bottom:calc(100% + 1px); }
    .page-size-option { display:block; width:calc(100% - 8px); min-height:35px; margin:0 4px; padding:7px 10px; border:0; border-radius:6px; background:transparent; color:#183b56; cursor:pointer; font:inherit; font-size:16px; line-height:1.2; text-align:left; }
    .page-size-option:hover, .page-size-option.selected { background:#e8f2fc; color:#1269e3; font-weight:600; }
    .pagination-controls { display:flex; align-items:center; gap:5px; }
    .pagination-button { min-width:31px; height:30px; padding:0 9px; border:1px solid #cfe4ff; border-radius:6px; background:white; color:#174a70; cursor:pointer; font-size:12px; }
    .pagination-button:hover:not(:disabled), .pagination-button.active { background:#1269e3; color:white; border-color:#1269e3; }
    .pagination-button.active { box-shadow:0 0 0 2px #f5c400; }
    .pagination-button:disabled { cursor:not-allowed; opacity:.55; }
    .pagination-ellipsis { padding:0 5px; color:#70879a; }
    .pagination-loading { color:#1269e3; }
    .pagination-empty { padding:16px; color:#70879a; text-align:center; }
    @media (max-width: 768px) {
      .app-pagination { align-items:stretch; flex-direction:column; gap:10px; padding:10px 12px; }
      .pagination-summary { justify-content:space-between; width:100%; white-space:normal; gap:10px; padding-right:12px; box-sizing:border-box; }
      .pagination-summary > span { flex:1 1 auto; line-height:1.25; overflow-wrap:anywhere; }
      .pagination-summary label { flex:0 0 114px; justify-content:space-between; line-height:1.25; }
      .page-size-dropdown { flex-basis:68px; width:68px; min-width:68px; }
      .pagination-controls { justify-content:center; flex-wrap:wrap; width:100%; }
    }
  `]
})
export class PaginationComponent {
  @Input() totalItems = 0;
  @Input() currentPage = 1;
  @Input() pageSize = 25;
  @Input() pageSizeOptions = [10, 25, 50, 100];
  @Input() loading = false;
  @Input() showEmpty = true;
  pageSizeOpen = false;
  pageSizeDropUp = false;
  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  get totalPages(): number { return Math.max(1, Math.ceil(this.totalItems / this.pageSize)); }
  get startItem(): number { return this.totalItems ? ((this.currentPage - 1) * this.pageSize) + 1 : 0; }
  get endItem(): number { return Math.min(this.currentPage * this.pageSize, this.totalItems); }
  get pages(): Array<number | string> {
    const total = this.totalPages;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (this.currentPage <= 3) return [1, 2, 3, 4, '...', total];
    if (this.currentPage >= total - 2) return [1, '...', total - 3, total - 2, total - 1, total];
    return [1, '...', this.currentPage - 1, this.currentPage, this.currentPage + 1, '...', total];
  }
  goToPage(page: number | string): void { if (typeof page === 'number' && page >= 1 && page <= this.totalPages && page !== this.currentPage) this.pageChange.emit(page); }
  togglePageSize(event: MouseEvent): void {
    event.stopPropagation();
    if (this.loading) return;
    this.pageSizeOpen = !this.pageSizeOpen;
    if (this.pageSizeOpen) this.updatePageSizeDirection(event.currentTarget as HTMLElement);
  }
  selectPageSize(size: number, event: MouseEvent): void { event.stopPropagation(); this.pageSizeOpen = false; this.pageSizeDropUp = false; this.pageSizeChange.emit(Number(size)); }
  @HostListener('document:click') closePageSize(): void { this.pageSizeOpen = false; this.pageSizeDropUp = false; }
  @HostListener('window:resize') onWindowResize(): void { if (this.pageSizeOpen) this.updatePageSizeDirection(); }

  private updatePageSizeDirection(trigger?: HTMLElement): void {
    const element = trigger || document.querySelector('.page-size-trigger') as HTMLElement | null;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    this.pageSizeDropUp = spaceBelow < 155 && spaceAbove > spaceBelow;
  }
}
