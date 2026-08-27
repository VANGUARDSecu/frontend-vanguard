import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // Form group definition
  readonly loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rememberMe: [false],
  });

  // State signals
  readonly showPassword = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly submitted = signal<boolean>(false);

  // Single timed notification state with auto-dismiss
  readonly notification = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  private notificationTimer: any = null;

  ngOnInit(): void {
    // If user is already logged in, redirect straight to dashboard
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    // Pre-fill remembered email if cached
    const rememberedEmail = this.authService.getRememberedEmail();
    if (rememberedEmail) {
      this.loginForm.patchValue({
        email: rememberedEmail,
        rememberMe: true,
      });
    }
  }

  togglePassword(): void {
    this.showPassword.update((val) => !val);
  }

  toggleRememberMe(): void {
    const current = this.loginForm.get('rememberMe')?.value;
    this.loginForm.patchValue({ rememberMe: !current });
  }

  showNotification(type: 'success' | 'error', message: string, durationMs = 5000): void {
    if (this.notificationTimer) {
      clearTimeout(this.notificationTimer);
      this.notificationTimer = null;
    }

    this.notification.set({ type, message });

    this.notificationTimer = setTimeout(() => {
      this.dismissNotification();
    }, durationMs);
  }

  dismissNotification(): void {
    if (this.notificationTimer) {
      clearTimeout(this.notificationTimer);
      this.notificationTimer = null;
    }
    this.notification.set(null);
  }

  onSubmit(): void {
    this.submitted.set(true);

    if (this.loginForm.invalid) {
      this.showNotification('error', 'Please fill in all required fields properly.');
      return;
    }

    this.isLoading.set(true);
    const { email, password, rememberMe } = this.loginForm.value;

    this.authService.login({ email: email.trim(), password }).subscribe({
      next: (response) => {
        this.isLoading.set(false);

        // Handle Remember Me caching
        if (rememberMe) {
          this.authService.setRememberedEmail(email.trim());
        } else {
          this.authService.clearRememberedEmail();
        }

        if (response.requireMfa) {
          this.showNotification('success', 'Credentials verified! Redirecting to 2-Step Verification...', 3000);
          setTimeout(() => {
            this.router.navigate(['/verify-otp'], {
              queryParams: {
                email: email.trim(),
                mode: 'signin',
                hasTotp: response.hasTotp ? 'true' : 'false',
              },
            });
          }, 600);
        } else {
          this.showNotification('success', 'Login successful! Redirecting...', 3000);
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 600);
        }
      },
      error: (err: Error) => {
        this.isLoading.set(false);
        this.showNotification('error', err.message || 'Invalid email or password.');
      },
    });
  }

  onGoogleLogin(): void {
    this.showNotification('success', 'Connecting to Google Authentication...', 6000);
    this.authService.getGoogleOAuthUrl().subscribe({
      next: (response) => {
        if (response.url) {
          window.location.href = response.url;
        } else {
          this.showNotification('error', 'Google authentication URL was not received.');
        }
      },
      error: (err: Error) => {
        this.showNotification('error', err.message || 'Google login is currently unavailable.');
      },
    });
  }
}
