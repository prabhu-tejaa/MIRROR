import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { TranslationService } from '../services/translation.service';

export const mockInterceptor: HttpInterceptorFn = (req, next) => {
  const translationSvc = inject(TranslationService);

  // If mock mode is disabled, forward to the next interceptor
  if (!environment.mock) {
    return next(req);
  }

  const url = req.url;

  const signupPath = translationSvc.translate('API.SIGNUP');
  const loginPath = translationSvc.translate('API.LOGIN');
  const otpRequestPath = translationSvc.translate('API.OTP_REQUEST');
  const otpVerifyPath = translationSvc.translate('API.OTP_VERIFY');
  const forgotPasswordRequestPath = translationSvc.translate('API.FORGOT_PASSWORD_REQUEST');
  const forgotPasswordVerifyPath = translationSvc.translate('API.FORGOT_PASSWORD_VERIFY');
  const forgotPasswordResetPath = translationSvc.translate('API.FORGOT_PASSWORD_RESET');
  const refreshPath = translationSvc.translate('API.REFRESH');
  const logoutPath = translationSvc.translate('API.LOGOUT');

  const defaultUsername = translationSvc.translate('MOCK_RESPONSES.DEFAULT_USERNAME');
  const mockAccessToken = translationSvc.translate('MOCK_RESPONSES.ACCESS_TOKEN');
  const mockRefreshToken = translationSvc.translate('MOCK_RESPONSES.REFRESH_TOKEN');
  const mockRefreshedAccessToken = translationSvc.translate('MOCK_RESPONSES.REFRESHED_ACCESS_TOKEN');

  if (url.includes(loginPath)) {
    const body = req.body as { email?: string; code?: string } | null;
    
    // Test Trigger: error@mirror.com will simulate an invalid credentials error
    if (body && body.email === 'error@mirror.com') {
      return throwError(() => new HttpErrorResponse({
        status: 401,
        statusText: 'Unauthorized',
        error: 'Invalid email or password. Please try again.'
      })).pipe(delay(800));
    }

    const mockResponse = {
      accessToken: mockAccessToken,
      refreshToken: mockRefreshToken,
      username: body && body.email ? body.email.split('@')[0] : defaultUsername
    };
    return of(new HttpResponse({ status: 200, body: mockResponse })).pipe(delay(500));
  }

  if (url.includes(signupPath)) {
    const body = req.body as { email?: string; code?: string } | null;

    // Test Trigger: error@mirror.com will simulate an email already taken error
    if (body && body.email === 'error@mirror.com') {
      return throwError(() => new HttpErrorResponse({
        status: 400,
        statusText: 'Bad Request',
        error: 'An account with this email address already exists.'
      })).pipe(delay(800));
    }

    const message = translationSvc.translate('MOCK_RESPONSES.SIGNUP_SUCCESS');
    return of(new HttpResponse({ status: 200, body: message })).pipe(delay(500));
  }

  if (url.includes(otpRequestPath)) {
    const message = translationSvc.translate('MOCK_RESPONSES.OTP_REQUEST_SUCCESS');
    return of(new HttpResponse({ status: 200, body: message })).pipe(delay(500));
  }

  if (url.includes(otpVerifyPath)) {
    const body = req.body as { email?: string; code?: string } | null;

    // Test Trigger: Entering '000000' as the OTP code will simulate an invalid OTP error
    if (body && body.code === '000000') {
      return throwError(() => new HttpErrorResponse({
        status: 400,
        statusText: 'Bad Request',
        error: 'Incorrect verification code. Please request a new one.'
      })).pipe(delay(800));
    }

    const mockResponse = {
      accessToken: mockAccessToken,
      refreshToken: mockRefreshToken,
      username: defaultUsername
    };
    return of(new HttpResponse({ status: 200, body: mockResponse })).pipe(delay(500));
  }

  if (url.includes(forgotPasswordRequestPath)) {
    const body = req.body as { email?: string; code?: string } | null;

    // Test Trigger: error@mirror.com will simulate a "user not found" error
    if (body && body.email === 'error@mirror.com') {
      return throwError(() => new HttpErrorResponse({
        status: 404,
        statusText: 'Not Found',
        error: 'No account registered with this email address.'
      })).pipe(delay(800));
    }

    const message = translationSvc.translate('MOCK_RESPONSES.OTP_REQUEST_SUCCESS');
    return of(new HttpResponse({ status: 200, body: message })).pipe(delay(500));
  }

  if (url.includes(forgotPasswordVerifyPath)) {
    const body = req.body as { email?: string; code?: string } | null;

    // Test Trigger: Entering '000000' will simulate a failed OTP verification error
    if (body && body.code === '000000') {
      return throwError(() => new HttpErrorResponse({
        status: 400,
        statusText: 'Bad Request',
        error: 'Incorrect OTP code. Verification failed.'
      })).pipe(delay(800));
    }

    const message = translationSvc.translate('MOCK_RESPONSES.OTP_VERIFY_SUCCESS');
    return of(new HttpResponse({ status: 200, body: message })).pipe(delay(500));
  }

  if (url.includes(forgotPasswordResetPath)) {
    const message = translationSvc.translate('MOCK_RESPONSES.PASSWORD_RESET_SUCCESS');
    return of(new HttpResponse({ status: 200, body: message })).pipe(delay(500));
  }

  if (url.includes(refreshPath)) {
    const mockResponse = {
      accessToken: mockRefreshedAccessToken,
      refreshToken: mockRefreshToken,
      username: defaultUsername
    };
    return of(new HttpResponse({ status: 200, body: mockResponse })).pipe(delay(500));
  }

  if (url.includes(logoutPath)) {
    const message = translationSvc.translate('MOCK_RESPONSES.LOGOUT_SUCCESS');
    return of(new HttpResponse({ status: 200, body: message })).pipe(delay(300));
  }

  return next(req);
};
