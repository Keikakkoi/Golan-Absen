import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss'
})
export class ResetPasswordComponent implements OnInit {
  newPassword = '';
  confirmPassword = '';
  token = '';
  
  isLoading = false;
  successMessage = '';
  errorMessage = '';

  constructor(private route: ActivatedRoute, private authService: AuthService) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
      if (!this.token) {
        this.errorMessage = 'Token tidak valid atau tidak ditemukan.';
      }
    });
  }

  onSubmit(): void {
    if (!this.token) {
      this.errorMessage = 'Token tidak valid atau tidak ditemukan.';
      return;
    }

    if (this.newPassword.length < 8) {
      this.errorMessage = 'Password baru minimal 8 karakter.';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Password tidak cocok.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.resetPassword(this.token, this.newPassword).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.successMessage = res.message || 'Password berhasil diubah.';
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.error || 'Reset password gagal. Silakan minta link baru.';
      }
    });
  }
}
