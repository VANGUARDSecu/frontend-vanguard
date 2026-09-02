import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, map, tap, throwError } from 'rxjs';

export interface UserProfile {
  id?: string;
  email: string;
  user_metadata?: Record<string, any>;
}

export interface AuthSession {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName: string;
  phone: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  requireOtp?: boolean;
  requireMfa?: boolean;
  hasTotp?: boolean;
  enrolledMethods?: string[];
  user?: UserProfile;
  session?: AuthSession;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly API_URL = 'http://localhost:3000/auth';
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  // Signals for state management
  readonly currentUser = signal<UserProfile | null>(this.loadStoredUser());
  readonly token = signal<string | null>(this.loadStoredToken());
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly isPasswordResetRequired = signal<boolean>(this.loadStoredResetRequired());

  // Transient state for multi-step OTP / MFA / Recovery flow
  readonly pendingEmail = signal<string>('');
  readonly pendingMode = signal<'signup' | 'signin' | 'recovery'>('signup');

  constructor() {
    this.checkForOAuthCallback();
  }

  private loadStoredUser(): UserProfile | null {
    if (!this.isBrowser) return null;
    try {
      const stored = localStorage.getItem('vanguard_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private loadStoredToken(): string | null {
    if (!this.isBrowser) return null;
    try {
      return localStorage.getItem('vanguard_token');
    } catch {
      return null;
    }
  }

  private loadStoredResetRequired(): boolean {
    if (!this.isBrowser) return false;
    try {
      return localStorage.getItem('vanguard_reset_required') === 'true';
    } catch {
      return false;
    }
  }

  private checkForOAuthCallback(): void {
    if (!this.isBrowser) return;

    try {
      // 1. Check URL Hash (e.g. #access_token=... from Google OAuth or email confirmation)
      const hash = window.location.hash;
      if (hash && hash.includes('access_token=')) {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type');

        if (accessToken) {
          let email = 'verified_user@vanguard.security';
          let userId = 'vanguard_user_' + Date.now();
          try {
            const payload = JSON.parse(atob(accessToken.split('.')[1]));
            if (payload.email) email = payload.email;
            if (payload.sub) userId = payload.sub;
          } catch {}

          const userProfile: UserProfile = { id: userId, email };
          this.setSession(userProfile, {
            access_token: accessToken,
            refresh_token: refreshToken || undefined,
          });

          window.history.replaceState(null, '', window.location.pathname);
          if (type === 'recovery') {
            this.isPasswordResetRequired.set(true);
            if (this.isBrowser) localStorage.setItem('vanguard_reset_required', 'true');
            this.router.navigate(['/reset-password']);
          } else {
            this.router.navigate(['/dashboard']);
          }
          return;
        }
      }

      // 2. Check URL Search Query params (e.g. ?code=... or ?token_hash=...)
      const queryParams = new URLSearchParams(window.location.search);
      const code = queryParams.get('code');
      const tokenHash = queryParams.get('token_hash');
      const type = queryParams.get('type');

      if (code || tokenHash) {
        let email = 'user@vanguard.security';
        const userProfile: UserProfile = { id: 'user_' + Date.now(), email };
        this.setSession(userProfile, {
          access_token: 'vanguard_verified_' + Date.now(),
        });

        window.history.replaceState(null, '', window.location.pathname);
        if (type === 'recovery') {
          this.isPasswordResetRequired.set(true);
          if (this.isBrowser) localStorage.setItem('vanguard_reset_required', 'true');
          this.router.navigate(['/reset-password']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      }
    } catch (e) {
      console.error('Failed to parse auth callback params', e);
    }
  }

  /* ==========================================
     Remember Me Helpers
     ========================================== */
  getRememberedEmail(): string {
    if (!this.isBrowser) return '';
    try {
      return localStorage.getItem('vanguard_remembered_email') || '';
    } catch {
      return '';
    }
  }

  setRememberedEmail(email: string): void {
    if (!this.isBrowser) return;
    try {
      if (email) {
        localStorage.setItem('vanguard_remembered_email', email);
      } else {
        this.clearRememberedEmail();
      }
    } catch {}
  }

  clearRememberedEmail(): void {
    if (!this.isBrowser) return;
    try {
      localStorage.removeItem('vanguard_remembered_email');
    } catch {}
  }

  /* ==========================================
     Auth Actions
     ========================================== */
  login(credentials: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/login`, credentials).pipe(
      tap((response) => {
        if (response.success) {
          this.pendingEmail.set(credentials.email);
          this.pendingMode.set('signin');

          if (!response.requireMfa && response.user && response.session) {
            this.setSession(response.user, response.session);
          }
        }
      }),
      catchError((error: HttpErrorResponse) => {
        let errorMessage = 'An unexpected error occurred. Please try again.';
        if (error.error && error.error.message) {
          errorMessage = Array.isArray(error.error.message)
            ? error.error.message.join(', ')
            : error.error.message;
        } else if (error.status === 0) {
          errorMessage = 'Unable to connect to the backend server. Is it running on http://localhost:3000?';
        }
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  signup(payload: RegisterPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/signup`, payload).pipe(
      tap((response) => {
        if (response.success) {
          this.pendingEmail.set(payload.email);
          this.pendingMode.set('signup');

          if (!response.requireOtp && response.user && response.session) {
            this.setSession(response.user, response.session);
          }
        }
      }),
      catchError((error: HttpErrorResponse) => {
        let errorMessage = 'Registration failed. Please try again.';
        if (error.error && error.error.message) {
          errorMessage = Array.isArray(error.error.message)
            ? error.error.message.join(', ')
            : error.error.message;
        } else if (error.status === 0) {
          errorMessage = 'Unable to connect to the backend server.';
        }
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  verifyOtp(email: string, token: string, type: 'signup' | 'email' | 'recovery' = 'signup'): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.API_URL}/verify-otp`, { email, token, type })
      .pipe(
        tap((response) => {
          if (response.success && response.user && response.session) {
            this.setSession(response.user, response.session);
            if (type === 'recovery') {
              this.isPasswordResetRequired.set(true);
              if (this.isBrowser) localStorage.setItem('vanguard_reset_required', 'true');
            }
          }
        }),
        catchError((error: HttpErrorResponse) => {
          let errorMessage = 'Invalid or expired verification code.';
          if (error.error && error.error.message) {
            errorMessage = Array.isArray(error.error.message)
              ? error.error.message.join(', ')
              : error.error.message;
          }
          return throwError(() => new Error(errorMessage));
        })
      );
  }

  verifyTotp(email: string, code: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.API_URL}/verify-totp`, { email, code })
      .pipe(
        tap((response) => {
          if (response.success && response.user && response.session) {
            this.setSession(response.user, response.session);
          }
        }),
        catchError((error: HttpErrorResponse) => {
          let errorMessage = 'Invalid Authenticator code.';
          if (error.error && error.error.message) {
            errorMessage = Array.isArray(error.error.message)
              ? error.error.message.join(', ')
              : error.error.message;
          }
          return throwError(() => new Error(errorMessage));
        })
      );
  }

  resendOtp(email: string, type: 'signup' | 'email_change' | 'sms' = 'signup'): Observable<{ success: boolean; message: string }> {
    return this.http
      .post<{ success: boolean; message: string }>(`${this.API_URL}/resend-otp`, { email, type })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          return throwError(() => new Error(error.error?.message || 'Failed to resend verification code.'));
        })
      );
  }

  enrollTotp(email: string): Observable<{ success: boolean; secret: string; qrImageUrl: string; message: string }> {
    return this.http
      .post<{ success: boolean; secret: string; qrImageUrl: string; message: string }>(`${this.API_URL}/enroll-totp`, { email })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          return throwError(() => new Error(error.error?.message || 'Failed to generate Authenticator QR code.'));
        })
      );
  }

  confirmEnrollTotp(email: string, code: string): Observable<{ success: boolean; message: string }> {
    return this.http
      .post<{ success: boolean; message: string }>(`${this.API_URL}/confirm-totp`, { email, code })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          return throwError(() => new Error(error.error?.message || 'Failed to verify Authenticator code.'));
        })
      );
  }

  setSession(user: UserProfile, session: AuthSession): void {
    this.currentUser.set(user);
    this.token.set(session.access_token);

    if (this.isBrowser) {
      localStorage.setItem('vanguard_user', JSON.stringify(user));
      localStorage.setItem('vanguard_token', session.access_token);
    }
  }

  forgotPassword(email: string): Observable<{ success: boolean; message: string; email?: string }> {
    return this.http
      .post<{ success: boolean; message: string; email?: string }>(`${this.API_URL}/forgot-password`, { email })
      .pipe(
        tap((res) => {
          if (res.success) {
            this.pendingEmail.set(email);
            this.pendingMode.set('recovery');
          }
        }),
        catchError((error: HttpErrorResponse) => {
          let errorMessage = 'Failed to process password reset. Please try again.';
          if (error.error && error.error.message) {
            errorMessage = Array.isArray(error.error.message)
              ? error.error.message.join(', ')
              : error.error.message;
          } else if (error.status === 0) {
            errorMessage = 'Unable to connect to the backend server.';
          }
          return throwError(() => new Error(errorMessage));
        })
      );
  }

  resetPassword(password: string, accessToken?: string): Observable<{ success: boolean; message: string }> {
    const token = accessToken || this.token() || '';
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return this.http
      .post<{ success: boolean; message: string }>(
        `${this.API_URL}/reset-password`,
        { password, accessToken: token },
        { headers }
      )
      .pipe(
        tap(() => {
          this.isPasswordResetRequired.set(false);
          if (this.isBrowser) {
            localStorage.removeItem('vanguard_reset_required');
            localStorage.removeItem('vanguard_user');
            localStorage.removeItem('vanguard_token');
          }
          this.currentUser.set(null);
          this.token.set(null);
        }),
        catchError((error: HttpErrorResponse) => {
          let errorMessage = 'Failed to reset password. Please try again.';
          if (error.error && error.error.message) {
            errorMessage = Array.isArray(error.error.message)
              ? error.error.message.join(', ')
              : error.error.message;
          } else if (error.status === 0) {
            errorMessage = 'Unable to connect to the backend server.';
          }
          return throwError(() => new Error(errorMessage));
        })
      );
  }

  getGoogleOAuthUrl(): Observable<{ success: boolean; url: string }> {
    return this.http.get<{ success: boolean; url: string }>(`${this.API_URL}/google`).pipe(
      catchError((error: HttpErrorResponse) => {
        let errorMessage = 'Google Authentication is currently unavailable.';
        if (error.error && error.error.message) {
          errorMessage = Array.isArray(error.error.message)
            ? error.error.message.join(', ')
            : error.error.message;
        }
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  logout(): void {
    if (this.isBrowser) {
      this.http.post(`${this.API_URL}/logout`, {}).subscribe({
        error: () => {},
      });
      localStorage.removeItem('vanguard_user');
      localStorage.removeItem('vanguard_token');
    }
    this.currentUser.set(null);
    this.token.set(null);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!this.currentUser();
  }
}
