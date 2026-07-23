import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

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
    const role = localStorage.getItem('role');
    if (role === 'HRD') return '/admin/dashboard';
    if (role === 'Pimpinan') return '/executive/dashboard';
    if (role === 'Karyawan') return '/employee/checkin';
    return '/login';
  }
}
