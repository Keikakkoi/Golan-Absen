import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';

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
  mockOtp = '';

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit(): void {
    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';
    this.mockOtp = '';

    this.authService.requestPasswordReset(this.email)
      .subscribe({
        next: (res) => {
          this.isLoading = false;
          sessionStorage.setItem('password_reset_email', this.email.trim().toLowerCase());
          this.mockOtp = res.mock_otp || '';
          if (this.mockOtp) sessionStorage.setItem('password_reset_mock_otp', this.mockOtp);
          this.successMessage = res.message || 'Kode OTP telah dikirim ke email Anda.';
          this.router.navigate(['/verify-password-otp']);
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err.error?.error || 'Permintaan reset password gagal. Silakan coba lagi.';
        }
      });
  }
}
