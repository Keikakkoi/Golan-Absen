import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiSkeletonComponent } from '../ui-skeleton/ui-skeleton.component';

@Component({ selector: 'app-page-skeleton', standalone: true, imports: [CommonModule, UiSkeletonComponent], templateUrl: './page-skeleton.component.html', styleUrl: './page-skeleton.component.scss' })
export class PageSkeletonComponent { @Input() visible = false; }
