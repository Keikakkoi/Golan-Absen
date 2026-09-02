import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="app-pagination" [class.is-loading]="loading" *ngIf="totalItems > 0 || loading; else empty">
      <div class="pagination-summary">
        <span *ngIf="!loading">Menampilkan {{ startItem }}-{{ endItem }} dari {{ totalItems }} data</span>
        <span *ngIf="loading" class="pagination-loading">Memuat data...</span>
        <label>Data per halaman
          <select [ngModel]="pageSize" (ngModelChange)="changePageSize($event)" [disabled]="loading" aria-label="Data per halaman">
            <option *ngFor="let size of pageSizeOptions" [ngValue]="size">{{ size }}</option>
          </select>
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
    :host { display:block; width:100%; min-width:0; }
    .app-pagination { display:flex; flex-wrap:wrap; align-items:center; justify-content:center; gap:18px; box-sizing:border-box; width:100%; min-width:0; padding:10px 14px; min-height:64px; border:1px solid #cfe4ff; border-radius:6px; background:#f8fafc; color:#365b78; font-size:12px; }
    .pagination-summary { display:flex; align-items:center; gap:12px; min-width:0; white-space:nowrap; }
    .pagination-summary > span { min-width:0; }
    .pagination-summary label { display:flex; align-items:center; gap:8px; min-width:0; }
    .pagination-summary select { flex:0 0 68px; width:68px; min-width:68px; box-sizing:border-box; appearance:none; -webkit-appearance:none; padding:7px 25px 7px 10px; border:1px solid #cfe4ff; border-radius:6px; background-color:white; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23183b56' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 8px center; color:#183b56 !important; font-size:13px; line-height:1.2; text-align:left; }
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
      .pagination-summary { justify-content:space-between; width:100%; white-space:normal; gap:10px; }
      .pagination-summary > span { flex:1 1 auto; line-height:1.25; overflow-wrap:anywhere; }
      .pagination-summary label { flex:0 0 114px; justify-content:space-between; line-height:1.25; }
      .pagination-summary select { flex-basis:68px; width:68px; min-width:68px; }
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
  changePageSize(size: number): void { this.pageSizeChange.emit(Number(size)); }
}
