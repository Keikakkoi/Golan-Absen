import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-verify-password-otp', standalone: true, imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './verify-password-otp.component.html', styleUrl: './verify-password-otp.component.scss'
})
export class VerifyPasswordOtpComponent implements OnInit, OnDestroy {
  email = ''; otp = ''; isLoading = false; isResending = false; errorMessage = ''; successMessage = '';
  secondsLeft = 300; private timer?: ReturnType<typeof setInterval>;
  constructor(private auth: AuthService, private router: Router) {}
  ngOnInit(): void {
    this.email = sessionStorage.getItem('password_reset_email') || '';
    if (!this.email) { this.router.navigate(['/forgot-password']); return; }
    this.timer = setInterval(() => { if (this.secondsLeft > 0) this.secondsLeft--; }, 1000);
  }
  ngOnDestroy(): void { if (this.timer) clearInterval(this.timer); }
  get maskedEmail(): string { const [local, domain] = this.email.split('@'); return local && domain ? (local.length <= 2 ? '*' : local.slice(0, 2) + '*'.repeat(local.length - 2)) + '@' + domain : this.email; }
  get countdown(): string { return `${Math.floor(this.secondsLeft / 60)}:${String(this.secondsLeft % 60).padStart(2, '0')}`; }
  get developmentOtp(): string { return sessionStorage.getItem('password_reset_mock_otp') || ''; }
  verify(): void {
    this.errorMessage = ''; this.successMessage = '';
    if (!/^\d{6}$/.test(this.otp)) { this.errorMessage = 'Kode OTP harus terdiri dari 6 digit.'; return; }
    this.isLoading = true;
    this.auth.verifyPasswordOTP(this.email, this.otp).subscribe({ next: response => { this.isLoading = false; sessionStorage.removeItem('password_reset_mock_otp'); sessionStorage.setItem('password_reset_token', response.reset_token); this.router.navigate(['/reset-password']); }, error: err => { this.isLoading = false; this.errorMessage = err.error?.error || 'Verifikasi OTP gagal.'; } });
  }
  resend(): void {
    this.errorMessage = ''; this.isResending = true;
    this.auth.resendPasswordOTP(this.email).subscribe({ next: () => { this.isResending = false; this.secondsLeft = 300; this.successMessage = 'Kode OTP baru telah dikirim ke email Anda.'; }, error: err => { this.isResending = false; this.errorMessage = err.error?.error || 'Gagal mengirim ulang OTP.'; } });
  }
}
