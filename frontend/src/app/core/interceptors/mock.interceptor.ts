import { HttpInterceptorFn, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export const mockInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.mock) {
    return next(req);
  }

  const url = req.url;

  const signupPath = '/api/auth/signup';
  const loginPath = '/api/auth/login';
  const otpRequestPath = '/api/auth/otp/request';
  const otpVerifyPath = '/api/auth/otp/verify';
  const forgotPasswordRequestPath = '/api/auth/forgot-password/request';
  const forgotPasswordVerifyPath = '/api/auth/forgot-password/verify';
  const forgotPasswordResetPath = '/api/auth/forgot-password/reset';
  const refreshPath = '/api/auth/refresh';
  const logoutPath = '/api/auth/logout';

  const defaultUsername = 'mockuser';
  const mockAccessToken = 'mock_jwt_access_token_xyz';
  const mockRefreshToken = 'mock_refresh_token_abc';
  const mockRefreshedAccessToken = 'mock_jwt_access_token_xyz_refreshed';

  const triggerErrorEmail = 'error@mirror.com';
  const triggerErrorOtp = '000000';
  const defaultEmail = 'gdag@hdjs.com';
  const emailSeparator = '@';
  const statusUnauthorized = 'Unauthorized';
  const statusBadRequest = 'Bad Request';
  const statusNotFound = 'Not Found';
  const errorInvalidCredentials = 'Invalid email or password. Please try again.';
  const errorEmailExists = 'An account with this email address already exists.';
  const errorIncorrectOtp = 'Incorrect verification code. Please request a new one.';
  const errorEmailNotFound = 'No account registered with this email address.';
  const errorOtpVerificationFailed = 'Incorrect OTP code. Verification failed.';

  if (url.includes(loginPath)) {
    const body = req.body as { email?: string; code?: string } | null;
    
    if (body && body.email === triggerErrorEmail) {
      return throwError(() => new HttpErrorResponse({
        status: 401,
        statusText: statusUnauthorized,
        error: errorInvalidCredentials
      })).pipe(delay(800));
    }

    const mockResponse = {
      accessToken: mockAccessToken,
      refreshToken: mockRefreshToken,
      username: body && body.email ? body.email.split(emailSeparator)[0] : defaultUsername,
      email: body && body.email ? body.email : defaultEmail
    };
    return of(new HttpResponse({ status: 200, body: mockResponse })).pipe(delay(500));
  }

  if (url.includes(signupPath)) {
    const body = req.body as { email?: string; code?: string } | null;

    if (body && body.email === triggerErrorEmail) {
      return throwError(() => new HttpErrorResponse({
        status: 400,
        statusText: statusBadRequest,
        error: errorEmailExists
      })).pipe(delay(800));
    }

    const message = 'User registered successfully with ID: mock-123';
    return of(new HttpResponse({ status: 200, body: message })).pipe(delay(500));
  }

  if (url.includes(otpRequestPath)) {
    const message = 'OTP sent to your email.';
    return of(new HttpResponse({ status: 200, body: message })).pipe(delay(500));
  }

  if (url.includes(otpVerifyPath)) {
    const body = req.body as { email?: string; code?: string } | null;

    if (body && body.code === triggerErrorOtp) {
      return throwError(() => new HttpErrorResponse({
        status: 400,
        statusText: statusBadRequest,
        error: errorIncorrectOtp
      })).pipe(delay(800));
    }

    const mockResponse = {
      accessToken: mockAccessToken,
      refreshToken: mockRefreshToken,
      username: defaultUsername,
      email: body && body.email ? body.email : defaultEmail
    };
    return of(new HttpResponse({ status: 200, body: mockResponse })).pipe(delay(500));
  }

  if (url.includes(forgotPasswordRequestPath)) {
    const body = req.body as { email?: string; code?: string } | null;

    if (body && body.email === triggerErrorEmail) {
      return throwError(() => new HttpErrorResponse({
        status: 404,
        statusText: statusNotFound,
        error: errorEmailNotFound
      })).pipe(delay(800));
    }

    const message = 'OTP sent to your email.';
    return of(new HttpResponse({ status: 200, body: message })).pipe(delay(500));
  }

  if (url.includes(forgotPasswordVerifyPath)) {
    const body = req.body as { email?: string; code?: string } | null;

    if (body && body.code === triggerErrorOtp) {
      return throwError(() => new HttpErrorResponse({
        status: 400,
        statusText: statusBadRequest,
        error: errorOtpVerificationFailed
      })).pipe(delay(800));
    }

    const message = 'OTP verified successfully. You may now reset your password.';
    return of(new HttpResponse({ status: 200, body: message })).pipe(delay(500));
  }

  if (url.includes(forgotPasswordResetPath)) {
    const message = 'Password reset successfully. Please proceed to login.';
    return of(new HttpResponse({ status: 200, body: message })).pipe(delay(500));
  }

  if (url.includes(refreshPath)) {
    const mockResponse = {
      accessToken: mockRefreshedAccessToken,
      refreshToken: mockRefreshToken,
      username: defaultUsername,
      email: defaultEmail
    };
    return of(new HttpResponse({ status: 200, body: mockResponse })).pipe(delay(500));
  }

  if (url.includes(logoutPath)) {
    const message = 'Logged out successfully.';
    return of(new HttpResponse({ status: 200, body: message })).pipe(delay(300));
  }

  return next(req);
};
