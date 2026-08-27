import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  loginForm: FormGroup;
  showPassword = signal(false);
  isLoading = signal(false);
  loginSuccessMessage = signal<string | null>(null);
  loginErrorMessage = signal<string | null>(null);
  submitted = signal(false);

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false],
    });
  }

  togglePassword(): void {
    this.showPassword.update((val) => !val);
  }

  toggleRememberMe(): void {
    const current = this.loginForm.get('rememberMe')?.value;
    this.loginForm.patchValue({ rememberMe: !current });
  }

  onSubmit(): void {
    this.submitted.set(true);
    this.loginSuccessMessage.set(null);
    this.loginErrorMessage.set(null);

    if (this.loginForm.invalid) {
      this.loginErrorMessage.set('Please fill in all required fields correctly.');
      return;
    }

    this.isLoading.set(true);
    const { email, password } = this.loginForm.value;

    this.authService.login({ email, password }).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.loginSuccessMessage.set('Login successful! Redirecting to dashboard...');
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 500);
      },
      error: (err: Error) => {
        this.isLoading.set(false);
        this.loginErrorMessage.set(err.message || 'Invalid email or password.');
      },
    });
  }

  onSocialLogin(provider: 'google' | 'facebook' | 'apple'): void {
    console.log(`Initiating social login with ${provider}...`);
    this.loginSuccessMessage.set(`Connecting to ${provider.toUpperCase()} authentication...`);
  }

  onForgotPassword(event: Event): void {
    event.preventDefault();
    console.log('Forgot password clicked');
    this.loginErrorMessage.set('Password reset link will be sent to your registered email.');
  }

  onSignUp(event: Event): void {
    event.preventDefault();
    console.log('Sign up clicked');
    this.loginSuccessMessage.set('Sign Up page routing will be available soon.');
  }
}
