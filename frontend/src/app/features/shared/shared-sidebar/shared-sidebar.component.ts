import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-shared-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './shared-sidebar.component.html',
  styleUrls: ['./shared-sidebar.component.scss']
})
export class SharedSidebarComponent implements OnInit {
  userRole: string | null = null;
  isDrawerOpen = false;
  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.userRole = this.authService.getRole();
  }

  toggleDrawer(): void {
    this.isDrawerOpen = !this.isDrawerOpen;
  }

  closeDrawer(): void {
    this.isDrawerOpen = false;
  }

  logout(event: Event): void {
    event.preventDefault();
    this.isDrawerOpen = false;
    this.authService.logout();
  }
}
