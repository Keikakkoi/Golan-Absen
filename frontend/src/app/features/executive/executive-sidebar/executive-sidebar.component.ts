import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedSidebarComponent } from '../../shared/shared-sidebar/shared-sidebar.component';

@Component({
  selector: 'app-executive-sidebar',
  standalone: true,
  imports: [CommonModule, SharedSidebarComponent],
  template: `<app-shared-sidebar></app-shared-sidebar>`,
  styles: []
})
export class ExecutiveSidebarComponent {}
