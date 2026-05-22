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

  const triggerErrorEmail = translationSvc.translate('MOCK_RESPONSES.TRIGGER_ERROR_EMAIL');
  const triggerErrorOtp = translationSvc.translate('MOCK_RESPONSES.TRIGGER_ERROR_OTP');
  const defaultEmail = translationSvc.translate('MOCK_RESPONSES.DEFAULT_EMAIL');
  const emailSeparator = translationSvc.translate('MOCK_RESPONSES.EMAIL_SEPARATOR');
  const statusUnauthorized = translationSvc.translate('MOCK_RESPONSES.STATUS_UNAUTHORIZED');
  const statusBadRequest = translationSvc.translate('MOCK_RESPONSES.STATUS_BAD_REQUEST');
  const statusNotFound = translationSvc.translate('MOCK_RESPONSES.STATUS_NOT_FOUND');
  const errorInvalidCredentials = translationSvc.translate('MOCK_RESPONSES.ERROR_INVALID_CREDENTIALS');
  const errorEmailExists = translationSvc.translate('MOCK_RESPONSES.ERROR_EMAIL_EXISTS');
  const errorIncorrectOtp = translationSvc.translate('MOCK_RESPONSES.ERROR_INCORRECT_OTP');
  const errorEmailNotFound = translationSvc.translate('MOCK_RESPONSES.ERROR_EMAIL_NOT_FOUND');
  const errorOtpVerificationFailed = translationSvc.translate('MOCK_RESPONSES.ERROR_OTP_VERIFICATION_FAILED');

  if (url.includes(loginPath)) {
    const body = req.body as { email?: string; code?: string } | null;
    
    // Test Trigger: error@mirror.com will simulate an invalid credentials error
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

    // Test Trigger: error@mirror.com will simulate an email already taken error
    if (body && body.email === triggerErrorEmail) {
      return throwError(() => new HttpErrorResponse({
        status: 400,
        statusText: statusBadRequest,
        error: errorEmailExists
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

    // Test Trigger: error@mirror.com will simulate a "user not found" error
    if (body && body.email === triggerErrorEmail) {
      return throwError(() => new HttpErrorResponse({
        status: 404,
        statusText: statusNotFound,
        error: errorEmailNotFound
      })).pipe(delay(800));
    }

    const message = translationSvc.translate('MOCK_RESPONSES.OTP_REQUEST_SUCCESS');
    return of(new HttpResponse({ status: 200, body: message })).pipe(delay(500));
  }

  if (url.includes(forgotPasswordVerifyPath)) {
    const body = req.body as { email?: string; code?: string } | null;

    // Test Trigger: Entering '000000' will simulate a failed OTP verification error
    if (body && body.code === triggerErrorOtp) {
      return throwError(() => new HttpErrorResponse({
        status: 400,
        statusText: statusBadRequest,
        error: errorOtpVerificationFailed
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
      username: defaultUsername,
      email: defaultEmail
    };
    return of(new HttpResponse({ status: 200, body: mockResponse })).pipe(delay(500));
  }

  if (url.includes(logoutPath)) {
    const message = translationSvc.translate('MOCK_RESPONSES.LOGOUT_SUCCESS');
    return of(new HttpResponse({ status: 200, body: message })).pipe(delay(300));
  }

  return next(req);
};
