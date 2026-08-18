import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SeoRouteData {
  title?: string;
  description?: string;
  indexable?: boolean;
  type?: 'website' | 'software';
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly defaultDescription = `${environment.appName} adalah sistem absensi digital untuk membantu ${environment.companyName} mengelola kehadiran karyawan secara mudah, cepat, dan terintegrasi.`;

  constructor(
    private readonly router: Router,
    private readonly activatedRoute: ActivatedRoute,
    private readonly title: Title,
    private readonly meta: Meta,
    @Inject(DOCUMENT) private readonly document: Document
  ) {
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe(() => {
      let route = this.activatedRoute;
      while (route.firstChild) route = route.firstChild;
      this.update(route.snapshot.data['seo'] as SeoRouteData | undefined, route.snapshot.url.map(segment => segment.path).join('/'));
    });
  }

  update(data?: SeoRouteData, routePath = ''): void {
    const indexable = data?.indexable === true;
    const title = data?.title ?? `${environment.appName} | ${environment.companyName}`;
    const description = data?.description ?? this.defaultDescription;
    const canonicalUrl = this.absoluteUrl(routePath);
    const imageUrl = environment.socialImageUrl;

    this.title.setTitle(title);
    this.set('description', description);
    this.set('robots', indexable ? 'index, follow' : 'noindex, nofollow');
    this.set('og:title', title, 'property');
    this.set('og:description', description, 'property');
    this.set('og:type', data?.type === 'software' ? 'website' : 'website', 'property');
    this.set('og:url', canonicalUrl, 'property');
    this.set('og:image', imageUrl, 'property');
    this.set('og:site_name', environment.companyName, 'property');
    this.set('twitter:card', 'summary_large_image');
    this.set('twitter:title', title);
    this.set('twitter:description', description);
    this.set('twitter:image', imageUrl);

    let canonical = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = this.document.createElement('link');
      canonical.rel = 'canonical';
      this.document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;
    this.updateStructuredData(indexable, canonicalUrl);
  }

  private set(name: string, content: string, attribute: 'name' | 'property' = 'name'): void {
    this.meta.updateTag({ [attribute]: name, content }, `${attribute}="${name}"`);
  }

  private absoluteUrl(path: string): string {
    const cleanPath = path ? `/${path.replace(/^\/+/, '')}` : '/';
    return `${environment.publicSiteUrl.replace(/\/$/, '')}${cleanPath}`;
  }

  private updateStructuredData(indexable: boolean, url: string): void {
    const id = 'seo-json-ld';
    let script = this.document.head.querySelector<HTMLScriptElement>(`#${id}`);
    if (!indexable) {
      script?.remove();
      return;
    }
    if (!script) {
      script = this.document.createElement('script');
      script.id = id;
      script.type = 'application/ld+json';
      this.document.head.appendChild(script);
    }
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'Organization', name: environment.companyName, url, logo: environment.logoUrl, description: `${environment.companyName} menggunakan solusi digital untuk mendukung pengelolaan operasional dan kehadiran karyawan.` },
        { '@type': 'WebSite', name: environment.appName, url },
        { '@type': 'SoftwareApplication', name: environment.appName, applicationCategory: 'BusinessApplication', operatingSystem: 'Web', description: 'Sistem absensi digital untuk membantu pengelolaan kehadiran karyawan.' }
      ]
    });
  }
}
