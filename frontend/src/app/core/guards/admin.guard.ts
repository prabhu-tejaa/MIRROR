import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { RoleService } from '../services/role.service';

export const adminGuard: CanActivateFn = () => {
  const roleSvc: RoleService = inject(RoleService);
  const router: Router = inject(Router);

  const hasAdmin: boolean = roleSvc.hasRole('ADMIN');

  if (hasAdmin) {
    return true;
  }

  return router.createUrlTree(['/tabs/profile']);
};
