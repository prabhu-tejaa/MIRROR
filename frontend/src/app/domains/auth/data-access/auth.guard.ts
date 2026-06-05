import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth: AuthService = inject(AuthService);
  const router: Router = inject(Router);

  const isAuth: boolean = auth.isAuthenticated();

  if (isAuth) {
    return true;
  }


  return router.createUrlTree(['/login']);
};
