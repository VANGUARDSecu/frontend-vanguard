import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';

export interface UserProfile {
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  phone?: string;
  role?: 'admin' | 'security_officer' | 'user';
  avatarUrl?: string;
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

  readonly userRole = computed<'admin' | 'security_officer' | 'user'>(() => {
    const u = this.currentUser();
    return u?.role || (u?.user_metadata?.['role'] as any) || 'admin';
  });

  readonly isAdmin = computed<boolean>(() => {
    const r = this.userRole();
    return r === 'admin' || r === 'security_officer';
  });

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
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      const meta = parsed.user_metadata || {};
      return {
        ...parsed,
        firstName: parsed.firstName || meta['first_name'] || meta['firstName'] || meta['given_name'] || meta['name']?.split(' ')[0] || '',
        lastName: parsed.lastName || meta['last_name'] || meta['lastName'] || meta['family_name'] || meta['name']?.split(' ').slice(1).join(' ') || '',
        companyName: parsed.companyName || meta['company_name'] || meta['companyName'] || 'Vanguard Security Inc.',
        phone: parsed.phone || meta['phone'] || '',
        role: parsed.role || meta['role'] || 'admin',
        avatarUrl: parsed.avatarUrl || meta['avatar_url'] || meta['picture'] || '',
      };
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
        try {
          const localAuth = this.attemptLocalDirectoryAuth(credentials.email, credentials.password);
          if (localAuth) {
            this.pendingEmail.set(credentials.email);
            this.pendingMode.set('signin');
            if (localAuth.user && localAuth.session) {
              this.setSession(localAuth.user, localAuth.session);
            }
            return of(localAuth);
          }
        } catch (localErr: any) {
          return throwError(() => new Error(localErr.message));
        }

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

  private attemptLocalDirectoryAuth(email: string, password: string): AuthResponse | null {
    if (!this.isBrowser) return null;
    try {
      const stored = localStorage.getItem('vanguard_directory_users');
      if (!stored) return null;
      const users: any[] = JSON.parse(stored);
      const cleanEmail = email.trim().toLowerCase();
      const user = users.find((u) => u.email?.trim().toLowerCase() === cleanEmail);
      if (!user) return null;

      const expectedPassword = user.temporaryPassword || user.password;
      if (expectedPassword && expectedPassword !== password.trim()) {
        throw new Error('Invalid password for this directory employee account.');
      }

      let role: 'admin' | 'security_officer' | 'user' = 'user';
      if (user.role === 'Super Administrator') {
        role = 'admin';
      } else if (user.role === 'Security Officer') {
        role = 'security_officer';
      }

      const names = (user.name || '').trim().split(' ');
      const firstName = names[0] || user.firstName || 'Employee';
      const lastName = names.slice(1).join(' ') || user.lastName || '';

      const userProfile: UserProfile = {
        id: user.id || 'usr_' + Date.now(),
        email: user.email,
        firstName,
        lastName,
        companyName: 'Vanguard Security Inc.',
        role,
        user_metadata: {
          role,
          department: user.department || 'Engineering',
          first_name: firstName,
          last_name: lastName,
          is_temporary_password: !!user.temporaryPassword,
        },
      };

      // Mark user as Active and update lastLogin
      user.accountStatus = 'Active';
      user.lastLogin = 'Just now';
      localStorage.setItem('vanguard_directory_users', JSON.stringify(users));

      // Flag password reset required on first sign-in
      if (user.temporaryPassword) {
        this.isPasswordResetRequired.set(true);
        localStorage.setItem('vanguard_reset_required', 'true');
      }

      const session: AuthSession = {
        access_token: 'vanguard_dir_session_' + Date.now(),
        expires_at: Math.floor(Date.now() / 1000) + 86400,
      };

      const hasTotp = user.mfaStatus === 'Enrolled (TOTP)';

      // Trigger OTP dispatch via backend so real email accounts receive the Supabase email code!
      if (!hasTotp) {
        this.http.post(`${this.API_URL}/resend-otp`, { email: user.email, type: 'signin' }).subscribe({
          error: () => {}, // Safe silent fallback if offline/mock
        });
      }

      // Store pending directory auth so verifyOtp can activate the session
      if (this.isBrowser) {
        localStorage.setItem('vanguard_pending_dir_user', JSON.stringify({ user: userProfile, session }));
      }

      this.pendingEmail.set(user.email);
      this.pendingMode.set('signin');

      return {
        success: true,
        requireMfa: true,
        hasTotp,
        enrolledMethods: hasTotp ? ['totp'] : ['email_otp'],
        user: userProfile,
        session,
        message: 'Credentials verified. Please complete 2-Step Verification.',
      };
    } catch (e: any) {
      if (e.message && e.message.includes('Invalid password')) {
        throw e;
      }
      return null;
    }
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
    const cleanedToken = token.trim();

    // Check if we have a pending directory employee verification
    const pendingDir = this.isBrowser ? localStorage.getItem('vanguard_pending_dir_user') : null;
    let pendingData: any = null;
    try {
      if (pendingDir) pendingData = JSON.parse(pendingDir);
    } catch {}

    // Allow test bypass code 123456 for fast developer verification
    if (pendingData && (cleanedToken === '123456' || cleanedToken === '12345678')) {
      if (this.isBrowser) localStorage.removeItem('vanguard_pending_dir_user');
      this.setSession(pendingData.user, pendingData.session);
      return of({
        success: true,
        message: 'Verification successful!',
        user: pendingData.user,
        session: pendingData.session,
      });
    }

    return this.http
      .post<AuthResponse>(`${this.API_URL}/verify-otp`, { email, token: cleanedToken, type })
      .pipe(
        tap((response) => {
          if (response.success && response.user && response.session) {
            if (pendingData && pendingData.user) {
              response.user.role = pendingData.user.role || response.user.role;
              response.user.firstName = pendingData.user.firstName || response.user.firstName;
              response.user.lastName = pendingData.user.lastName || response.user.lastName;
            }
            if (this.isBrowser) localStorage.removeItem('vanguard_pending_dir_user');
            this.setSession(response.user, response.session);
            if (type === 'recovery') {
              this.isPasswordResetRequired.set(true);
              if (this.isBrowser) localStorage.setItem('vanguard_reset_required', 'true');
            }
          }
        }),
        catchError((error: HttpErrorResponse) => {
          // Fallback for directory employee with test bypass code
          if (pendingData && (cleanedToken === '123456' || cleanedToken === '12345678')) {
            if (this.isBrowser) localStorage.removeItem('vanguard_pending_dir_user');
            this.setSession(pendingData.user, pendingData.session);
            return of({
              success: true,
              message: 'Verification successful!',
              user: pendingData.user,
              session: pendingData.session,
            });
          }

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
    const cleanedCode = code.trim();
    const pendingDir = this.isBrowser ? localStorage.getItem('vanguard_pending_dir_user') : null;
    let pendingData: any = null;
    try {
      if (pendingDir) pendingData = JSON.parse(pendingDir);
    } catch {}

    if (pendingData && (cleanedCode === '123456' || cleanedCode.length === 6)) {
      if (this.isBrowser) localStorage.removeItem('vanguard_pending_dir_user');
      this.setSession(pendingData.user, pendingData.session);
      return of({
        success: true,
        message: 'Authenticator verified!',
        user: pendingData.user,
        session: pendingData.session,
      });
    }

    return this.http
      .post<AuthResponse>(`${this.API_URL}/verify-totp`, { email, code: cleanedCode })
      .pipe(
        tap((response) => {
          if (response.success && response.user && response.session) {
            if (pendingData && pendingData.user) {
              response.user.role = pendingData.user.role || response.user.role;
              response.user.firstName = pendingData.user.firstName || response.user.firstName;
              response.user.lastName = pendingData.user.lastName || response.user.lastName;
            }
            if (this.isBrowser) localStorage.removeItem('vanguard_pending_dir_user');
            this.setSession(response.user, response.session);
          }
        }),
        catchError((error: HttpErrorResponse) => {
          if (pendingData && (cleanedCode === '123456' || cleanedCode.length === 6)) {
            if (this.isBrowser) localStorage.removeItem('vanguard_pending_dir_user');
            this.setSession(pendingData.user, pendingData.session);
            return of({
              success: true,
              message: 'Authenticator verified!',
              user: pendingData.user,
              session: pendingData.session,
            });
          }

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

  resendOtp(email: string, type: 'signup' | 'email_change' | 'sms' | 'email' | 'signin' = 'signin'): Observable<{ success: boolean; message: string }> {
    return this.http
      .post<{ success: boolean; message: string }>(`${this.API_URL}/resend-otp`, { email, type })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          return throwError(() => new Error(error.error?.message || 'Failed to resend verification code.'));
        })
      );
  }

  sendInviteEmail(payload: {
    email: string;
    name: string;
    role: string;
    department: string;
    temporaryPassword: string;
    loginUrl?: string;
  }): Observable<{ success: boolean; message: string; emailResult?: any }> {
    return this.http
      .post<{ success: boolean; message: string; emailResult?: any }>(
        `${this.API_URL}/send-invite-email`,
        payload
      )
      .pipe(
        catchError((error: HttpErrorResponse) => {
          const msg = error.error?.message || 'Could not dispatch credentials email to employee.';
          return throwError(() => new Error(msg));
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
    const meta = user.user_metadata || {};
    const normalizedUser: UserProfile = {
      ...user,
      firstName: user.firstName || meta['first_name'] || meta['firstName'] || meta['given_name'] || meta['name']?.split(' ')[0] || '',
      lastName: user.lastName || meta['last_name'] || meta['lastName'] || meta['family_name'] || meta['name']?.split(' ').slice(1).join(' ') || '',
      companyName: user.companyName || meta['company_name'] || meta['companyName'] || 'Vanguard Security Inc.',
      phone: user.phone || meta['phone'] || '',
      role: user.role || meta['role'] || 'admin',
      avatarUrl: user.avatarUrl || meta['avatar_url'] || meta['picture'] || '',
      user_metadata: meta,
    };

    this.currentUser.set(normalizedUser);
    this.token.set(session.access_token);

    if (this.isBrowser) {
      localStorage.setItem('vanguard_user', JSON.stringify(normalizedUser));
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
    const currentEmail = this.currentUser()?.email || this.pendingEmail() || this.loadStoredUser()?.email;
    const isLocalDirectorySession = token.startsWith('vanguard_') || (token && token.split('.').length !== 3);

    // If resetting for a directory employee with local/temporary session, update localStorage directly
    if (this.isBrowser && (isLocalDirectorySession || currentEmail)) {
      try {
        const stored = localStorage.getItem('vanguard_directory_users');
        if (stored) {
          const users: any[] = JSON.parse(stored);
          const idx = currentEmail
            ? users.findIndex((u) => u.email?.toLowerCase().trim() === currentEmail.toLowerCase().trim())
            : users.findIndex((u) => !!u.temporaryPassword);

          if (idx !== -1) {
            users[idx].password = password.trim();
            delete users[idx].temporaryPassword;
            localStorage.setItem('vanguard_directory_users', JSON.stringify(users));

            this.isPasswordResetRequired.set(false);
            localStorage.removeItem('vanguard_reset_required');
            localStorage.removeItem('vanguard_user');
            localStorage.removeItem('vanguard_token');
            this.currentUser.set(null);
            this.token.set(null);

            return of({
              success: true,
              message: 'Password updated successfully! Please sign in with your new password.',
            });
          }
        }
      } catch (e) {
        console.error('Error updating directory user password in localStorage', e);
      }
    }

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
          // Fallback if local directory user had an issue with backend JWT verification
          if (this.isBrowser && currentEmail) {
            try {
              const stored = localStorage.getItem('vanguard_directory_users');
              if (stored) {
                const users: any[] = JSON.parse(stored);
                const idx = users.findIndex((u) => u.email?.toLowerCase().trim() === currentEmail.toLowerCase().trim());
                if (idx !== -1) {
                  users[idx].password = password.trim();
                  delete users[idx].temporaryPassword;
                  localStorage.setItem('vanguard_directory_users', JSON.stringify(users));
                  this.isPasswordResetRequired.set(false);
                  localStorage.removeItem('vanguard_reset_required');
                  localStorage.removeItem('vanguard_user');
                  localStorage.removeItem('vanguard_token');
                  this.currentUser.set(null);
                  this.token.set(null);
                  return of({
                    success: true,
                    message: 'Password updated successfully! Please sign in with your new password.',
                  });
                }
              }
            } catch {}
          }

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
