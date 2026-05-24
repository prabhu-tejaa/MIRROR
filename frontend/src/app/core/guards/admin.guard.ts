import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { RoleService } from '../services/role.service';

export const adminGuard: CanActivateFn = () => {
  const roleSvc = inject(RoleService);
  const router = inject(Router);

  if (roleSvc.hasRole('ADMIN')) {
    return true;
  }

  return router.createUrlTree(['/tabs/profile']);
};
