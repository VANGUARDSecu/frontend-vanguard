import { Component, OnInit, OnDestroy, inject, signal, computed, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

export type VerificationMethod = 'email_otp' | 'totp';

@Component({
  selector: 'app-verify-otp',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './verify-otp.component.html',
  styleUrl: './verify-otp.component.css',
})
export class VerifyOtpComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  // State signals
  readonly email = signal<string>('');
  readonly mode = signal<'signup' | 'signin' | 'recovery'>('signup');
  readonly method = signal<VerificationMethod>('email_otp');
  readonly hasTotp = signal<boolean>(false);
  
  // Dynamic code length: TOTP is 6 digits, Email OTP is 8 digits (matching Supabase email template)
  readonly codeLength = computed<number>(() => (this.method() === 'totp' ? 6 : 8));
  readonly separatorIndex = computed<number>(() => (this.method() === 'totp' ? 2 : 3));
  readonly digits = signal<string[]>(new Array(8).fill(''));
  
  readonly isLoading = signal<boolean>(false);
  readonly submitted = signal<boolean>(false);
  readonly resendCountdown = signal<number>(0);

  // Notification signal with auto-dismiss
  readonly notification = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  private notificationTimer: any = null;
  private resendInterval: any = null;

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const emailParam = params['email'] || this.authService.pendingEmail() || 'user@vanguard.security';
      const modeParam = (params['mode'] || this.authService.pendingMode() || 'signup') as
        | 'signup'
        | 'signin'
        | 'recovery';
      const hasTotpParam = params['hasTotp'] === 'true';
      const methodParam = (params['method'] || 'email_otp') as VerificationMethod;

      this.email.set(emailParam);
      this.mode.set(modeParam);
      this.hasTotp.set(hasTotpParam);
      this.method.set(methodParam);

      this.clearOtpInputs();
      this.startResendTimer(30);
    });
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  private clearTimers(): void {
    if (this.notificationTimer) clearTimeout(this.notificationTimer);
    if (this.resendInterval) clearInterval(this.resendInterval);
  }

  setMethod(newMethod: VerificationMethod): void {
    this.method.set(newMethod);
    this.clearOtpInputs();
    if (newMethod === 'totp') {
      this.showNotification('success', 'Switched to Authenticator App mode. Enter the 6-digit code from your app.', 4000);
    } else {
      this.showNotification('success', 'Switched to Email OTP mode. Enter the 8-digit code sent to your email.', 4000);
    }
  }

  clearOtpInputs(): void {
    const len = this.codeLength();
    this.digits.set(new Array(len).fill(''));
    setTimeout(() => {
      const firstInput = this.otpInputs?.first?.nativeElement;
      if (firstInput) firstInput.focus();
    }, 50);
  }

  onDigitInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, ''); // Keep only numeric
    const currentDigits = [...this.digits()];
    const len = this.codeLength();

    if (value.length > 0) {
      currentDigits[index] = value.charAt(value.length - 1);
      this.digits.set(currentDigits);

      // Auto-advance to next box
      if (index < len - 1) {
        const nextInput = this.otpInputs.toArray()[index + 1]?.nativeElement;
        if (nextInput) nextInput.focus();
      }
    } else {
      currentDigits[index] = '';
      this.digits.set(currentDigits);
    }

    // Auto submit if all digits entered
    if (this.digits().length === len && this.digits().every((d) => d.length === 1)) {
      this.onSubmit();
    }
  }

  onKeyDown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace') {
      const currentDigits = [...this.digits()];
      if (!currentDigits[index] && index > 0) {
        const prevInput = this.otpInputs.toArray()[index - 1]?.nativeElement;
        if (prevInput) {
          prevInput.focus();
          currentDigits[index - 1] = '';
          this.digits.set(currentDigits);
        }
      } else {
        currentDigits[index] = '';
        this.digits.set(currentDigits);
      }
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text') || '';
    const len = this.codeLength();
    const numericData = pastedData.replace(/\D/g, '').slice(0, len);

    if (numericData.length > 0) {
      const currentDigits = new Array(len).fill('');
      for (let i = 0; i < numericData.length; i++) {
        currentDigits[i] = numericData[i];
      }
      this.digits.set(currentDigits);

      const targetIndex = Math.min(numericData.length, len - 1);
      const targetInput = this.otpInputs.toArray()[targetIndex]?.nativeElement;
      if (targetInput) targetInput.focus();

      if (numericData.length === len) {
        this.onSubmit();
      }
    }
  }

  startResendTimer(seconds: number): void {
    if (this.resendInterval) clearInterval(this.resendInterval);
    this.resendCountdown.set(seconds);

    this.resendInterval = setInterval(() => {
      const current = this.resendCountdown();
      if (current > 1) {
        this.resendCountdown.set(current - 1);
      } else {
        this.resendCountdown.set(0);
        clearInterval(this.resendInterval);
      }
    }, 1000);
  }

  onResendOtp(): void {
    if (this.resendCountdown() > 0 || this.isLoading()) return;

    this.isLoading.set(true);
    const email = this.email();

    if (this.mode() === 'recovery') {
      this.authService.forgotPassword(email).subscribe({
        next: (res) => {
          this.isLoading.set(false);
          this.showNotification(
            'success',
            res.message || 'New recovery code dispatched to your email!',
            5000
          );
          this.startResendTimer(60);
          this.clearOtpInputs();
        },
        error: (err: Error) => {
          this.isLoading.set(false);
          this.showNotification('error', err.message || 'Failed to resend recovery code. Please try again.');
        },
      });
      return;
    }

    const type = this.mode() === 'signup' ? 'signup' : 'signin';

    this.authService.resendOtp(email, type).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.showNotification('success', res.message || 'New verification code dispatched to your email!', 5000);
        this.startResendTimer(45);
        this.clearOtpInputs();
      },
      error: (err: Error) => {
        this.isLoading.set(false);
        this.showNotification('error', err.message || 'Failed to resend code. Please try again.');
      },
    });
  }

  showNotification(type: 'success' | 'error', message: string, durationMs = 5000): void {
    if (this.notificationTimer) clearTimeout(this.notificationTimer);
    this.notification.set({ type, message });

    this.notificationTimer = setTimeout(() => {
      this.dismissNotification();
    }, durationMs);
  }

  dismissNotification(): void {
    if (this.notificationTimer) clearTimeout(this.notificationTimer);
    this.notification.set(null);
  }

  onSubmit(): void {
    const code = this.digits().join('');
    const len = this.codeLength();

    if (code.length < len) {
      this.showNotification('error', `Please enter the complete ${len}-digit verification code.`);
      return;
    }

    this.isLoading.set(true);
    const email = this.email();
    const currentMethod = this.method();

    if (currentMethod === 'totp') {
      this.authService.verifyTotp(email, code).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.showNotification('success', 'Authenticator verified! Redirecting to secure vault...', 3000);
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 800);
        },
        error: (err: Error) => {
          this.isLoading.set(false);
          this.showNotification('error', err.message || 'Invalid authenticator code. Please check your app.');
        },
      });
    } else if (this.mode() === 'recovery') {
      this.authService.verifyOtp(email, code, 'recovery').subscribe({
        next: () => {
          this.isLoading.set(false);
          this.showNotification('success', 'Recovery code verified! Redirecting to reset password...', 3000);
          setTimeout(() => {
            this.router.navigate(['/reset-password']);
          }, 800);
        },
        error: (err: Error) => {
          this.isLoading.set(false);
          this.showNotification('error', err.message || 'Invalid or expired recovery code.');
        },
      });
    } else {
      const otpType = this.mode() === 'signup' ? 'signup' : 'email';
      this.authService.verifyOtp(email, code, otpType).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.showNotification('success', 'Email verified successfully! Redirecting to dashboard...', 3000);
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 800);
        },
        error: (err: Error) => {
          this.isLoading.set(false);
          this.showNotification('error', err.message || 'Invalid or expired verification code.');
        },
      });
    }
  }
}
