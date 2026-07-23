import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

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
    const role = localStorage.getItem('role');
    if (role === 'HRD') return '/admin/dashboard';
    if (role === 'Pimpinan') return '/executive/dashboard';
    if (role === 'Karyawan') return '/employee/checkin';
    return '/login';
  }
}
