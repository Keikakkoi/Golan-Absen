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
      this.token = sessionStorage.getItem('password_reset_token') || '';
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

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}/.test(this.newPassword)) {
      this.errorMessage = 'Password minimal 8 karakter dan harus mengandung huruf besar, huruf kecil, serta angka.';
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
        sessionStorage.removeItem('password_reset_token');
        sessionStorage.removeItem('password_reset_email');
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.error || 'Reset password gagal. Silakan minta link baru.';
      }
    });
  }
}
