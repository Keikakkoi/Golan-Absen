import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss'
})
export class ForgotPasswordComponent {
  email: string = '';
  isLoading: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';
  resetLink: string = '';

  constructor(private authService: AuthService) {}

  onSubmit(): void {
    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';
    this.resetLink = '';

    this.authService.requestPasswordReset(this.email)
      .subscribe({
        next: (res) => {
          this.isLoading = false;
          this.successMessage = res.message || 'Jika email terdaftar, link reset password akan dikirim.';
          if (res.mock_token) {
            this.resetLink = `${window.location.origin}/reset-password?token=${encodeURIComponent(res.mock_token)}`;
          }
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err.error?.error || 'Permintaan reset password gagal. Silakan coba lagi.';
        }
      });
  }
}
