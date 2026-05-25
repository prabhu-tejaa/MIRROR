import { Injectable, inject, computed } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class RoleService {
  private authSvc = inject(AuthService);

  public readonly userRoles = computed<string[]>(() => {
    if (!this.authSvc.isAuthenticated()) {
      return [];
    }

    const token = this.authSvc.getAccessToken();
    if (!token) return [];

    return this.extractRolesFromToken(token);
  });

  public hasRole(role: string): boolean {
    return this.userRoles().includes(role.toUpperCase());
  }

  public hasAnyRole(roles: string | string[]): boolean {
    const rolesToCheck = Array.isArray(roles) ? roles : [roles];
    if (rolesToCheck.length === 0) return true;

    const userRolesUpper = this.userRoles().map((r) => r.toUpperCase());
    return rolesToCheck.some((r) => userRolesUpper.includes(r.toUpperCase()));
  }

  private extractRolesFromToken(token: string): string[] {
    if (token.startsWith('mock_jwt_access_token')) {
      const username = this.authSvc.getUserId() || '';
      if (username.toLowerCase().startsWith('admin')) {
        return ['ADMIN'];
      }
      return ['USER'];
    }

    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

        const roles = payload.roles || payload.role || payload.authorities || [];
        const normalizeRole = (r: unknown): string => {
          const str = String(r).toUpperCase();
          return str.startsWith('ROLE_') ? str.substring(5) : str;
        };

        if (Array.isArray(roles)) {
          return roles.map(normalizeRole);
        } else if (typeof roles === 'string') {
          return [normalizeRole(roles)];
        }
      }
    } catch {
    }

    return ['USER'];
  }
}
