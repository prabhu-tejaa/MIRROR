import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const isAuth = auth.isAuthenticated();
  console.log('[AuthGuard] Checking authentication. Is authenticated:', isAuth);

  if (isAuth) {
    return true;
  }

  console.warn('[AuthGuard] Access denied. Redirecting to login.');
  return router.createUrlTree(['/login']);
};
