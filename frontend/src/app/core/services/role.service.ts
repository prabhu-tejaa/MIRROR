import { Injectable, inject, Signal } from '@angular/core';
import { Store } from '@ngrx/store';

import { selectUserRoles } from '../../domains/auth/data-access/store/auth.selectors';

@Injectable({ providedIn: 'root' })
export class RoleService {
  private store: Store = inject(Store);

  public readonly userRoles: Signal<string[]> = this.store.selectSignal(selectUserRoles);

  public hasRole(role: string): boolean {
    return this.userRoles().includes(role.toUpperCase());
  }

  public hasAnyRole(roles: string | string[]): boolean {
    const rolesToCheck: string[] = Array.isArray(roles) ? roles : [roles];
    if (rolesToCheck.length === 0) {return true;}

    const userRolesUpper: string[] = this.userRoles().map((r: string) => r.toUpperCase());
    return rolesToCheck.some((r: string) => userRolesUpper.includes(r.toUpperCase()));
  }
}
