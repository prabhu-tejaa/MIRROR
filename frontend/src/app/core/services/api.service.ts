import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  public get AUTH() {
    return {
      SIGNUP: '/api/auth/signup',
      LOGIN: '/api/auth/login',
      OTP_REQUEST: '/api/auth/otp/request',
      OTP_VERIFY: '/api/auth/otp/verify',
      FORGOT_PASSWORD_REQUEST: '/api/auth/forgot-password/request',
      FORGOT_PASSWORD_VERIFY: '/api/auth/forgot-password/verify',
      FORGOT_PASSWORD_RESET: '/api/auth/forgot-password/reset',
      REFRESH: '/api/auth/refresh',
      LOGOUT: '/api/auth/logout',
      ADMIN_USERS: '/api/auth/admin/users',
      VALIDATE: '/api/auth/validate'
    } as const;
  }

  public get ADMIN_MEMORY() {
    return {
      ALL: '/api/admin/memory/all',
      DELETE: (id: string) => `/api/admin/memory/${id}`,
      UPLOAD: '/api/admin/memory/upload',
      CREATE: '/api/admin/memory',
      UPDATE: (id: string) => `/api/admin/memory/${id}`
    } as const;
  }

  public get ADMIN_GATEWAY() {
    return {
      HEALTH: '/api/gateway/admin/health',
      ROUTES: '/api/gateway/admin/routes',
      ROUTES_TOGGLE: '/api/gateway/admin/routes/toggle',
      BLOCKED_IPS: '/api/gateway/admin/blocked-ips',
      UNBLOCK_IP: (ip: string) => `/api/gateway/admin/blocked-ips/${ip}`,
      RATE_LIMIT: '/api/gateway/admin/rate-limit',
      LOGS: '/api/gateway/admin/logs',
      STATS: '/api/gateway/admin/stats',
      PUBLIC_HEALTH: '/api/gateway/public/health'
    } as const;
  }

  public get USER_MEMORY() {
    return {
      HISTORY: '/api/memory/history',
      REFLECT: '/api/memory/reflect',
      ANALYTICS: '/api/memory/analytics',
      ALL: '/api/memory/all'
    } as const;
  }
}
