import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // If user is undergoing required password reset, block dashboard access and enforce reset-password
  if (authService.isPasswordResetRequired()) {
    router.navigate(['/reset-password']);
    return false;
  }

  if (authService.isLoggedIn()) {
    return true;
  }

  // Not authenticated, redirect to login
  router.navigate(['/login']);
  return false;
};
