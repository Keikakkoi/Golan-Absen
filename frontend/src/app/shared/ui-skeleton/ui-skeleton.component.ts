import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Shared, layout-preserving placeholders for asynchronous application data.
 * The variants intentionally mirror the building blocks used by all roles.
 */
@Component({
  selector: 'app-ui-skeleton',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui-skeleton.component.html',
  styleUrl: './ui-skeleton.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiSkeletonComponent {
  @Input() type: 'text' | 'button' | 'card' | 'table' | 'list' | 'navbar' | 'profile' | 'dropdown' = 'text';
  @Input() rows = 4;
  @Input() columns = 5;
  @Input() cards = 4;
  @Input() ariaLabel = 'Memuat konten';

  get rowItems(): number[] { return Array.from({ length: this.rows }); }
  get columnItems(): number[] { return Array.from({ length: this.columns }); }
  get cardItems(): number[] { return Array.from({ length: this.cards }); }
}
