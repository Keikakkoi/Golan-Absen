import { Injectable, signal } from '@angular/core';

/** Keeps a short, flicker-free loading state for initial API reads. */
@Injectable({ providedIn: 'root' })
export class PageLoadingService {
  readonly isVisible = signal(false);
  private pending = 0;
  private showTimer?: ReturnType<typeof setTimeout>;
  private hideTimer?: ReturnType<typeof setTimeout>;
  private startedAt = 0;
  // Show immediately, then keep it visible briefly. This prevents a text spinner
  // from flashing through on pages whose request completes very quickly.
  private readonly showDelay = 0;
  private readonly minimumVisible = 220;

  begin(): void {
    if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = undefined; }
    this.pending++;
    if (this.pending !== 1) return;
    this.startedAt = Date.now();
    this.showTimer = setTimeout(() => { this.showTimer = undefined; this.isVisible.set(true); }, this.showDelay);
  }

  end(): void {
    this.pending = Math.max(0, this.pending - 1);
    if (this.pending) return;
    if (this.showTimer) { clearTimeout(this.showTimer); this.showTimer = undefined; }
    if (!this.isVisible()) return;
    const remaining = Math.max(0, this.minimumVisible - (Date.now() - this.startedAt - this.showDelay));
    this.hideTimer = setTimeout(() => { this.hideTimer = undefined; if (!this.pending) this.isVisible.set(false); }, remaining);
  }
}
