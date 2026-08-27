import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

/**
 * Custom validator to check that password and confirmPassword match
 */
export const passwordMatchValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  if (!password || !confirmPassword) return null;

  return password.value === confirmPassword.value
    ? null
    : { passwordMismatch: true };
};

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // Registration Form definition with JumpCloud fields
  readonly registerForm: FormGroup = this.fb.group(
    {
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      companyName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[+]?[\d\s().-]{7,20}$/)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      agreeTerms: [false, [Validators.requiredTrue]],
    },
    { validators: passwordMatchValidator }
  );

  // State signals
  readonly showPassword = signal<boolean>(false);
  readonly showConfirmPassword = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly submitted = signal<boolean>(false);

  // Legal modal state signal
  readonly legalModal = signal<'terms' | 'privacy' | null>(null);

  // Single active timed notification
  readonly notification = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  private notificationTimer: any = null;

  openLegalModal(type: 'terms' | 'privacy', event?: Event): void {
    if (event) event.preventDefault();
    this.legalModal.set(type);
  }

  closeLegalModal(): void {
    this.legalModal.set(null);
  }

  acceptTermsFromModal(): void {
    this.registerForm.patchValue({ agreeTerms: true });
    this.closeLegalModal();
  }

  togglePassword(): void {
    this.showPassword.update((val) => !val);
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword.update((val) => !val);
  }

  toggleAgreeTerms(): void {
    const current = this.registerForm.get('agreeTerms')?.value;
    this.registerForm.patchValue({ agreeTerms: !current });
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

    if (this.registerForm.invalid) {
      if (this.registerForm.errors?.['passwordMismatch']) {
        this.showNotification('error', 'Passwords do not match. Please verify both fields.');
      } else if (this.registerForm.get('agreeTerms')?.invalid) {
        this.showNotification('error', 'Please accept the Terms of Service and Privacy Policy.');
      } else {
        this.showNotification('error', 'Please fill in all required registration fields properly.');
      }
      return;
    }

    this.isLoading.set(true);
    const formVal = this.registerForm.value;

    const payload = {
      email: formVal.email.trim(),
      password: formVal.password,
      firstName: formVal.firstName.trim(),
      lastName: formVal.lastName.trim(),
      companyName: formVal.companyName.trim(),
      phone: formVal.phone.trim(),
    };

    this.authService.signup(payload).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.showNotification(
          'success',
          response.message || 'Account registered! Please enter your 6-digit email verification code.',
          4000
        );

        setTimeout(() => {
          this.router.navigate(['/verify-otp'], {
            queryParams: { email: payload.email, mode: 'signup' },
          });
        }, 1000);
      },
      error: (err: Error) => {
        this.isLoading.set(false);
        this.showNotification('error', err.message || 'Registration failed. Please try again.');
      },
    });
  }
}
