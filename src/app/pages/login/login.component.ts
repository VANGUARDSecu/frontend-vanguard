import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  loginForm: FormGroup;
  showPassword = signal(false);
  isLoading = signal(false);
  loginSuccessMessage = signal<string | null>(null);
  loginErrorMessage = signal<string | null>(null);
  submitted = signal(false);

  constructor(private fb: FormBuilder) {
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

    // Mock authentication request (Backend will be connected later)
    setTimeout(() => {
      this.isLoading.set(false);
      const email = this.loginForm.value.email;
      this.loginSuccessMessage.set(`Welcome back, ${email}! (Mock Login Successful)`);
      console.log('Login attempt with payload:', this.loginForm.value);
    }, 1200);
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
