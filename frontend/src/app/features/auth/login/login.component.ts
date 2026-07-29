import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  currentTime: Date = new Date();
  mathQuestion = '';
  showPassword = false;
  private mathExpectedAnswer = 0;
  private timerId: any;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      mathAnswer: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.generateMathChallenge();
    this.timerId = setInterval(() => {
      this.currentTime = new Date();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const enteredMathAnswer = Number(this.loginForm.get('mathAnswer')?.value);
    if (!Number.isInteger(enteredMathAnswer) || enteredMathAnswer !== this.mathExpectedAnswer) {
      this.errorMessage = 'Jawaban matematika salah. Silakan coba lagi.';
      this.loginForm.get('mathAnswer')?.reset();
      this.generateMathChallenge();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: (res) => {
        this.isLoading = false;
        const role = String(res.role || '').trim().toUpperCase();
        if (role === 'HRD') {
          this.router.navigateByUrl('/admin/dashboard', { replaceUrl: true });
        } else if (role === 'PIMPINAN') {
          this.router.navigateByUrl('/executive/dashboard', { replaceUrl: true });
        } else {
          this.router.navigateByUrl('/employee/checkin', { replaceUrl: true });
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.error || 'Login failed. Please try again.';
      }
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  private generateMathChallenge(): void {
    const firstNumber = Math.floor(Math.random() * 9) + 1;
    const secondNumber = Math.floor(Math.random() * 9) + 1;
    this.mathExpectedAnswer = firstNumber + secondNumber;
    this.mathQuestion = `${firstNumber} + ${secondNumber}`;
  }
}
