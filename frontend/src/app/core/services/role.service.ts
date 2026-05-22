import { Injectable, inject, computed } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class RoleService {
  private authSvc = inject(AuthService);

  /**
   * Computed active user roles.
   * Re-evaluates automatically whenever AuthService authentication status or userId changes.
   */
  public readonly userRoles = computed<string[]>(() => {
    if (!this.authSvc.isAuthenticated()) {
      return [];
    }

    const token = this.authSvc.getAccessToken();
    if (!token) return [];

    return this.extractRolesFromToken(token);
  });

  /**
   * Check if the active user possesses a specific role.
   */
  public hasRole(role: string): boolean {
    return this.userRoles().includes(role.toUpperCase());
  }

  /**
   * Check if the active user possesses any of the specified roles.
   */
  public hasAnyRole(roles: string | string[]): boolean {
    const rolesToCheck = Array.isArray(roles) ? roles : [roles];
    if (rolesToCheck.length === 0) return true;

    const userRolesUpper = this.userRoles().map((r) => r.toUpperCase());
    return rolesToCheck.some((r) => userRolesUpper.includes(r.toUpperCase()));
  }

  /**
   * Extract roles list from standard token payloads or simulate roles for mock local environments.
   */
  private extractRolesFromToken(token: string): string[] {
    // Check if it is a mock token structure
    if (token.startsWith('mock_jwt_access_token')) {
      const username = this.authSvc.getUserId() || '';
      // If the email/username starts with 'admin', treat as ADMIN
      if (username.toLowerCase().startsWith('admin')) {
        return ['ADMIN'];
      }
      return ['USER'];
    }

    // Standard JWT decoding logic for production environment
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        
        // Support common standard JWT claims for user authorities/roles
        const roles = payload.roles || payload.role || payload.authorities || [];
        if (Array.isArray(roles)) {
          return roles.map((r) => String(r).toUpperCase());
        } else if (typeof roles === 'string') {
          return [roles.toUpperCase()];
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[RoleService] Error extracting roles from JWT token:', e);
    }

    // Default basic role
    return ['USER'];
  }
}
