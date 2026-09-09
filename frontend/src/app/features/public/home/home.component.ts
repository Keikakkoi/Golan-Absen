import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { HttpContext } from '@angular/common/http';
import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SKIP_PAGE_LOADING } from '../../../core/interceptors/page-loading-context';

interface AttendanceSummary {
  team_present_percentage: number;
  present: number;
  late: number;
  last_updated?: string;
}

@Component({ selector: 'app-home', standalone: true, imports: [CommonModule, RouterLink], templateUrl: './home.component.html', styleUrl: './home.component.scss' })
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly jakartaTimeZone = 'Asia/Jakarta';
  todayLabel = '';
  lastUpdatedLabel = '';
  summary: AttendanceSummary | null = null;
  loading = true;
  error = false;
  private refreshTimer?: ReturnType<typeof setInterval>;
  private clockTimer?: ReturnType<typeof setInterval>;
  private revealObserver?: IntersectionObserver;
  private footerObserver?: IntersectionObserver;

  constructor(private http: HttpClient, private elementRef: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    this.updateDate();
    this.loadSummary();
    this.clockTimer = setInterval(() => this.updateDate(), 60_000);
    this.refreshTimer = setInterval(() => this.loadSummary(true), 30_000);
  }

  ngAfterViewInit(): void {
    const revealElements = Array.from(this.elementRef.nativeElement.querySelectorAll<HTMLElement>(
      '.trust-strip, .features, .feature-grid article, .about, .about-illustration, .public-footer'
    ));
    revealElements.forEach(element => element.classList.add('reveal'));

    if (!revealElements.length) return;
    if (!('IntersectionObserver' in window)) {
      revealElements.forEach(element => element.classList.add('is-visible'));
      return;
    }

    this.revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const element = entry.target as HTMLElement;
        element.classList.add('is-visible');
        this.revealObserver?.unobserve(element);
      });
    }, { rootMargin: '0px 0px -80px 0px' });

    revealElements.forEach(element => this.revealObserver?.observe(element));

    // A short footer can remain below the -80px observer boundary at the
    // document's absolute bottom, so observe it against the full viewport.
    const footer = this.elementRef.nativeElement.querySelector<HTMLElement>('.public-footer');
    if (footer) {
      this.footerObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          footer.classList.add('is-visible');
          this.footerObserver?.disconnect();
        });
      });
      this.footerObserver.observe(footer);
    }
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    if (this.clockTimer) clearInterval(this.clockTimer);
    this.revealObserver?.disconnect();
    this.footerObserver?.disconnect();
  }

  loadSummary(background = false): void {
    const context = new HttpContext().set(SKIP_PAGE_LOADING, background);
    this.http.get<AttendanceSummary>('http://localhost:8080/api/v1/public/attendance-summary', { context }).subscribe({
      next: summary => {
        this.summary = summary;
        this.error = false;
        this.loading = false;
        this.lastUpdatedLabel = this.formatTime(summary.last_updated);
      },
      error: () => {
        this.error = true;
        this.loading = false;
        if (!this.lastUpdatedLabel) this.lastUpdatedLabel = this.formatTime();
      }
    });
  }

  private updateDate(): void {
    const now = new Date();
    const dateParts = new Intl.DateTimeFormat('en-US', {
      timeZone: this.jakartaTimeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    }).formatToParts(now);
    const year = Number(dateParts.find(part => part.type === 'year')?.value);
    const month = Number(dateParts.find(part => part.type === 'month')?.value);
    const day = Number(dateParts.find(part => part.type === 'day')?.value);
    const weekdays = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    this.todayLabel = `${weekdays[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]}, ${String(day).padStart(2, '0')} ${months[month - 1]} ${year}`;
    if (!this.summary) this.lastUpdatedLabel = this.formatTime();
  }

  private formatTime(value?: string): string {
    const date = value ? new Date(value) : new Date();
    return `${new Intl.DateTimeFormat('id-ID', { timeZone: this.jakartaTimeZone, hour: '2-digit', minute: '2-digit', hour12: false }).format(date)} WIB`;
  }
}
