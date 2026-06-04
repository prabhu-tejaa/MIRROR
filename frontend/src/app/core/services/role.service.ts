import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectUserRoles } from '../../domains/auth/data-access/store/auth.selectors';

@Injectable({ providedIn: 'root' })
export class RoleService {
  private store = inject(Store);

  public readonly userRoles = this.store.selectSignal(selectUserRoles);

  public hasRole(role: string): boolean {
    return this.userRoles().includes(role.toUpperCase());
  }

  public hasAnyRole(roles: string | string[]): boolean {
    const rolesToCheck = Array.isArray(roles) ? roles : [roles];
    if (rolesToCheck.length === 0) return true;

    const userRolesUpper = this.userRoles().map((r) => r.toUpperCase());
    return rolesToCheck.some((r) => userRolesUpper.includes(r.toUpperCase()));
  }
}
