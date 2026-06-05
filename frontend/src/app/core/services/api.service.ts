import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  public get auth(): {
    SIGNUP: string;
    LOGIN: string;
    OTP_REQUEST: string;
    OTP_VERIFY: string;
    FORGOT_PASSWORD_REQUEST: string;
    FORGOT_PASSWORD_VERIFY: string;
    FORGOT_PASSWORD_RESET: string;
    REFRESH: string;
    LOGOUT: string;
    ADMIN_USERS: string;
    VALIDATE: string;
  } {
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

  public get adminMemory(): {
    ALL: string;
    DELETE: (id: string) => string;
    UPLOAD: string;
    CREATE: string;
    UPDATE: (id: string) => string;
  } {
    return {
      ALL: '/api/admin/memory/all',
      DELETE: (id: string) => `/api/admin/memory/${id}`,
      UPLOAD: '/api/admin/memory/upload',
      CREATE: '/api/admin/memory',
      UPDATE: (id: string) => `/api/admin/memory/${id}`
    } as const;
  }

  public get userMemory(): {
    HISTORY: string;
    REFLECT: string;
    ANALYTICS: string;
    ALL: string;
  } {
    return {
      HISTORY: '/api/memory/history',
      REFLECT: '/api/memory/reflect',
      ANALYTICS: '/api/memory/analytics',
      ALL: '/api/memory/all'
    } as const;
  }
}
