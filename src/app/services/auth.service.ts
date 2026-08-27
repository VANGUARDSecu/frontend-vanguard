import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, map, tap, throwError } from 'rxjs';

export interface UserProfile {
  id: string;
  email: string;
  user_metadata?: Record<string, any>;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user: UserProfile;
  session: AuthSession;
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

  login(credentials: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/login`, credentials).pipe(
      tap((response) => {
        if (response.success && response.user && response.session) {
          this.currentUser.set(response.user);
          this.token.set(response.session.access_token);

          if (this.isBrowser) {
            localStorage.setItem('vanguard_user', JSON.stringify(response.user));
            localStorage.setItem('vanguard_token', response.session.access_token);
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

  logout(): void {
    if (this.isBrowser) {
      // Optional call to backend logout endpoint
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
