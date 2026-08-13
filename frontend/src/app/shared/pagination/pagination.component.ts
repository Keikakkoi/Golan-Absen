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
    :host { display: block; }
    .app-pagination { display:flex; flex-wrap:wrap; align-items:center; justify-content:center; gap:18px; padding:10px 14px; min-height:64px; border:1px solid #cfe4ff; border-radius:6px; background:#f8fafc; color:#365b78; font-size:12px; }
    .pagination-summary { display:flex; align-items:center; gap:12px; white-space:nowrap; }
    .pagination-summary label { display:flex; align-items:center; gap:8px; }
    .pagination-summary select { min-width:56px; padding:7px 24px 7px 10px; border:1px solid #cfe4ff; border-radius:6px; background:white; color:#183b56; }
    .pagination-controls { display:flex; align-items:center; gap:5px; }
    .pagination-button { min-width:31px; height:30px; padding:0 9px; border:1px solid #cfe4ff; border-radius:6px; background:white; color:#174a70; cursor:pointer; font-size:12px; }
    .pagination-button:hover:not(:disabled), .pagination-button.active { background:#1269e3; color:white; border-color:#1269e3; }
    .pagination-button.active { box-shadow:0 0 0 2px #f5c400; }
    .pagination-button:disabled { cursor:not-allowed; opacity:.55; }
    .pagination-ellipsis { padding:0 5px; color:#70879a; }
    .pagination-loading { color:#1269e3; }
    .pagination-empty { padding:16px; color:#70879a; text-align:center; }
    @media (max-width: 640px) { .app-pagination { align-items:stretch; flex-direction:column; gap:10px; } .pagination-summary { justify-content:space-between; white-space:normal; } .pagination-controls { justify-content:center; flex-wrap:wrap; } }
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
