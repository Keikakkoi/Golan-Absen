import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { roleHome } from '../../../core/auth/role';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.scss'
})
export class NotFoundComponent {
  readonly homeLink = this.resolveHomeLink();

  private resolveHomeLink(): string {
    return roleHome(localStorage.getItem('role'));
  }
}
