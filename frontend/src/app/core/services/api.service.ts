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
}
