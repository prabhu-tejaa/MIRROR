import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { RoleService } from '../services/role.service';

export const adminGuard: CanActivateFn = () => {
  const roleSvc = inject(RoleService);
  const router = inject(Router);

  const hasAdmin = roleSvc.hasRole('ADMIN');
  console.log('[AdminGuard] Checking admin role. Has admin:', hasAdmin, 'Roles:', roleSvc.userRoles());

  if (hasAdmin) {
    return true;
  }

  console.warn('[AdminGuard] Access denied. Redirecting to profile.');
  return router.createUrlTree(['/tabs/profile']);
};
