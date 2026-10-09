import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { roleHome } from '../../../core/auth/role';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './forbidden.component.html',
  styleUrl: './forbidden.component.scss'
})
export class ForbiddenComponent {
  readonly homeLink = this.resolveHomeLink();

  private resolveHomeLink(): string {
    return roleHome(localStorage.getItem('role'));
  }
}
